import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel
} from "@shared/schema";
import { db, pool } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  getBookings(): Promise<(Booking & { vehicle: Vehicle; user: User })[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;

  getMaintenanceRecords(): Promise<(MaintenanceRecord & { vehicle: Vehicle })[]>;
  createMaintenanceRecord(record: InsertMaintenance): Promise<MaintenanceRecord>;

  getFuelRecords(): Promise<(FuelRecord & { vehicle: Vehicle })[]>;
  createFuelRecord(record: InsertFuel): Promise<FuelRecord>;
  
  getUsers(): Promise<User[]>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db.update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  async getBookings(): Promise<(Booking & { vehicle: Vehicle; user: User })[]> {
    return await db.query.bookings.findMany({
      with: {
        vehicle: true,
        user: true,
      },
    });
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(insertBooking).returning();
    return booking;
  }

  async updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async getMaintenanceRecords(): Promise<(MaintenanceRecord & { vehicle: Vehicle })[]> {
    return await db.query.maintenanceRecords.findMany({
      with: {
        vehicle: true,
      },
    });
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenance): Promise<MaintenanceRecord> {
    const [record] = await db.insert(maintenanceRecords).values(insertRecord).returning();
    return record;
  }

  async getFuelRecords(): Promise<(FuelRecord & { vehicle: Vehicle })[]> {
    return await db.query.fuelRecords.findMany({
      with: {
        vehicle: true,
      },
    });
  }

  async createFuelRecord(insertRecord: InsertFuel): Promise<FuelRecord> {
    const [record] = await db.insert(fuelRecords).values(insertRecord).returning();
    return record;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
}

export const storage = new DatabaseStorage();
