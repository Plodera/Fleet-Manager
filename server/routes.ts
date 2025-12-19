import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { api } from "@shared/routes";
import { z } from "zod";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
