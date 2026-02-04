import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords, emailSettings, departments, sharedTrips, vehicleInspections, equipmentTypes, equipmentChecklistItems,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel, type EmailSettings, type InsertEmailSettings,
  type Department, type InsertDepartment, type SharedTrip, type InsertSharedTrip,
  type VehicleInspection, type InsertVehicleInspection,
  type EquipmentType, type InsertEquipmentType,
  type EquipmentChecklistItem, type InsertEquipmentChecklistItem
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
  getDrivers(): Promise<User[]>;
  updateUserRole(id: number, role: string): Promise<User>;
  updateUserPermissions(id: number, permissions: string[]): Promise<User>;
  updateUserApprover(id: number, isApprover: boolean): Promise<User>;
  updateUserDriver(id: number, isDriver: boolean): Promise<User>;
  updateUserPassword(id: number, password: string): Promise<void>;
  updateUserEmail(id: number, email: string): Promise<User | undefined>;
  updateUserProfile(id: number, data: { username?: string; fullName?: string }): Promise<User | undefined>;
  deleteUser(id: number): Promise<void>;

  getEmailSettings(): Promise<EmailSettings | undefined>;
  upsertEmailSettings(settings: InsertEmailSettings): Promise<EmailSettings>;

  getDepartments(): Promise<Department[]>;
  createDepartment(dept: InsertDepartment): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;

  getSharedTrips(): Promise<(SharedTrip & { vehicle: Vehicle; approver: User; passengers: Array<{ booking: Booking; user: User }> })[]>;
  getSharedTrip(id: number): Promise<(SharedTrip & { vehicle: Vehicle; approver: User; passengers: Array<{ booking: Booking; user: User }> }) | undefined>;
  createSharedTrip(trip: InsertSharedTrip): Promise<SharedTrip>;
  updateSharedTrip(id: number, updates: Partial<InsertSharedTrip>): Promise<SharedTrip>;
  deleteSharedTrip(id: number): Promise<void>;

  getVehicleInspections(): Promise<(VehicleInspection & { vehicle: Vehicle; operator: User })[]>;
  getVehicleInspection(id: number): Promise<(VehicleInspection & { vehicle: Vehicle; operator: User }) | undefined>;
  createVehicleInspection(inspection: InsertVehicleInspection): Promise<VehicleInspection>;
  deleteVehicleInspection(id: number): Promise<void>;

  // Equipment Types
  getEquipmentTypes(): Promise<EquipmentType[]>;
  getEquipmentType(id: number): Promise<EquipmentType | undefined>;
  createEquipmentType(type: InsertEquipmentType): Promise<EquipmentType>;
  updateEquipmentType(id: number, updates: Partial<InsertEquipmentType>): Promise<EquipmentType>;
  deleteEquipmentType(id: number): Promise<void>;
  
  // Equipment Checklist Items
  getEquipmentChecklistItems(equipmentTypeId: number): Promise<EquipmentChecklistItem[]>;
  createEquipmentChecklistItem(item: InsertEquipmentChecklistItem): Promise<EquipmentChecklistItem>;
  updateEquipmentChecklistItem(id: number, updates: Partial<InsertEquipmentChecklistItem>): Promise<EquipmentChecklistItem>;
  deleteEquipmentChecklistItem(id: number): Promise<void>;

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

  async getDrivers(): Promise<User[]> {
    return await getDb().select().from(users).where(eq(users.isDriver, true));
  }

  async updateUserApprover(id: number, isApprover: boolean): Promise<User> {
    const [user] = await getDb().update(users).set({ isApprover }).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserDriver(id: number, isDriver: boolean): Promise<User> {
    const [user] = await getDb().update(users).set({ isDriver }).where(eq(users.id, id)).returning();
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

  async getSharedTrips(): Promise<(SharedTrip & { vehicle: Vehicle; approver: User; passengers: Array<{ booking: Booking; user: User }> })[]> {
    const trips = await getDb().select().from(sharedTrips);
    const results = [];
    
    for (const trip of trips) {
      const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, trip.vehicleId));
      const [approver] = await getDb().select().from(users).where(eq(users.id, trip.approverId));
      
      const tripBookings = await getDb().select().from(bookings).where(eq(bookings.sharedTripId, trip.id));
      const passengers = [];
      for (const b of tripBookings) {
        const [u] = await getDb().select().from(users).where(eq(users.id, b.userId));
        if (u) passengers.push({ booking: b, user: u });
      }
      
      if (vehicle && approver) {
        results.push({ ...trip, vehicle, approver, passengers });
      }
    }
    
    return results;
  }

  async getSharedTrip(id: number): Promise<(SharedTrip & { vehicle: Vehicle; approver: User; passengers: Array<{ booking: Booking; user: User }> }) | undefined> {
    const [trip] = await getDb().select().from(sharedTrips).where(eq(sharedTrips.id, id));
    if (!trip) return undefined;
    
    const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, trip.vehicleId));
    const [approver] = await getDb().select().from(users).where(eq(users.id, trip.approverId));
    
    const tripBookings = await getDb().select().from(bookings).where(eq(bookings.sharedTripId, trip.id));
    const passengers = [];
    for (const b of tripBookings) {
      const [u] = await getDb().select().from(users).where(eq(users.id, b.userId));
      if (u) passengers.push({ booking: b, user: u });
    }
    
    if (!vehicle || !approver) return undefined;
    return { ...trip, vehicle, approver, passengers };
  }

  async createSharedTrip(trip: InsertSharedTrip): Promise<SharedTrip> {
    const [created] = await getDb().insert(sharedTrips).values(trip).returning();
    return created;
  }

  async updateSharedTrip(id: number, updates: Partial<InsertSharedTrip>): Promise<SharedTrip> {
    const [updated] = await getDb().update(sharedTrips).set(updates).where(eq(sharedTrips.id, id)).returning();
    return updated;
  }

  async deleteSharedTrip(id: number): Promise<void> {
    await getDb().delete(bookings).where(eq(bookings.sharedTripId, id));
    await getDb().delete(sharedTrips).where(eq(sharedTrips.id, id));
  }

  async getVehicleInspections(): Promise<(VehicleInspection & { vehicle: Vehicle; operator: User })[]> {
    const inspections = await getDb().select().from(vehicleInspections);
    const results = [];
    
    for (const inspection of inspections) {
      const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, inspection.vehicleId));
      const [operator] = await getDb().select().from(users).where(eq(users.id, inspection.operatorId));
      
      if (vehicle && operator) {
        results.push({ ...inspection, vehicle, operator });
      }
    }
    
    return results;
  }

  async getVehicleInspection(id: number): Promise<(VehicleInspection & { vehicle: Vehicle; operator: User }) | undefined> {
    const [inspection] = await getDb().select().from(vehicleInspections).where(eq(vehicleInspections.id, id));
    if (!inspection) return undefined;
    
    const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, inspection.vehicleId));
    const [operator] = await getDb().select().from(users).where(eq(users.id, inspection.operatorId));
    
    if (!vehicle || !operator) return undefined;
    return { ...inspection, vehicle, operator };
  }

  async createVehicleInspection(inspection: InsertVehicleInspection): Promise<VehicleInspection> {
    const [created] = await getDb().insert(vehicleInspections).values(inspection).returning();
    return created;
  }

  async deleteVehicleInspection(id: number): Promise<void> {
    await getDb().delete(vehicleInspections).where(eq(vehicleInspections.id, id));
  }

  // Equipment Types
  async getEquipmentTypes(): Promise<EquipmentType[]> {
    return await getDb().select().from(equipmentTypes).orderBy(equipmentTypes.sortOrder);
  }

  async getEquipmentType(id: number): Promise<EquipmentType | undefined> {
    const [type] = await getDb().select().from(equipmentTypes).where(eq(equipmentTypes.id, id));
    return type;
  }

  async createEquipmentType(type: InsertEquipmentType): Promise<EquipmentType> {
    const [created] = await getDb().insert(equipmentTypes).values(type).returning();
    return created;
  }

  async updateEquipmentType(id: number, updates: Partial<InsertEquipmentType>): Promise<EquipmentType> {
    const [updated] = await getDb().update(equipmentTypes).set(updates).where(eq(equipmentTypes.id, id)).returning();
    return updated;
  }

  async deleteEquipmentType(id: number): Promise<void> {
    // First delete all checklist items for this type
    await getDb().delete(equipmentChecklistItems).where(eq(equipmentChecklistItems.equipmentTypeId, id));
    await getDb().delete(equipmentTypes).where(eq(equipmentTypes.id, id));
  }

  // Equipment Checklist Items
  async getEquipmentChecklistItems(equipmentTypeId: number): Promise<EquipmentChecklistItem[]> {
    return await getDb().select().from(equipmentChecklistItems).where(eq(equipmentChecklistItems.equipmentTypeId, equipmentTypeId)).orderBy(equipmentChecklistItems.sortOrder);
  }

  async createEquipmentChecklistItem(item: InsertEquipmentChecklistItem): Promise<EquipmentChecklistItem> {
    const [created] = await getDb().insert(equipmentChecklistItems).values(item).returning();
    return created;
  }

  async updateEquipmentChecklistItem(id: number, updates: Partial<InsertEquipmentChecklistItem>): Promise<EquipmentChecklistItem> {
    const [updated] = await getDb().update(equipmentChecklistItems).set(updates).where(eq(equipmentChecklistItems.id, id)).returning();
    return updated;
  }

  async deleteEquipmentChecklistItem(id: number): Promise<void> {
    await getDb().delete(equipmentChecklistItems).where(eq(equipmentChecklistItems.id, id));
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
  getDrivers: () => getStorage().getDrivers(),
  updateUserRole: (...args: Parameters<DatabaseStorage['updateUserRole']>) => getStorage().updateUserRole(...args),
  updateUserPermissions: (...args: Parameters<DatabaseStorage['updateUserPermissions']>) => getStorage().updateUserPermissions(...args),
  updateUserApprover: (...args: Parameters<DatabaseStorage['updateUserApprover']>) => getStorage().updateUserApprover(...args),
  updateUserDriver: (...args: Parameters<DatabaseStorage['updateUserDriver']>) => getStorage().updateUserDriver(...args),
  updateUserPassword: (...args: Parameters<DatabaseStorage['updateUserPassword']>) => getStorage().updateUserPassword(...args),
  updateUserEmail: (...args: Parameters<DatabaseStorage['updateUserEmail']>) => getStorage().updateUserEmail(...args),
  updateUserProfile: (...args: Parameters<DatabaseStorage['updateUserProfile']>) => getStorage().updateUserProfile(...args),
  deleteUser: (...args: Parameters<DatabaseStorage['deleteUser']>) => getStorage().deleteUser(...args),
  getEmailSettings: () => getStorage().getEmailSettings(),
  upsertEmailSettings: (...args: Parameters<DatabaseStorage['upsertEmailSettings']>) => getStorage().upsertEmailSettings(...args),
  getDepartments: () => getStorage().getDepartments(),
  createDepartment: (...args: Parameters<DatabaseStorage['createDepartment']>) => getStorage().createDepartment(...args),
  deleteDepartment: (...args: Parameters<DatabaseStorage['deleteDepartment']>) => getStorage().deleteDepartment(...args),
  getSharedTrips: () => getStorage().getSharedTrips(),
  getSharedTrip: (...args: Parameters<DatabaseStorage['getSharedTrip']>) => getStorage().getSharedTrip(...args),
  createSharedTrip: (...args: Parameters<DatabaseStorage['createSharedTrip']>) => getStorage().createSharedTrip(...args),
  updateSharedTrip: (...args: Parameters<DatabaseStorage['updateSharedTrip']>) => getStorage().updateSharedTrip(...args),
  deleteSharedTrip: (...args: Parameters<DatabaseStorage['deleteSharedTrip']>) => getStorage().deleteSharedTrip(...args),
  getVehicleInspections: () => getStorage().getVehicleInspections(),
  getVehicleInspection: (...args: Parameters<DatabaseStorage['getVehicleInspection']>) => getStorage().getVehicleInspection(...args),
  createVehicleInspection: (...args: Parameters<DatabaseStorage['createVehicleInspection']>) => getStorage().createVehicleInspection(...args),
  deleteVehicleInspection: (...args: Parameters<DatabaseStorage['deleteVehicleInspection']>) => getStorage().deleteVehicleInspection(...args),
  getEquipmentTypes: () => getStorage().getEquipmentTypes(),
  getEquipmentType: (...args: Parameters<DatabaseStorage['getEquipmentType']>) => getStorage().getEquipmentType(...args),
  createEquipmentType: (...args: Parameters<DatabaseStorage['createEquipmentType']>) => getStorage().createEquipmentType(...args),
  updateEquipmentType: (...args: Parameters<DatabaseStorage['updateEquipmentType']>) => getStorage().updateEquipmentType(...args),
  deleteEquipmentType: (...args: Parameters<DatabaseStorage['deleteEquipmentType']>) => getStorage().deleteEquipmentType(...args),
  getEquipmentChecklistItems: (...args: Parameters<DatabaseStorage['getEquipmentChecklistItems']>) => getStorage().getEquipmentChecklistItems(...args),
  createEquipmentChecklistItem: (...args: Parameters<DatabaseStorage['createEquipmentChecklistItem']>) => getStorage().createEquipmentChecklistItem(...args),
  updateEquipmentChecklistItem: (...args: Parameters<DatabaseStorage['updateEquipmentChecklistItem']>) => getStorage().updateEquipmentChecklistItem(...args),
  deleteEquipmentChecklistItem: (...args: Parameters<DatabaseStorage['deleteEquipmentChecklistItem']>) => getStorage().deleteEquipmentChecklistItem(...args),
  get sessionStore() { return getStorage().sessionStore; },
};
