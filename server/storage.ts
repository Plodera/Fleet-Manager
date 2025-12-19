import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords, emailSettings, departments,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel, type EmailSettings, type InsertEmailSettings,
  type Department, type InsertDepartment
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

  getBookings(): Promise<(Booking & { vehicle: Vehicle; user: User; approver?: User })[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking>;

  getMaintenanceRecords(): Promise<(MaintenanceRecord & { vehicle: Vehicle })[]>;
  createMaintenanceRecord(record: InsertMaintenance): Promise<MaintenanceRecord>;

  getFuelRecords(): Promise<(FuelRecord & { vehicle: Vehicle })[]>;
  createFuelRecord(record: InsertFuel): Promise<FuelRecord>;
  
  getUsers(): Promise<User[]>;
  getApprovers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User>;
  updateUserPermissions(id: number, permissions: string[]): Promise<User>;
  updateUserApprover(id: number, isApprover: boolean): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;

  getEmailSettings(): Promise<EmailSettings | undefined>;
  upsertEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;

  getDepartments(): Promise<Department[]>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

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
    const userToInsert = {
      ...insertUser,
      permissions: insertUser.permissions ? JSON.stringify(insertUser.permissions) : JSON.stringify(["view_dashboard", "view_vehicles", "view_bookings"])
    };
    const [user] = await db.insert(users).values(userToInsert as any).returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [user] = await db.update(users).set({ role: role as any }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    const [user] = await db.update(users).set({ permissions: JSON.stringify(permissions) }).where(eq(users.id, id)).returning();
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

  async getBookings(): Promise<(Booking & { vehicle: Vehicle; user: User; approver?: User })[]> {
    return await db.query.bookings.findMany({
      with: {
        vehicle: true,
        user: true,
        approver: true,
      },
    });
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
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

  async getApprovers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isApprover, true));
  }

  async updateUserApprover(id: number, isApprover: boolean): Promise<User> {
    const [user] = await db.update(users).set({ isApprover }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const [user] = await db.update(users).set({ email }).where(eq(users.id, id)).returning();
    return user;
  }

  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await db.select().from(emailSettings).limit(1);
    return settings;
  }

  async upsertEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    if (existing) {
      const [updated] = await db.update(emailSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(emailSettings).values(settings).returning();
      return created;
    }
  }

  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments);
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [department] = await db.insert(departments).values(dept).returning();
    return department;
  }

  async deleteDepartment(id: number): Promise<void> {
    await db.delete(departments).where(eq(departments.id, id));
  }
}

export const storage = new DatabaseStorage();
