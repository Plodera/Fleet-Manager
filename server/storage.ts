import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords, emailSettings, departments,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel, type EmailSettings, type InsertEmailSettings,
  type Department, type InsertDepartment
} from "@shared/schema";
import { getDb, getPool } from "./db";
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
  updateUserProfile(id: number, data: { username?: string; fullName?: string }): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

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
      pool: getPool(),
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await getDb().select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userToInsert = {
      ...insertUser,
      permissions: insertUser.permissions ? JSON.stringify(insertUser.permissions) : JSON.stringify(["view_dashboard", "view_vehicles", "view_bookings"])
    };
    const [user] = await getDb().insert(users).values(userToInsert as any).returning();
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<User> {
    const [user] = await getDb().update(users).set({ role: role as any }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPermissions(id: number, permissions: string[]): Promise<User> {
    const [user] = await getDb().update(users).set({ permissions: JSON.stringify(permissions) }).where(eq(users.id, id)).returning();
    return user;
  }

  async getVehicles(): Promise<Vehicle[]> {
    return await getDb().select().from(vehicles);
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await getDb().insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await getDb().update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await getDb().delete(vehicles).where(eq(vehicles.id, id));
  }

  async getBookings(): Promise<(Booking & { vehicle: Vehicle; user: User; approver?: User })[]> {
    return await getDb().query.bookings.findMany({
      with: {
        vehicle: true,
        user: true,
        approver: true,
      },
    });
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await getDb().select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const [booking] = await getDb().insert(bookings).values(insertBooking).returning();
    return booking;
  }

  async updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking> {
    const [booking] = await getDb().update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async getMaintenanceRecords(): Promise<(MaintenanceRecord & { vehicle: Vehicle })[]> {
    return await getDb().query.maintenanceRecords.findMany({
      with: {
        vehicle: true,
      },
    });
  }

  async createMaintenanceRecord(insertRecord: InsertMaintenance): Promise<MaintenanceRecord> {
    const [record] = await getDb().insert(maintenanceRecords).values(insertRecord).returning();
    return record;
  }

  async getFuelRecords(): Promise<(FuelRecord & { vehicle: Vehicle })[]> {
    return await getDb().query.fuelRecords.findMany({
      with: {
        vehicle: true,
      },
    });
  }

  async createFuelRecord(insertRecord: InsertFuel): Promise<FuelRecord> {
    const [record] = await getDb().insert(fuelRecords).values(insertRecord).returning();
    return record;
  }

  async getUsers(): Promise<User[]> {
    return await getDb().select().from(users);
  }

  async getApprovers(): Promise<User[]> {
    return await getDb().select().from(users).where(eq(users.isApprover, true));
  }

  async updateUserApprover(id: number, isApprover: boolean): Promise<User> {
    const [user] = await getDb().update(users).set({ isApprover }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: number, password: string): Promise<void> {
    await getDb().update(users).set({ password }).where(eq(users.id, id));
  }

  async updateUserEmail(id: number, email: string): Promise<User | undefined> {
    const [user] = await getDb().update(users).set({ email }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserProfile(id: number, data: { username?: string; fullName?: string }): Promise<User | undefined> {
    const updateData: Partial<{ username: string; fullName: string }> = {};
    if (data.username) updateData.username = data.username;
    if (data.fullName) updateData.fullName = data.fullName;
    if (Object.keys(updateData).length === 0) return this.getUser(id);
    const [user] = await getDb().update(users).set(updateData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await getDb().delete(users).where(eq(users.id, id));
  }

  async getEmailSettings(): Promise<EmailSettings | undefined> {
    const [settings] = await getDb().select().from(emailSettings).limit(1);
    return settings;
  }

  async upsertEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings> {
    const existing = await this.getEmailSettings();
    if (existing) {
      const [updated] = await getDb().update(emailSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(emailSettings.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await getDb().insert(emailSettings).values(settings).returning();
      return created;
    }
  }

  async getDepartments(): Promise<Department[]> {
    return await getDb().select().from(departments);
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const [department] = await getDb().insert(departments).values(dept).returning();
    return department;
  }

  async deleteDepartment(id: number): Promise<void> {
    await getDb().delete(departments).where(eq(departments.id, id));
  }
}

let _storage: DatabaseStorage | null = null;

export function getStorage(): DatabaseStorage {
  if (!_storage) {
    _storage = new DatabaseStorage();
  }
  return _storage;
}

export const storage = {
  get instance() { return getStorage(); },
  getUser: (...args: Parameters<DatabaseStorage['getUser']>) => getStorage().getUser(...args),
  getUserByUsername: (...args: Parameters<DatabaseStorage['getUserByUsername']>) => getStorage().getUserByUsername(...args),
  createUser: (...args: Parameters<DatabaseStorage['createUser']>) => getStorage().createUser(...args),
  getVehicles: () => getStorage().getVehicles(),
  getVehicle: (...args: Parameters<DatabaseStorage['getVehicle']>) => getStorage().getVehicle(...args),
  createVehicle: (...args: Parameters<DatabaseStorage['createVehicle']>) => getStorage().createVehicle(...args),
  updateVehicle: (...args: Parameters<DatabaseStorage['updateVehicle']>) => getStorage().updateVehicle(...args),
  deleteVehicle: (...args: Parameters<DatabaseStorage['deleteVehicle']>) => getStorage().deleteVehicle(...args),
  getBookings: () => getStorage().getBookings(),
  getBooking: (...args: Parameters<DatabaseStorage['getBooking']>) => getStorage().getBooking(...args),
  createBooking: (...args: Parameters<DatabaseStorage['createBooking']>) => getStorage().createBooking(...args),
  updateBooking: (...args: Parameters<DatabaseStorage['updateBooking']>) => getStorage().updateBooking(...args),
  getMaintenanceRecords: () => getStorage().getMaintenanceRecords(),
  createMaintenanceRecord: (...args: Parameters<DatabaseStorage['createMaintenanceRecord']>) => getStorage().createMaintenanceRecord(...args),
  getFuelRecords: () => getStorage().getFuelRecords(),
  createFuelRecord: (...args: Parameters<DatabaseStorage['createFuelRecord']>) => getStorage().createFuelRecord(...args),
  getUsers: () => getStorage().getUsers(),
  getApprovers: () => getStorage().getApprovers(),
  updateUserRole: (...args: Parameters<DatabaseStorage['updateUserRole']>) => getStorage().updateUserRole(...args),
  updateUserPermissions: (...args: Parameters<DatabaseStorage['updateUserPermissions']>) => getStorage().updateUserPermissions(...args),
  updateUserApprover: (...args: Parameters<DatabaseStorage['updateUserApprover']>) => getStorage().updateUserApprover(...args),
  updateUserPassword: (...args: Parameters<DatabaseStorage['updateUserPassword']>) => getStorage().updateUserPassword(...args),
  updateUserEmail: (...args: Parameters<DatabaseStorage['updateUserEmail']>) => getStorage().updateUserEmail(...args),
  updateUserProfile: (...args: Parameters<DatabaseStorage['updateUserProfile']>) => getStorage().updateUserProfile(...args),
  deleteUser: (...args: Parameters<DatabaseStorage['deleteUser']>) => getStorage().deleteUser(...args),
  getEmailSettings: () => getStorage().getEmailSettings(),
  upsertEmailSettings: (...args: Parameters<DatabaseStorage['upsertEmailSettings']>) => getStorage().upsertEmailSettings(...args),
  getDepartments: () => getStorage().getDepartments(),
  createDepartment: (...args: Parameters<DatabaseStorage['createDepartment']>) => getStorage().createDepartment(...args),
  deleteDepartment: (...args: Parameters<DatabaseStorage['deleteDepartment']>) => getStorage().deleteDepartment(...args),
  get sessionStore() { return getStorage().sessionStore; },
};
