import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { sendBookingNotification, sendBookingStatusUpdate } from "./email";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupAuth(app);

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
    if (user.role !== 'admin') return res.status(403).send("Admin access required");
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
    const bookings = await storage.getBookings();
    res.json(bookings);
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
      
      // Only the assigned approver or admin can change status
      if (existingBooking.approverId !== currentUser.id && currentUser.role !== 'admin') {
        return res.status(401).json({ message: "Only the assigned approver can change booking status" });
      }
      
      const updateData: { status: string; cancellationReason?: string | null } = { status: input.status };
      if (input.status === 'cancelled' && input.cancellationReason) {
        updateData.cancellationReason = input.cancellationReason;
      } else if (input.status !== 'cancelled') {
        updateData.cancellationReason = null;
      }
      const booking = await storage.updateBooking(bookingId, updateData);
      
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

  // Maintenance
  app.get(api.maintenance.list.path, async (req, res) => {
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
      status: "rented",
      currentMileage: 25000,
      imageUrl: "https://images.unsplash.com/photo-1550565118-3a1400d7834a?w=800&auto=format&fit=crop&q=60"
    });
    console.log("Seeded vehicles");
  }

  return httpServer;
}
