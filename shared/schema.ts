import { pgTable, text, serial, integer, boolean, timestamp, numeric, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  VIEW_VEHICLES: 'view_vehicles',
  VIEW_BOOKINGS: 'view_bookings',
  VIEW_MAINTENANCE: 'view_maintenance',
  VIEW_FUEL: 'view_fuel',
  MANAGE_USERS: 'manage_users',
} as const;

export const AVAILABLE_PERMISSIONS = [
  { id: 'view_dashboard', label: 'Dashboard' },
  { id: 'view_vehicles', label: 'Vehicles' },
  { id: 'view_bookings', label: 'Bookings' },
  { id: 'view_maintenance', label: 'Maintenance' },
  { id: 'view_fuel', label: 'Fuel Logs' },
  { id: 'manage_users', label: 'User Management' },
] as const;

export const roleEnum = pgEnum("role", ["admin", "staff", "customer"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", ["available", "in_use", "maintenance", "unavailable"]);
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "approved", "rejected", "in_progress", "completed", "cancelled"]);
export const driveTypeEnum = pgEnum("drive_type", ["self", "driver"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("customer").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email"),
  licenseNumber: text("license_number"),
  department: text("department"),
  permissions: text("permissions").default('["view_dashboard","view_vehicles","view_bookings"]').notNull(),
  isApprover: boolean("is_approver").default(false).notNull(),
  isDriver: boolean("is_driver").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicleCategoryEnum = pgEnum("vehicle_category", ["car", "van", "bus", "truck"]);

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
  category: vehicleCategoryEnum("category").default("car").notNull(),
  capacity: integer("capacity").default(5).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  approverId: integer("approver_id").references(() => users.id),
  driverId: integer("driver_id").references(() => users.id),
  driveType: driveTypeEnum("drive_type").default("self").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: bookingStatusEnum("status").default("pending").notNull(),
  purpose: text("purpose").notNull(),
  destination: text("destination"),
  mileage: integer("mileage").notNull(),
  startOdometer: integer("start_odometer"),
  endOdometer: integer("end_odometer"),
  cancellationReason: text("cancellation_reason"),
  passengerCount: integer("passenger_count").default(1).notNull(),
  passengerName: text("passenger_name"),
  passengerPhone: text("passenger_phone"),
  shareAllowed: boolean("share_allowed").default(false).notNull(),
  sharedTripId: integer("shared_trip_id"),
  allocatedVehicleId: integer("allocated_vehicle_id").references(() => vehicles.id),
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

export const emailSettings = pgTable("email_settings", {
  id: serial("id").primaryKey(),
  smtpHost: text("smtp_host").notNull(),
  smtpPort: integer("smtp_port").default(465).notNull(),
  smtpUser: text("smtp_user").notNull(),
  smtpPass: text("smtp_pass").notNull(),
  smtpSecure: boolean("smtp_secure").default(true).notNull(),
  fromName: text("from_name").default("FleetCmd").notNull(),
  fromEmail: text("from_email").notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sharedTripStatusEnum = pgEnum("shared_trip_status", ["open", "full", "in_progress", "completed", "cancelled"]);

export const sharedTrips = pgTable("shared_trips", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  approverId: integer("approver_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  destination: text("destination"),
  status: sharedTripStatusEnum("status").default("open").notNull(),
  totalCapacity: integer("total_capacity").notNull(),
  reservedSeats: integer("reserved_seats").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vehicleInspections = pgTable("vehicle_inspections", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").references(() => vehicles.id).notNull(),
  operatorId: integer("operator_id").references(() => users.id).notNull(),
  inspectionDate: date("inspection_date").notNull(),
  startTime: text("start_time"),
  endTime: text("end_time"),
  kmCounter: integer("km_counter").notNull(),
  // Checklist items
  inspectDamage: boolean("inspect_damage").default(false).notNull(),
  inspectDamageComment: text("inspect_damage_comment"),
  checkCabinSeat: boolean("check_cabin_seat").default(false).notNull(),
  checkCabinSeatComment: text("check_cabin_seat_comment"),
  cleanRadiator: boolean("clean_radiator").default(false).notNull(),
  cleanRadiatorComment: text("clean_radiator_comment"),
  checkEngineOil: boolean("check_engine_oil").default(false).notNull(),
  checkEngineOilComment: text("check_engine_oil_comment"),
  checkCoolantLevel: boolean("check_coolant_level").default(false).notNull(),
  checkCoolantLevelComment: text("check_coolant_level_comment"),
  checkDriveBelt: boolean("check_drive_belt").default(false).notNull(),
  checkDriveBeltComment: text("check_drive_belt_comment"),
  airFilterCleaning: boolean("air_filter_cleaning").default(false).notNull(),
  airFilterCleaningComment: text("air_filter_cleaning_comment"),
  checkIntakeExhaust: boolean("check_intake_exhaust").default(false).notNull(),
  checkIntakeExhaustComment: text("check_intake_exhaust_comment"),
  checkTyresWheelNuts: boolean("check_tyres_wheel_nuts").default(false).notNull(),
  checkTyresWheelNutsComment: text("check_tyres_wheel_nuts_comment"),
  checkHydraulicOil: boolean("check_hydraulic_oil").default(false).notNull(),
  checkHydraulicOilComment: text("check_hydraulic_oil_comment"),
  checkControls: boolean("check_controls").default(false).notNull(),
  checkControlsComment: text("check_controls_comment"),
  checkLeaksDamages: boolean("check_leaks_damages").default(false).notNull(),
  checkLeaksDamagesComment: text("check_leaks_damages_comment"),
  checkHeadlights: boolean("check_headlights").default(false).notNull(),
  checkHeadlightsComment: text("check_headlights_comment"),
  checkHorn: boolean("check_horn").default(false).notNull(),
  checkHornComment: text("check_horn_comment"),
  checkMirrors: boolean("check_mirrors").default(false).notNull(),
  checkMirrorsComment: text("check_mirrors_comment"),
  checkIndicators: boolean("check_indicators").default(false).notNull(),
  checkIndicatorsComment: text("check_indicators_comment"),
  greaseHydraulicPins: boolean("grease_hydraulic_pins").default(false).notNull(),
  greaseHydraulicPinsComment: text("grease_hydraulic_pins_comment"),
  checkMeters: boolean("check_meters").default(false).notNull(),
  checkMetersComment: text("check_meters_comment"),
  remarks: text("remarks"),
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
  approver: one(users, { fields: [bookings.approverId], references: [users.id] }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  vehicle: one(vehicles, { fields: [maintenanceRecords.vehicleId], references: [vehicles.id] }),
}));

export const fuelRecordsRelations = relations(fuelRecords, ({ one }) => ({
  vehicle: one(vehicles, { fields: [fuelRecords.vehicleId], references: [vehicles.id] }),
}));

export const vehicleInspectionsRelations = relations(vehicleInspections, ({ one }) => ({
  vehicle: one(vehicles, { fields: [vehicleInspections.vehicleId], references: [vehicles.id] }),
  operator: one(users, { fields: [vehicleInspections.operatorId], references: [users.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users)
  .omit({ id: true, createdAt: true })
  .extend({
    permissions: z.array(z.string()).optional().default([])
  });
export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings)
  .omit({ id: true, createdAt: true })
  .extend({
    vehicleId: z.coerce.number(),
    userId: z.coerce.number(),
    approverId: z.coerce.number().optional(),
    driverId: z.coerce.number().optional().nullable(),
    driveType: z.enum(["self", "driver"]).default("self"),
    mileage: z.coerce.number(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    passengerCount: z.coerce.number().default(1),
    shareAllowed: z.boolean().default(false),
    sharedTripId: z.coerce.number().optional().nullable(),
    allocatedVehicleId: z.coerce.number().optional().nullable(),
  });
export const insertMaintenanceSchema = createInsertSchema(maintenanceRecords).omit({ id: true, createdAt: true });
export const insertFuelSchema = createInsertSchema(fuelRecords).omit({ id: true, createdAt: true });
export const insertEmailSettingsSchema = createInsertSchema(emailSettings).omit({ id: true, updatedAt: true });
export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true, createdAt: true });
export const insertSharedTripSchema = createInsertSchema(sharedTrips)
  .omit({ id: true, createdAt: true })
  .extend({
    vehicleId: z.coerce.number(),
    approverId: z.coerce.number(),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    totalCapacity: z.coerce.number(),
    reservedSeats: z.coerce.number().default(0),
  });
export const insertVehicleInspectionSchema = createInsertSchema(vehicleInspections)
  .omit({ id: true, createdAt: true })
  .extend({
    vehicleId: z.coerce.number(),
    operatorId: z.coerce.number(),
    kmCounter: z.coerce.number(),
  });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserPermissions = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenance = z.infer<typeof insertMaintenanceSchema>;
export type FuelRecord = typeof fuelRecords.$inferSelect;
export type InsertFuel = z.infer<typeof insertFuelSchema>;
export type EmailSettings = typeof emailSettings.$inferSelect;
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type Department = typeof departments.$inferSelect;
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type SharedTrip = typeof sharedTrips.$inferSelect;
export type InsertSharedTrip = z.infer<typeof insertSharedTripSchema>;
export type VehicleInspection = typeof vehicleInspections.$inferSelect;
export type InsertVehicleInspection = z.infer<typeof insertVehicleInspectionSchema>;
