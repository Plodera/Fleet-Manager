import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords, emailSettings, departments, sharedTrips, vehicleInspections, equipmentTypes, equipmentChecklistItems,
  shifts, activityTypes, subEquipment, workOrders, workOrderItems,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel, type EmailSettings, type InsertEmailSettings,
  type Department, type InsertDepartment, type SharedTrip, type InsertSharedTrip,
  type VehicleInspection, type InsertVehicleInspection,
  type EquipmentType, type InsertEquipmentType,
  type EquipmentChecklistItem, type InsertEquipmentChecklistItem,
  type Shift, type InsertShift,
  type ActivityType, type InsertActivityType,
  type SubEquipment, type InsertSubEquipment,
  type WorkOrder, type InsertWorkOrder,
  type WorkOrderItem, type InsertWorkOrderItem,
} from "@shared/schema";
import { getDb, getPool } from "./db";
import { eq, desc, sql } from "drizzle-orm";
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
  updateUserSession(id: number, sessionId: string | null): Promise<void>;
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

  // Shifts
  getShifts(): Promise<Shift[]>;
  createShift(shift: InsertShift): Promise<Shift>;
  updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift>;
  deleteShift(id: number): Promise<void>;

  // Activity Types
  getActivityTypes(): Promise<ActivityType[]>;
  createActivityType(type: InsertActivityType): Promise<ActivityType>;
  updateActivityType(id: number, updates: Partial<InsertActivityType>): Promise<ActivityType>;
  deleteActivityType(id: number): Promise<void>;

  // Sub-Equipment
  getSubEquipment(): Promise<SubEquipment[]>;
  createSubEquipment(item: InsertSubEquipment): Promise<SubEquipment>;
  updateSubEquipment(id: number, updates: Partial<InsertSubEquipment>): Promise<SubEquipment>;
  deleteSubEquipment(id: number): Promise<void>;

  // Work Orders
  getWorkOrders(): Promise<(WorkOrder & { vehicle: Vehicle; shift?: Shift; createdBy: User; items: (WorkOrderItem & { subEquipment?: SubEquipment; activityType?: ActivityType })[] })[]>;
  getWorkOrder(id: number): Promise<(WorkOrder & { vehicle: Vehicle; shift?: Shift; createdBy: User; items: (WorkOrderItem & { subEquipment?: SubEquipment; activityType?: ActivityType })[] }) | undefined>;
  createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder>;
  updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder>;
  deleteWorkOrder(id: number): Promise<void>;
  getNextJobNo(): Promise<string>;

  // Work Order Items
  createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem>;
  updateWorkOrderItem(id: number, updates: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem>;
  deleteWorkOrderItem(id: number): Promise<void>;
  deleteWorkOrderItems(workOrderId: number): Promise<void>;

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

  async updateUserSession(id: number, sessionId: string | null): Promise<void> {
    await getDb().update(users).set({ currentSessionId: sessionId }).where(eq(users.id, id));
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

  // Shifts
  async getShifts(): Promise<Shift[]> {
    return await getDb().select().from(shifts);
  }

  async createShift(shift: InsertShift): Promise<Shift> {
    const [created] = await getDb().insert(shifts).values(shift).returning();
    return created;
  }

  async updateShift(id: number, updates: Partial<InsertShift>): Promise<Shift> {
    const [updated] = await getDb().update(shifts).set(updates).where(eq(shifts.id, id)).returning();
    return updated;
  }

  async deleteShift(id: number): Promise<void> {
    await getDb().delete(shifts).where(eq(shifts.id, id));
  }

  // Activity Types
  async getActivityTypes(): Promise<ActivityType[]> {
    return await getDb().select().from(activityTypes);
  }

  async createActivityType(type: InsertActivityType): Promise<ActivityType> {
    const [created] = await getDb().insert(activityTypes).values(type).returning();
    return created;
  }

  async updateActivityType(id: number, updates: Partial<InsertActivityType>): Promise<ActivityType> {
    const [updated] = await getDb().update(activityTypes).set(updates).where(eq(activityTypes.id, id)).returning();
    return updated;
  }

  async deleteActivityType(id: number): Promise<void> {
    await getDb().delete(activityTypes).where(eq(activityTypes.id, id));
  }

  // Sub-Equipment
  async getSubEquipment(): Promise<SubEquipment[]> {
    return await getDb().select().from(subEquipment);
  }

  async createSubEquipment(item: InsertSubEquipment): Promise<SubEquipment> {
    const [created] = await getDb().insert(subEquipment).values(item).returning();
    return created;
  }

  async updateSubEquipment(id: number, updates: Partial<InsertSubEquipment>): Promise<SubEquipment> {
    const [updated] = await getDb().update(subEquipment).set(updates).where(eq(subEquipment.id, id)).returning();
    return updated;
  }

  async deleteSubEquipment(id: number): Promise<void> {
    await getDb().delete(subEquipment).where(eq(subEquipment.id, id));
  }

  // Work Orders
  async getWorkOrders(): Promise<(WorkOrder & { vehicle: Vehicle; shift?: Shift; createdBy: User; items: (WorkOrderItem & { subEquipment?: SubEquipment; activityType?: ActivityType })[] })[]> {
    const orders = await getDb().select().from(workOrders).orderBy(desc(workOrders.createdAt));
    const results = [];
    for (const order of orders) {
      const enriched = await this._enrichWorkOrder(order);
      if (enriched) results.push(enriched);
    }
    return results;
  }

  async getWorkOrder(id: number): Promise<(WorkOrder & { vehicle: Vehicle; shift?: Shift; createdBy: User; items: (WorkOrderItem & { subEquipment?: SubEquipment; activityType?: ActivityType })[] }) | undefined> {
    const [order] = await getDb().select().from(workOrders).where(eq(workOrders.id, id));
    if (!order) return undefined;
    return this._enrichWorkOrder(order);
  }

  private async _enrichWorkOrder(order: WorkOrder) {
    const [vehicle] = await getDb().select().from(vehicles).where(eq(vehicles.id, order.vehicleId));
    const [createdBy] = await getDb().select().from(users).where(eq(users.id, order.createdById));
    if (!vehicle || !createdBy) return undefined;

    let shift: Shift | undefined;
    if (order.shiftId) {
      const [s] = await getDb().select().from(shifts).where(eq(shifts.id, order.shiftId));
      shift = s;
    }

    const orderItems = await getDb().select().from(workOrderItems).where(eq(workOrderItems.workOrderId, order.id));
    const enrichedItems = [];
    for (const item of orderItems) {
      let sub: SubEquipment | undefined;
      let act: ActivityType | undefined;
      if (item.subEquipmentId) {
        const [s] = await getDb().select().from(subEquipment).where(eq(subEquipment.id, item.subEquipmentId));
        sub = s;
      }
      if (item.activityTypeId) {
        const [a] = await getDb().select().from(activityTypes).where(eq(activityTypes.id, item.activityTypeId));
        act = a;
      }
      enrichedItems.push({ ...item, subEquipment: sub, activityType: act });
    }

    return { ...order, vehicle, shift, createdBy, items: enrichedItems };
  }

  async createWorkOrder(order: InsertWorkOrder): Promise<WorkOrder> {
    const jobNo = await this.getNextJobNo();
    const [created] = await getDb().insert(workOrders).values({ ...order, jobNo }).returning();
    return created;
  }

  async updateWorkOrder(id: number, updates: Partial<InsertWorkOrder>): Promise<WorkOrder> {
    const [updated] = await getDb().update(workOrders).set(updates).where(eq(workOrders.id, id)).returning();
    return updated;
  }

  async deleteWorkOrder(id: number): Promise<void> {
    await getDb().delete(workOrderItems).where(eq(workOrderItems.workOrderId, id));
    await getDb().delete(workOrders).where(eq(workOrders.id, id));
  }

  async getNextJobNo(): Promise<string> {
    const result = await getDb().select({ maxJob: sql<string>`MAX(job_no)` }).from(workOrders);
    const maxJob = result[0]?.maxJob;
    if (!maxJob) return 'JOB-0001';
    const num = parseInt(maxJob.replace('JOB-', ''), 10);
    return `JOB-${String(num + 1).padStart(4, '0')}`;
  }

  // Work Order Items
  async createWorkOrderItem(item: InsertWorkOrderItem): Promise<WorkOrderItem> {
    const [created] = await getDb().insert(workOrderItems).values(item).returning();
    return created;
  }

  async updateWorkOrderItem(id: number, updates: Partial<InsertWorkOrderItem>): Promise<WorkOrderItem> {
    const [updated] = await getDb().update(workOrderItems).set(updates).where(eq(workOrderItems.id, id)).returning();
    return updated;
  }

  async deleteWorkOrderItem(id: number): Promise<void> {
    await getDb().delete(workOrderItems).where(eq(workOrderItems.id, id));
  }

  async deleteWorkOrderItems(workOrderId: number): Promise<void> {
    await getDb().delete(workOrderItems).where(eq(workOrderItems.workOrderId, workOrderId));
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
  updateUserSession: (...args: Parameters<DatabaseStorage['updateUserSession']>) => getStorage().updateUserSession(...args),
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
  getShifts: () => getStorage().getShifts(),
  createShift: (...args: Parameters<DatabaseStorage['createShift']>) => getStorage().createShift(...args),
  updateShift: (...args: Parameters<DatabaseStorage['updateShift']>) => getStorage().updateShift(...args),
  deleteShift: (...args: Parameters<DatabaseStorage['deleteShift']>) => getStorage().deleteShift(...args),
  getActivityTypes: () => getStorage().getActivityTypes(),
  createActivityType: (...args: Parameters<DatabaseStorage['createActivityType']>) => getStorage().createActivityType(...args),
  updateActivityType: (...args: Parameters<DatabaseStorage['updateActivityType']>) => getStorage().updateActivityType(...args),
  deleteActivityType: (...args: Parameters<DatabaseStorage['deleteActivityType']>) => getStorage().deleteActivityType(...args),
  getSubEquipment: () => getStorage().getSubEquipment(),
  createSubEquipment: (...args: Parameters<DatabaseStorage['createSubEquipment']>) => getStorage().createSubEquipment(...args),
  updateSubEquipment: (...args: Parameters<DatabaseStorage['updateSubEquipment']>) => getStorage().updateSubEquipment(...args),
  deleteSubEquipment: (...args: Parameters<DatabaseStorage['deleteSubEquipment']>) => getStorage().deleteSubEquipment(...args),
  getWorkOrders: () => getStorage().getWorkOrders(),
  getWorkOrder: (...args: Parameters<DatabaseStorage['getWorkOrder']>) => getStorage().getWorkOrder(...args),
  createWorkOrder: (...args: Parameters<DatabaseStorage['createWorkOrder']>) => getStorage().createWorkOrder(...args),
  updateWorkOrder: (...args: Parameters<DatabaseStorage['updateWorkOrder']>) => getStorage().updateWorkOrder(...args),
  deleteWorkOrder: (...args: Parameters<DatabaseStorage['deleteWorkOrder']>) => getStorage().deleteWorkOrder(...args),
  getNextJobNo: () => getStorage().getNextJobNo(),
  createWorkOrderItem: (...args: Parameters<DatabaseStorage['createWorkOrderItem']>) => getStorage().createWorkOrderItem(...args),
  updateWorkOrderItem: (...args: Parameters<DatabaseStorage['updateWorkOrderItem']>) => getStorage().updateWorkOrderItem(...args),
  deleteWorkOrderItem: (...args: Parameters<DatabaseStorage['deleteWorkOrderItem']>) => getStorage().deleteWorkOrderItem(...args),
  deleteWorkOrderItems: (...args: Parameters<DatabaseStorage['deleteWorkOrderItems']>) => getStorage().deleteWorkOrderItems(...args),
  get sessionStore() { return getStorage().sessionStore; },
};
