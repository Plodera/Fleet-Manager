import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("role", ["admin", "staff", "customer"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["available", "rented", "maintenance"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "approved", "rejected", "completed", "cancelled"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("customer").notNull(),
  fullName: text("full_name").notNull(),
  licenseNumber: text("license_number"),
  department: text("department"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  licensePlate: text("license_plate").notNull().unique(),
  vin: text("vin").notNull().unique(),
  status: vehicleStatusEnum("status").default("available").notNull(),
  currentMileage: integer("current_mileage").default(0).notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  purpose: text("purpose").notNull(),
  destination: text("destination"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceRecords = pgTable("maintenance_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  serviceDate: date("service_date").notNull(),
  type: text("type").notNull(), // oil change, tire rotation, etc.
  description: text("description").notNull(),
  cost: numeric("cost").notNull(),
  mileage: integer("mileage").notNull(),
  performedBy: text("performed_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fuelRecords = pgTable("fuel_records", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  date: date("date").notNull(),
  gallons: numeric("gallons").notNull(),
  pricePerGallon: numeric("price_per_gallon").notNull(),
  totalCost: numeric("total_cost").notNull(),
  mileage: integer("mileage").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
}));

export const vehiclesRelations = relations(vehicles, ({ many }) => ({
  bookings: many(bookings),
  maintenanceRecords: many(maintenanceRecords),
  fuelRecords: many(fuelRecords),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  vehicle: one(vehicles, { fields: [bookings.vehicleId], references: [vehicles.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  vehicle: one(vehicles, { fields: [maintenanceRecords.vehicleId], references: [vehicles.id] }),
}));

export const fuelRecordsRelations = relations(fuelRecords, ({ one }) => ({
  vehicle: one(vehicles, { fields: [fuelRecords.vehicleId], references: [vehicles.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export const insertMaintenanceSchema = createInsertSchema(maintenanceRecords).omit({ id: true, createdAt: true });
export const insertFuelSchema = createInsertSchema(fuelRecords).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type FuelRecord = typeof fuelRecords.$inferSelect;
export type InsertFuel = z.infer<typeof insertFuelSchema>;
