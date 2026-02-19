import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, validateSession } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { sendBookingNotification, sendBookingStatusUpdate, sendTripStatusToApprover } from "./email";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper to check if user has a specific permission
function hasPermission(user: User, permission: string): boolean {
  if (user.role === 'admin') return true;
  try {
    const permissions = typeof user.permissions === 'string' 
      ? JSON.parse(user.permissions) 
      : user.permissions;
    return Array.isArray(permissions) && permissions.includes(permission);
  } catch {
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);
  
  // Validate session for single-session enforcement
  app.use(validateSession);

  // Vehicles
  app.get(api.vehicles.list.path, async (req, res) => {
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.get(api.vehicles.get.path, async (req, res) => {
    const vehicle = await storage.getVehicle(Number(req.params.id));
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  });

  app.post(api.vehicles.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.vehicles.create.input.parse(req.body);
      const vehicle = await storage.createVehicle(input);
      res.status(201).json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.vehicles.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    
    // Approvers can only update vehicle status (available/unavailable)
    const isApproverStatusChange = user.isApprover && 
      Object.keys(req.body).length === 1 && 
      req.body.status && 
      ['available', 'unavailable'].includes(req.body.status);
    
    if (user.role !== 'admin' && !isApproverStatusChange) {
      return res.status(403).send("Admin access required");
    }
    
    try {
      const input = api.vehicles.update.input.parse(req.body);
      const vehicle = await storage.updateVehicle(Number(req.params.id), input);
      res.json(vehicle);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(404).json({ message: "Vehicle not found" });
    }
  });

  app.delete(api.vehicles.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteVehicle(Number(req.params.id));
    res.sendStatus(204);
  });

  // Bookings
  app.get(api.bookings.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    
    const allBookings = await storage.getBookings();
    
    // Admins see all bookings
    if (currentUser.role === 'admin') {
      return res.json(allBookings);
    }
    
    // Get shared trips to check if user is a passenger
    const sharedTrips = await storage.getSharedTrips();
    const userSharedTripIds = new Set<number>();
    for (const trip of sharedTrips) {
      const isPassenger = trip.passengers.some(p => p.user.id === currentUser.id);
      if (isPassenger) {
        userSharedTripIds.add(trip.id);
      }
    }
    
    // Filter bookings to show:
    // 1. User's own bookings (userId)
    // 2. Bookings where user is assigned driver (driverId)
    // 3. Bookings where user is the approver (approverId) - they need to approve/reject
    // 4. Bookings that are part of a shared trip the user has joined
    const filteredBookings = allBookings.filter(booking => {
      // User's own booking
      if (booking.userId === currentUser.id) return true;
      // User is assigned driver
      if ((booking as any).driverId === currentUser.id) return true;
      // User is the designated approver
      if ((booking as any).approverId === currentUser.id) return true;
      // Booking is part of a shared trip user has joined
      if ((booking as any).sharedTripId && userSharedTripIds.has((booking as any).sharedTripId)) return true;
      return false;
    });
    
    res.json(filteredBookings);
  });

  app.post(api.bookings.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.bookings.create.input.parse(req.body);
      const booking = await storage.createBooking(input);
      
      // Send email notification to approver if one is assigned
      if (input.approverId) {
        const approver = await storage.getUser(input.approverId);
        const vehicle = await storage.getVehicle(input.vehicleId);
        const requester = await storage.getUser(input.userId);
        if (approver && vehicle && requester) {
          await sendBookingNotification(approver, booking, vehicle, requester);
        }
      }
      
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.bookings.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.bookings.update.input.parse(req.body);
      const booking = await storage.updateBooking(Number(req.params.id), input);
      res.json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Booking status update (approve/reject/pending) - only approvers can do this
  app.put(api.bookings.updateStatus.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    
    try {
      const bookingId = Number(req.params.id);
      const input = api.bookings.updateStatus.input.parse(req.body);
      
      // Get the booking to check if the current user is the assigned approver
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Check authorization based on action type
      const isAdmin = currentUser.role === 'admin';
      const isApprover = existingBooking.approverId === currentUser.id || currentUser.isApprover;
      const isDriver = (existingBooking as any).driverId === currentUser.id;
      
      // For starting a trip (in_progress), allow driver, approver, or admin
      if (input.status === 'in_progress') {
        if (!isAdmin && !isApprover && !isDriver) {
          return res.status(403).json({ message: "Only the driver, approver, or admin can start a trip" });
        }
        // Can only start from approved status
        if (existingBooking.status !== 'approved') {
          return res.status(400).json({ message: "Can only start a trip that has been approved" });
        }
      } else if (input.status === 'completed') {
        // For completing a trip, allow driver, approver, or admin
        if (!isAdmin && !isApprover && !isDriver) {
          return res.status(403).json({ message: "Only the driver, approver, or admin can complete a trip" });
        }
        // Can only complete from in_progress or approved status (backward compatibility)
        if (existingBooking.status !== 'in_progress' && existingBooking.status !== 'approved') {
          return res.status(400).json({ message: "Can only complete a trip that is in progress or approved" });
        }
      } else {
        // For other status changes, only approver or admin
        if (!isAdmin && !isApprover) {
          return res.status(403).json({ message: "Only the assigned approver or admin can change booking status" });
        }
      }
      
      const updateData: { status: 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'; cancellationReason?: string | null; driverId?: number | null } = { status: input.status };
      if (input.status === 'cancelled' && input.cancellationReason) {
        updateData.cancellationReason = input.cancellationReason;
      } else if (input.status !== 'cancelled') {
        updateData.cancellationReason = null;
      }
      if (input.status === 'approved' && input.driverId !== undefined) {
        updateData.driverId = input.driverId;
      }
      const booking = await storage.updateBooking(bookingId, updateData);
      
      // If approved, update vehicle status to in_use
      if (input.status === 'approved') {
        await storage.updateVehicle(existingBooking.vehicleId, { status: 'in_use' });
      }
      
      // Send email notification to requester about status change
      const requester = await storage.getUser(existingBooking.userId);
      const vehicle = await storage.getVehicle(existingBooking.vehicleId);
      if (requester && vehicle) {
        await sendBookingStatusUpdate(requester, booking, vehicle, input.status, currentUser);
      }
      
      res.json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Start trip - driver enters start odometer and begins trip
  app.patch("/api/bookings/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    
    try {
      const bookingId = Number(req.params.id);
      const { startOdometer } = req.body;
      
      if (typeof startOdometer !== 'number' || startOdometer < 0) {
        return res.status(400).json({ message: "Valid start odometer reading is required" });
      }
      
      const existingBooking = await storage.getBooking(bookingId);
      
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the assigned driver, approver, or admin can start the trip
      const isDriver = existingBooking.driverId === currentUser.id;
      const isApprover = existingBooking.approverId === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      
      if (!isDriver && !isApprover && !isAdmin) {
        return res.status(403).json({ message: "Only the assigned driver or approver can start this trip" });
      }
      
      if (existingBooking.status !== 'approved') {
        return res.status(400).json({ message: "Only approved bookings can be started" });
      }
      
      // Update booking with start odometer and change status to in_progress
      const booking = await storage.updateBooking(bookingId, { 
        status: 'in_progress',
        startOdometer: startOdometer
      });
      
      // Send email notification to approver about trip start
      if (existingBooking.approverId) {
        const approver = await storage.getUser(existingBooking.approverId);
        const requester = await storage.getUser(existingBooking.userId);
        const vehicle = await storage.getVehicle(existingBooking.vehicleId);
        const driver = existingBooking.driverId ? await storage.getUser(existingBooking.driverId) ?? null : null;
        
        if (approver && requester && vehicle) {
          await sendTripStatusToApprover(approver, booking, vehicle, requester, driver, 'started', startOdometer);
        }
      }
      
      res.json(booking);
    } catch (err) {
      throw err;
    }
  });

  // End trip - driver enters end odometer and completes trip
  app.patch("/api/bookings/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    
    try {
      const bookingId = Number(req.params.id);
      const { endOdometer } = req.body;
      
      if (typeof endOdometer !== 'number' || endOdometer < 0) {
        return res.status(400).json({ message: "Valid end odometer reading is required" });
      }
      
      const existingBooking = await storage.getBooking(bookingId);
      
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the assigned driver, approver, or admin can end the trip
      const isDriver = existingBooking.driverId === currentUser.id;
      const isApprover = existingBooking.approverId === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      
      if (!isDriver && !isApprover && !isAdmin) {
        return res.status(403).json({ message: "Only the assigned driver or approver can end this trip" });
      }
      
      if (existingBooking.status !== 'in_progress') {
        return res.status(400).json({ message: "Only in-progress trips can be completed" });
      }
      
      // Validate end odometer is greater than start odometer
      if (existingBooking.startOdometer && endOdometer < existingBooking.startOdometer) {
        return res.status(400).json({ message: "End odometer must be greater than start odometer" });
      }
      
      // Update booking with end odometer and change status to completed
      const booking = await storage.updateBooking(bookingId, { 
        status: 'completed',
        endOdometer: endOdometer
      });
      
      // Update vehicle status back to available
      await storage.updateVehicle(existingBooking.vehicleId, { status: 'available' });
      
      // Send email notification to requester about trip completion
      const requester = await storage.getUser(existingBooking.userId);
      const vehicle = await storage.getVehicle(existingBooking.vehicleId);
      if (requester && vehicle) {
        await sendBookingStatusUpdate(requester, booking, vehicle, 'completed', currentUser);
      }
      
      // Send email notification to approver about trip completion
      if (existingBooking.approverId) {
        const approver = await storage.getUser(existingBooking.approverId);
        const driver = existingBooking.driverId ? await storage.getUser(existingBooking.driverId) ?? null : null;
        
        if (approver && requester && vehicle) {
          await sendTripStatusToApprover(approver, booking, vehicle, requester, driver, 'completed', endOdometer);
        }
      }
      
      res.json(booking);
    } catch (err) {
      throw err;
    }
  });

  // End trip - driver or approver can complete the trip
  app.put(api.bookings.endTrip.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    
    try {
      const bookingId = Number(req.params.id);
      const existingBooking = await storage.getBooking(bookingId);
      
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      
      // Only the assigned driver, approver, or admin can end the trip
      const isDriver = existingBooking.driverId === currentUser.id;
      const isApprover = existingBooking.approverId === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      
      if (!isDriver && !isApprover && !isAdmin) {
        return res.status(401).json({ message: "Only the assigned driver or approver can end this trip" });
      }
      
      if (existingBooking.status !== 'approved' && existingBooking.status !== 'in_progress') {
        return res.status(400).json({ message: "Only approved or in-progress bookings can be marked as completed" });
      }
      
      // Update booking status to completed
      const booking = await storage.updateBooking(bookingId, { status: 'completed' });
      
      // Update vehicle status back to available
      await storage.updateVehicle(existingBooking.vehicleId, { status: 'available' });
      
      // Send email notification to requester about trip completion
      const requester = await storage.getUser(existingBooking.userId);
      const vehicle = await storage.getVehicle(existingBooking.vehicleId);
      if (requester && vehicle) {
        await sendBookingStatusUpdate(requester, booking, vehicle, 'completed', currentUser);
      }
      
      res.json(booking);
    } catch (err) {
      throw err;
    }
  });

  // Maintenance
  app.get(api.maintenance.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_maintenance')) {
      return res.status(403).json({ message: "Access denied: missing view_maintenance permission" });
    }
    const records = await storage.getMaintenanceRecords();
    res.json(records);
  });

  app.post(api.maintenance.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.maintenance.create.input.parse(req.body);
      const record = await storage.createMaintenanceRecord(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Fuel
  app.get(api.fuel.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_fuel')) {
      return res.status(403).json({ message: "Access denied: missing view_fuel permission" });
    }
    const records = await storage.getFuelRecords();
    res.json(records);
  });

  app.post(api.fuel.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.fuel.create.input.parse(req.body);
      const record = await storage.createFuelRecord(input);
      res.status(201).json(record);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // Users
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const users = await storage.getUsers();
    res.json(users);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.create.input.parse(req.body);
      const existingUser = await storage.getUserByUsername(input.username);
      if (existingUser) return res.status(400).json({ message: "Username already exists" });
      const newUser = await storage.createUser(input);
      res.status(201).json(newUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.users.updateRole.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.updateRole.input.parse(req.body);
      const updatedUser = await storage.updateUserRole(Number(req.params.id), input.role);
      res.json(updatedUser);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.put(api.users.updatePermissions.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.updatePermissions.input.parse(req.body);
      const updatedUser = await storage.updateUserPermissions(Number(req.params.id), input.permissions);
      res.json(updatedUser);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.put(api.users.updateApprover.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.updateApprover.input.parse(req.body);
      const updatedUser = await storage.updateUserApprover(Number(req.params.id), input.isApprover);
      res.json(updatedUser);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.put(api.users.updateDriver.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.updateDriver.input.parse(req.body);
      const updatedUser = await storage.updateUserDriver(Number(req.params.id), input.isDriver);
      res.json(updatedUser);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // Update user password (admin only)
  app.put(api.users.updatePassword.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const input = api.users.updatePassword.input.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      await storage.updateUserPassword(Number(req.params.id), hashedPassword);
      res.json({ message: "Password updated successfully" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(404).json({ message: "User not found" });
    }
  });

  // Update user email (admin only)
  app.put(api.users.updateEmail.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const input = api.users.updateEmail.input.parse(req.body);
      const updatedUser = await storage.updateUserEmail(Number(req.params.id), input.email);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user profile (username/fullName - admin only)
  app.put(api.users.updateProfile.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.users.updateProfile.input.parse(req.body);
      if (input.username) {
        const existingUser = await storage.getUserByUsername(input.username);
        if (existingUser && existingUser.id !== Number(req.params.id)) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }
      const updatedUser = await storage.updateUserProfile(Number(req.params.id), input);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user (admin only)
  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    const userId = Number(req.params.id);
    if (userId === user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    try {
      await storage.deleteUser(userId);
      res.sendStatus(204);
    } catch (err: any) {
      if (err.code === '23503') {
        return res.status(400).json({ message: "Cannot delete user with existing bookings. Please reassign or delete their bookings first." });
      }
      throw err;
    }
  });

  // Approvers
  app.get(api.approvers.list.path, async (req, res) => {
    const approvers = await storage.getApprovers();
    res.json(approvers);
  });

  // Drivers
  app.get(api.drivers.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const drivers = await storage.getDrivers();
    res.json(drivers);
  });

  // Departments
  app.get(api.departments.list.path, async (req, res) => {
    const depts = await storage.getDepartments();
    res.json(depts);
  });

  app.post(api.departments.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Forbidden");
    try {
      const input = api.departments.create.input.parse(req.body);
      const dept = await storage.createDepartment(input);
      res.status(201).json(dept);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.departments.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Forbidden");
    await storage.deleteDepartment(Number(req.params.id));
    res.sendStatus(204);
  });

  // Email Settings (admin only)
  app.get("/api/settings/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    const settings = await storage.getEmailSettings();
    if (settings) {
      // Mask password for security
      res.json({ ...settings, smtpPass: settings.smtpPass ? "********" : "" });
    } else {
      res.json(null);
    }
  });

  app.put("/api/settings/email", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const existing = await storage.getEmailSettings();
      // If password is masked, keep the existing password
      const smtpPass = req.body.smtpPass === "********" && existing ? existing.smtpPass : req.body.smtpPass;
      const settings = await storage.upsertEmailSettings({ ...req.body, smtpPass });
      res.json({ ...settings, smtpPass: "********" });
    } catch (err) {
      console.error("Email settings error:", err);
      res.status(400).json({ message: "Failed to save email settings" });
    }
  });

  app.post("/api/settings/email/test", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(401).send("Unauthorized");
    try {
      const { sendTestEmail } = await import("./email");
      const result = await sendTestEmail(req.body.email);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, message: err.message });
    }
  });

  // Shared Trips
  app.get(api.sharedTrips.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_bookings')) {
      return res.status(403).json({ message: "Access denied: missing view_bookings permission" });
    }
    const trips = await storage.getSharedTrips();
    res.json(trips);
  });

  app.get("/api/shared-trips/report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_reports') && user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied: missing view_reports permission" });
    }
    
    try {
      const trips = await storage.getSharedTrips();
      const report = trips.map(trip => ({
        id: trip.id,
        destination: trip.destination,
        startTime: trip.startTime,
        endTime: trip.endTime,
        status: trip.status,
        vehicle: `${trip.vehicle.make} ${trip.vehicle.model}`,
        licensePlate: trip.vehicle.licensePlate,
        totalCapacity: trip.totalCapacity,
        reservedSeats: trip.reservedSeats,
        organizer: trip.approver.fullName,
        passengers: trip.passengers.map(p => ({
          name: p.booking.passengerName || p.user.fullName,
          phone: p.booking.passengerPhone || 'N/A',
          seats: p.booking.passengerCount,
          purpose: p.booking.purpose,
        })),
        createdAt: trip.createdAt,
      }));
      res.json(report);
    } catch (err) {
      throw err;
    }
  });

  app.get("/api/shared-trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_bookings')) {
      return res.status(403).json({ message: "Access denied: missing view_bookings permission" });
    }
    const trip = await storage.getSharedTrip(Number(req.params.id));
    if (!trip) return res.status(404).json({ message: "Shared trip not found" });
    res.json(trip);
  });

  app.post(api.sharedTrips.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!user.isApprover && user.role !== 'admin') {
      return res.status(403).send("Only approvers can create shared trips");
    }
    try {
      const input = api.sharedTrips.create.input.parse(req.body);
      
      // Get vehicle to validate and set capacity from server
      const vehicle = await storage.getVehicle(input.vehicleId);
      if (!vehicle) {
        return res.status(400).json({ message: "Vehicle not found" });
      }
      if (vehicle.capacity <= 5) {
        return res.status(400).json({ message: "Vehicle must have more than 5 seats for shared trips" });
      }
      if (vehicle.status !== 'available') {
        return res.status(400).json({ message: "Vehicle is not available" });
      }
      
      // Server-side values override client values for security
      const trip = await storage.createSharedTrip({
        ...input,
        approverId: user.id, // Always use current user as approver
        totalCapacity: vehicle.capacity, // Derive from vehicle
        reservedSeats: 0, // Always start at 0
        status: 'open', // Always start as open
      });
      
      res.status(201).json(trip);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/shared-trips/:id/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const currentUser = req.user as User;
    if (!hasPermission(currentUser, 'view_bookings')) {
      return res.status(403).json({ message: "Access denied: missing view_bookings permission" });
    }
    
    try {
      const tripId = Number(req.params.id);
      const input = api.sharedTrips.join.input.parse(req.body);
      
      const trip = await storage.getSharedTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Shared trip not found" });
      
      if (trip.status !== 'open') {
        return res.status(400).json({ message: "This trip is no longer accepting passengers" });
      }
      
      // Re-calculate available seats from current database state
      const currentReservedSeats = trip.passengers?.reduce((sum, p) => sum + (p.booking.passengerCount || 1), 0) || 0;
      const availableSeats = trip.totalCapacity - currentReservedSeats;
      
      if (input.passengerCount > availableSeats) {
        return res.status(400).json({ message: `Only ${availableSeats} seats available` });
      }
      
      // Check if user already joined this trip
      const alreadyJoined = trip.passengers?.some(p => p.user.id === currentUser.id);
      if (alreadyJoined) {
        return res.status(400).json({ message: "You have already joined this trip" });
      }
      
      // Create a booking linked to this shared trip (pending approval for normal workflow)
      const booking = await storage.createBooking({
        vehicleId: trip.vehicleId,
        userId: currentUser.id,
        approverId: trip.approverId,
        startTime: trip.startTime,
        endTime: trip.endTime,
        destination: trip.destination || "",
        purpose: input.purpose,
        mileage: 0,
        status: 'approved', // Pre-approved as part of shared trip
        driveType: 'driver',
        passengerCount: input.passengerCount,
        passengerName: input.passengerName,
        passengerPhone: input.passengerPhone,
        shareAllowed: true,
        sharedTripId: tripId,
        allocatedVehicleId: trip.vehicleId,
      });
      
      // Update reserved seats based on actual calculation
      const newReservedSeats = currentReservedSeats + input.passengerCount;
      const updateData: any = { reservedSeats: newReservedSeats };
      if (newReservedSeats >= trip.totalCapacity) {
        updateData.status = 'full';
      }
      await storage.updateSharedTrip(tripId, updateData);
      
      res.status(201).json(booking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put("/api/shared-trips/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    
    try {
      const tripId = Number(req.params.id);
      const input = api.sharedTrips.updateStatus.input.parse(req.body);
      
      const trip = await storage.getSharedTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Shared trip not found" });
      
      // Check if user is the driver of any booking in this trip
      const allBookings = await storage.getBookings();
      const tripBookings = allBookings.filter(b => b.sharedTripId === tripId);
      const isDriver = tripBookings.some(b => b.driverId === user.id);
      
      if (user.role !== 'admin' && !user.isApprover && !isDriver) {
        return res.status(403).json({ message: "Only approvers, admins, or the assigned driver can update trip status" });
      }
      
      // Validate state transitions
      if (input.status === 'in_progress') {
        if (trip.status !== 'open' && trip.status !== 'full') {
          return res.status(400).json({ message: "Can only start a trip that is open or full" });
        }
      } else if (input.status === 'completed') {
        if (trip.status !== 'in_progress' && trip.status !== 'open' && trip.status !== 'full') {
          return res.status(400).json({ message: "Can only complete a trip that is in progress" });
        }
      }
      
      const updated = await storage.updateSharedTrip(tripId, { status: input.status });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete("/api/shared-trips/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    
    try {
      const tripId = Number(req.params.id);
      const trip = await storage.getSharedTrip(tripId);
      if (!trip) return res.status(404).json({ message: "Shared trip not found" });
      
      // Drivers cannot delete trips, even if they are also approvers
      if (user.role !== 'admin' && !user.isApprover) {
        return res.status(403).json({ message: "Only approvers or admins can delete trips" });
      }
      if (user.isDriver) {
        return res.status(403).json({ message: "Drivers cannot delete trips" });
      }
      
      await storage.deleteSharedTrip(tripId);
      res.json({ message: "Shared trip deleted successfully" });
    } catch (err) {
      throw err;
    }
  });

  // Vehicle Inspections
  app.get(api.vehicleInspections.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_maintenance')) {
      return res.status(403).json({ message: "Access denied: missing view_maintenance permission" });
    }
    const inspections = await storage.getVehicleInspections();
    res.json(inspections);
  });

  app.get(api.vehicleInspections.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_maintenance')) {
      return res.status(403).json({ message: "Access denied: missing view_maintenance permission" });
    }
    const inspection = await storage.getVehicleInspection(Number(req.params.id));
    if (!inspection) return res.status(404).json({ message: "Inspection not found" });
    res.json(inspection);
  });

  app.post(api.vehicleInspections.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (!hasPermission(user, 'view_maintenance')) {
      return res.status(403).json({ message: "Access denied: missing view_maintenance permission" });
    }
    try {
      const input = api.vehicleInspections.create.input.parse(req.body);
      const inspection = await storage.createVehicleInspection(input);
      res.status(201).json(inspection);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid data" });
    }
  });

  app.delete(api.vehicleInspections.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can delete inspections" });
    }
    const inspection = await storage.getVehicleInspection(Number(req.params.id));
    if (!inspection) return res.status(404).json({ message: "Inspection not found" });
    await storage.deleteVehicleInspection(Number(req.params.id));
    res.status(204).send();
  });

  // Equipment Types
  app.get(api.equipmentTypes.list.path, async (req, res) => {
    const types = await storage.getEquipmentTypes();
    res.json(types);
  });

  app.get(api.equipmentTypes.get.path, async (req, res) => {
    const type = await storage.getEquipmentType(Number(req.params.id));
    if (!type) return res.status(404).json({ message: "Equipment type not found" });
    res.json(type);
  });

  app.post(api.equipmentTypes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.equipmentTypes.create.input.parse(req.body);
      const type = await storage.createEquipmentType(input);
      res.status(201).json(type);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.equipmentTypes.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    const existing = await storage.getEquipmentType(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Equipment type not found" });
    try {
      const input = api.equipmentTypes.update.input.parse(req.body);
      const updated = await storage.updateEquipmentType(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.equipmentTypes.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    const existing = await storage.getEquipmentType(Number(req.params.id));
    if (!existing) return res.status(404).json({ message: "Equipment type not found" });
    await storage.deleteEquipmentType(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.equipmentTypes.listItems.path, async (req, res) => {
    const items = await storage.getEquipmentChecklistItems(Number(req.params.id));
    res.json(items);
  });

  // Equipment Checklist Items
  app.post(api.equipmentChecklistItems.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.equipmentChecklistItems.create.input.parse(req.body);
      const item = await storage.createEquipmentChecklistItem(input);
      res.status(201).json(item);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.patch(api.equipmentChecklistItems.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.equipmentChecklistItems.update.input.parse(req.body);
      const updated = await storage.updateEquipmentChecklistItem(Number(req.params.id), input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.delete(api.equipmentChecklistItems.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteEquipmentChecklistItem(Number(req.params.id));
    res.status(204).send();
  });

  // Shifts
  app.get(api.shifts.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    res.json(await storage.getShifts());
  });

  app.post(api.shifts.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.shifts.create.input.parse(req.body);
      const shift = await storage.createShift(input);
      res.status(201).json(shift);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch(api.shifts.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.shifts.update.input.parse(req.body);
      const shift = await storage.updateShift(Number(req.params.id), input);
      res.json(shift);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.shifts.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteShift(Number(req.params.id));
    res.status(204).send();
  });

  // Activity Types
  app.get(api.activityTypes.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    res.json(await storage.getActivityTypes());
  });

  app.post(api.activityTypes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.activityTypes.create.input.parse(req.body);
      const type = await storage.createActivityType(input);
      res.status(201).json(type);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch(api.activityTypes.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.activityTypes.update.input.parse(req.body);
      const type = await storage.updateActivityType(Number(req.params.id), input);
      res.json(type);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.activityTypes.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteActivityType(Number(req.params.id));
    res.status(204).send();
  });

  // Maintenance Type Config
  app.get(api.maintenanceTypeConfigs.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    res.json(await storage.getMaintenanceTypeConfigs());
  });

  app.post(api.maintenanceTypeConfigs.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.maintenanceTypeConfigs.create.input.parse(req.body);
      const item = await storage.createMaintenanceTypeConfig(input);
      res.status(201).json(item);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch(api.maintenanceTypeConfigs.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.maintenanceTypeConfigs.update.input.parse(req.body);
      const item = await storage.updateMaintenanceTypeConfig(Number(req.params.id), input);
      res.json(item);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.maintenanceTypeConfigs.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteMaintenanceTypeConfig(Number(req.params.id));
    res.status(204).send();
  });

  // Sub-Equipment
  app.get(api.subEquipment.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    res.json(await storage.getSubEquipment());
  });

  app.post(api.subEquipment.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.subEquipment.create.input.parse(req.body);
      const item = await storage.createSubEquipment(input);
      res.status(201).json(item);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.patch(api.subEquipment.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    try {
      const input = api.subEquipment.update.input.parse(req.body);
      const item = await storage.updateSubEquipment(Number(req.params.id), input);
      res.json(item);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.subEquipment.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
    await storage.deleteSubEquipment(Number(req.params.id));
    res.status(204).send();
  });

  // Work Orders
  app.get(api.workOrders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    res.json(await storage.getWorkOrders());
  });

  app.get(api.workOrders.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const order = await storage.getWorkOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Work order not found" });
    res.json(order);
  });

  app.post(api.workOrders.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.workOrders.create.input.parse(req.body);
      const currentUser = req.user as User;
      const order = await storage.createWorkOrder({
        vehicleId: input.vehicleId,
        maintenanceType: input.maintenanceType,
        shiftId: input.shiftId ?? null,
        date: input.date,
        status: input.status ?? "open",
        createdById: currentUser.id,
      });

      if (input.items && input.items.length > 0) {
        for (const item of input.items) {
          await storage.createWorkOrderItem({
            workOrderId: order.id,
            subEquipmentId: item.subEquipmentId ?? null,
            activityTypeId: item.activityTypeId ?? null,
            startTime: item.startTime,
            endTime: item.endTime,
            descriptions: item.descriptions,
          });
        }
      }

      const enriched = await storage.getWorkOrder(order.id);
      res.status(201).json(enriched);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.put(api.workOrders.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    try {
      const input = api.workOrders.update.input.parse(req.body);
      const id = Number(req.params.id);
      const existing = await storage.getWorkOrder(id);
      if (!existing) return res.status(404).json({ message: "Work order not found" });

      const { items, ...orderUpdates } = input;
      if (Object.keys(orderUpdates).length > 0) {
        await storage.updateWorkOrder(id, orderUpdates as any);
      }

      if (items) {
        await storage.deleteWorkOrderItems(id);
        for (const item of items) {
          await storage.createWorkOrderItem({
            workOrderId: id,
            subEquipmentId: item.subEquipmentId ?? null,
            activityTypeId: item.activityTypeId ?? null,
            startTime: item.startTime,
            endTime: item.endTime,
            descriptions: item.descriptions,
          });
        }
      }

      const enriched = await storage.getWorkOrder(id);
      res.json(enriched);
    } catch (e: any) { res.status(400).json({ message: e.message }); }
  });

  app.delete(api.workOrders.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");
    const user = req.user as User;
    const order = await storage.getWorkOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Work order not found" });
    if (user.role !== 'admin' && order.createdById !== user.id) {
      return res.status(403).send("You can only delete your own work orders");
    }
    await storage.deleteWorkOrder(Number(req.params.id));
    res.status(204).send();
  });

  // Seed Data
  const existingUsers = await storage.getUsers();
  if (existingUsers.length === 0) {
    const hashedPassword = await hashPassword("admin123");
    await storage.createUser({
      username: "admin",
      password: hashedPassword,
      fullName: "Admin User",
      role: "admin",
      department: "Management",
      permissions: ["view_dashboard", "view_vehicles", "view_bookings", "view_maintenance", "view_fuel", "manage_users"]
    });
    console.log("Seeded admin user");

    await storage.createVehicle({
      make: "Toyota",
      model: "Camry",
      year: 2023,
      licensePlate: "ABC-1234",
      vin: "1234567890ABCDEFG",
      status: "available",
      currentMileage: 15000,
      imageUrl: "https://images.unsplash.com/photo-1621007947382-bb3c39d8e3f9?w=800&auto=format&fit=crop&q=60"
    });
    
    await storage.createVehicle({
      make: "Ford",
      model: "F-150",
      year: 2022,
      licensePlate: "XYZ-9876",
      vin: "0987654321GFEDCBA",
      status: "in_use",
      currentMileage: 25000,
      imageUrl: "https://images.unsplash.com/photo-1550565118-3a1400d7834a?w=800&auto=format&fit=crop&q=60"
    });
    console.log("Seeded vehicles");
  }

  return httpServer;
}
