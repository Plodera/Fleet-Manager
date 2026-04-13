import { 
  users, vehicles, bookings, maintenanceRecords, fuelRecords, emailSettings, departments, sharedTrips, vehicleInspections, equipmentTypes, equipmentChecklistItems,
  maintenanceTypeConfig, shifts, activityTypes, subEquipment, vehicleTypes, workOrders, workOrderItems,
  indents, indentItems, indentApproverDepartments,
  tvDashboards, tvDashboardKpis, tvDashboardKpiValues, tvDashboardVideos,
  trackers, trackerItems, trackerNotificationRules,
  itHostTypes, itMonitoredHosts, itHostStatus, itKpis, itKpiValues,
  glpiSettings,
  hikvisionNvrs, hikvisionGlobalSettings,
  fortigateSettings, fortigateBandwidth,
  type User, type InsertUser, type Vehicle, type InsertVehicle,
  type Booking, type InsertBooking, type MaintenanceRecord, type InsertMaintenance,
  type FuelRecord, type InsertFuel, type EmailSettings, type InsertEmailSettings,
  type Department, type InsertDepartment, type SharedTrip, type InsertSharedTrip,
  type ItHostType, type InsertItHostType, type ItMonitoredHost, type InsertItMonitoredHost, type ItHostStatus, type ItKpi, type InsertItKpi, type ItKpiValue, type InsertItKpiValue, type ItHostWithStatus,
  type VehicleInspection, type InsertVehicleInspection,
  type EquipmentType, type InsertEquipmentType,
  type EquipmentChecklistItem, type InsertEquipmentChecklistItem,
  type MaintenanceTypeConfig, type InsertMaintenanceTypeConfig,
  type Shift, type InsertShift,
  type ActivityType, type InsertActivityType,
  type SubEquipment, type InsertSubEquipment,
  type VehicleType, type InsertVehicleType,
  type WorkOrder, type InsertWorkOrder,
  type WorkOrderItem, type InsertWorkOrderItem,
  type Indent, type InsertIndent,
  type IndentItem, type InsertIndentItem,
  type IndentApproverDepartment,
  type TvDashboard, type InsertTvDashboard,
  type TvDashboardKpi, type InsertTvDashboardKpi,
  type TvDashboardKpiValue, type InsertTvDashboardKpiValue,
  type TvDashboardVideo, type InsertTvDashboardVideo,
  type Tracker, type InsertTracker,
  type TrackerItem, type InsertTrackerItem,
  type TrackerNotificationRule, type InsertTrackerNotificationRule,
  type GlpiSettings, type InsertGlpiSettings,
  type HikvisionNvr, type InsertHikvisionNvr,
  type HikvisionGlobalSettings, type InsertHikvisionGlobalSettings,
  type FortigateSettings, type InsertFortigateSettings, type FortigateBandwidth,
} from "@shared/schema";
import { getDb, getPool } from "./db";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";
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

  // Maintenance Type Config
  getMaintenanceTypeConfigs(): Promise<MaintenanceTypeConfig[]>;
  createMaintenanceTypeConfig(item: InsertMaintenanceTypeConfig): Promise<MaintenanceTypeConfig>;
  updateMaintenanceTypeConfig(id: number, updates: Partial<InsertMaintenanceTypeConfig>): Promise<MaintenanceTypeConfig>;
  deleteMaintenanceTypeConfig(id: number): Promise<void>;

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

  // Vehicle Types
  getVehicleTypes(): Promise<VehicleType[]>;
  createVehicleType(item: InsertVehicleType): Promise<VehicleType>;
  updateVehicleType(id: number, updates: Partial<InsertVehicleType>): Promise<VehicleType>;
  deleteVehicleType(id: number): Promise<void>;

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

  // Indents
  getIndents(): Promise<any[]>;
  getIndent(id: number): Promise<any | undefined>;
  createIndent(data: InsertIndent, items: Omit<InsertIndentItem, 'indentId'>[]): Promise<Indent>;
  updateIndent(id: number, updates: Partial<InsertIndent>): Promise<Indent>;
  deleteIndent(id: number): Promise<void>;
  getNextIndentNo(): Promise<string>;
  getIndentItems(indentId: number): Promise<IndentItem[]>;
  replaceIndentItems(indentId: number, items: Omit<InsertIndentItem, 'indentId'>[]): Promise<IndentItem[]>;

  // Indent Approver Departments
  getIndentApproverDepartments(): Promise<any[]>;
  getMyIndentApproverDepartments(userId: number): Promise<number[]>;
  setIndentApproverDepartments(userId: number, departmentIds: number[]): Promise<void>;

  // TV Dashboards
  getTvDashboards(): Promise<TvDashboard[]>;
  getTvDashboard(id: number): Promise<TvDashboard | undefined>;
  createTvDashboard(data: InsertTvDashboard): Promise<TvDashboard>;
  updateTvDashboard(id: number, updates: Partial<InsertTvDashboard>): Promise<TvDashboard>;
  deleteTvDashboard(id: number): Promise<void>;
  getTvDashboardKpis(dashboardId: number): Promise<TvDashboardKpi[]>;
  createTvDashboardKpi(data: InsertTvDashboardKpi): Promise<TvDashboardKpi>;
  updateTvDashboardKpi(id: number, updates: Partial<InsertTvDashboardKpi>): Promise<TvDashboardKpi>;
  deleteTvDashboardKpi(id: number): Promise<void>;
  getTvKpiValues(kpiIds: number[], periodType?: string, periodDate?: string): Promise<TvDashboardKpiValue[]>;
  upsertTvKpiValues(values: InsertTvDashboardKpiValue[]): Promise<void>;
  getTvDashboardVideos(dashboardId: number): Promise<TvDashboardVideo[]>;
  createTvDashboardVideo(data: InsertTvDashboardVideo): Promise<TvDashboardVideo>;
  updateTvDashboardVideo(id: number, updates: Partial<InsertTvDashboardVideo>): Promise<TvDashboardVideo>;
  deleteTvDashboardVideo(id: number): Promise<void>;
  getTvDashboardDisplay(id: number): Promise<any>;

  // Status Trackers
  getTrackers(): Promise<(Tracker & { department?: Department })[]>;
  getTracker(id: number): Promise<(Tracker & { department?: Department }) | undefined>;
  createTracker(data: InsertTracker): Promise<Tracker>;
  updateTracker(id: number, updates: Partial<InsertTracker>): Promise<Tracker>;
  deleteTracker(id: number): Promise<void>;
  getTrackerItems(trackerId: number): Promise<TrackerItem[]>;
  createTrackerItem(data: InsertTrackerItem): Promise<TrackerItem>;
  updateTrackerItem(id: number, updates: Partial<InsertTrackerItem>): Promise<TrackerItem>;
  deleteTrackerItem(id: number): Promise<void>;
  getTrackerNotificationRules(trackerId: number): Promise<TrackerNotificationRule[]>;
  getAllActiveTrackerNotificationRules(): Promise<(TrackerNotificationRule & { tracker: Tracker })[]>;
  createTrackerNotificationRule(data: InsertTrackerNotificationRule): Promise<TrackerNotificationRule>;
  updateTrackerNotificationRule(id: number, updates: Partial<TrackerNotificationRule>): Promise<TrackerNotificationRule>;
  deleteTrackerNotificationRule(id: number): Promise<void>;

  // IT Operations Monitor
  getItHostTypes(): Promise<ItHostType[]>;
  createItHostType(data: InsertItHostType): Promise<ItHostType>;
  updateItHostType(id: number, updates: Partial<InsertItHostType>): Promise<ItHostType>;
  deleteItHostType(id: number): Promise<void>;
  getItHosts(): Promise<any[]>;
  getItHost(id: number): Promise<any | undefined>;
  createItHost(data: any): Promise<any>;
  updateItHost(id: number, updates: any): Promise<any>;
  deleteItHost(id: number): Promise<void>;
  upsertItHostStatus(hostId: number, isOnline: boolean, responseTimeMs: number | null): Promise<void>;
  getItHostsWithStatus(): Promise<any[]>;
  getItKpis(): Promise<any[]>;
  createItKpi(data: any): Promise<any>;
  updateItKpi(id: number, updates: any): Promise<any>;
  deleteItKpi(id: number): Promise<void>;
  getItKpiValues(periodType: string, periodDate: string): Promise<any[]>;
  upsertItKpiValues(values: any[]): Promise<void>;

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
    const cleaned = {
      ...insertVehicle,
      vin: insertVehicle.vin?.trim() || null,
    };
    const [vehicle] = await getDb().insert(vehicles).values(cleaned).returning();
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

  // Maintenance Type Config
  async getMaintenanceTypeConfigs(): Promise<MaintenanceTypeConfig[]> {
    return await getDb().select().from(maintenanceTypeConfig);
  }

  async createMaintenanceTypeConfig(item: InsertMaintenanceTypeConfig): Promise<MaintenanceTypeConfig> {
    const [created] = await getDb().insert(maintenanceTypeConfig).values(item).returning();
    return created;
  }

  async updateMaintenanceTypeConfig(id: number, updates: Partial<InsertMaintenanceTypeConfig>): Promise<MaintenanceTypeConfig> {
    const [updated] = await getDb().update(maintenanceTypeConfig).set(updates).where(eq(maintenanceTypeConfig.id, id)).returning();
    return updated;
  }

  async deleteMaintenanceTypeConfig(id: number): Promise<void> {
    await getDb().delete(maintenanceTypeConfig).where(eq(maintenanceTypeConfig.id, id));
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

  // Vehicle Types
  async getVehicleTypes(): Promise<VehicleType[]> {
    return await getDb().select().from(vehicleTypes);
  }

  async createVehicleType(item: InsertVehicleType): Promise<VehicleType> {
    const [created] = await getDb().insert(vehicleTypes).values(item).returning();
    return created;
  }

  async updateVehicleType(id: number, updates: Partial<InsertVehicleType>): Promise<VehicleType> {
    const [updated] = await getDb().update(vehicleTypes).set(updates).where(eq(vehicleTypes.id, id)).returning();
    return updated;
  }

  async deleteVehicleType(id: number): Promise<void> {
    await getDb().delete(vehicleTypes).where(eq(vehicleTypes.id, id));
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

  // Indents
  async getIndents(): Promise<any[]> {
    const allIndents = await getDb().select().from(indents).orderBy(desc(indents.createdAt));
    const results = [];
    for (const indent of allIndents) {
      const enriched = await this._enrichIndent(indent);
      if (enriched) results.push(enriched);
    }
    return results;
  }

  async getIndent(id: number): Promise<any | undefined> {
    const [indent] = await getDb().select().from(indents).where(eq(indents.id, id));
    if (!indent) return undefined;
    return this._enrichIndent(indent);
  }

  private async _enrichIndent(indent: Indent) {
    const [requestedBy] = await getDb().select().from(users).where(eq(users.id, indent.requestedById));
    if (!requestedBy) return undefined;
    const approvedBy = indent.approvedById ? (await getDb().select().from(users).where(eq(users.id, indent.approvedById)))[0] : null;
    const vehicle = indent.vehicleId ? (await getDb().select().from(vehicles).where(eq(vehicles.id, indent.vehicleId)))[0] : null;
    const department = indent.departmentId ? (await getDb().select().from(departments).where(eq(departments.id, indent.departmentId)))[0] : null;
    const items = await getDb().select().from(indentItems).where(eq(indentItems.indentId, indent.id));
    return { ...indent, requestedBy, approvedBy, vehicle, department, items };
  }

  async createIndent(data: InsertIndent, items: Omit<InsertIndentItem, 'indentId'>[]): Promise<Indent> {
    const indentNo = await this.getNextIndentNo();
    const [created] = await getDb().insert(indents).values({ ...data, indentNo }).returning();
    if (items.length > 0) {
      await getDb().insert(indentItems).values(items.map(item => ({ ...item, indentId: created.id })));
    }
    return created;
  }

  async updateIndent(id: number, updates: Partial<InsertIndent>): Promise<Indent> {
    const [updated] = await getDb().update(indents).set({ ...updates, updatedAt: new Date() }).where(eq(indents.id, id)).returning();
    return updated;
  }

  async deleteIndent(id: number): Promise<void> {
    await getDb().delete(indentItems).where(eq(indentItems.indentId, id));
    await getDb().delete(indents).where(eq(indents.id, id));
  }

  async getNextIndentNo(): Promise<string> {
    const result = await getDb().select({ maxNo: sql<string>`MAX(indent_no)` }).from(indents);
    const maxNo = result[0]?.maxNo;
    if (!maxNo) return 'PR-0001';
    const num = parseInt(maxNo.replace(/^(IND|PR)-/, ''), 10);
    return `PR-${String(num + 1).padStart(4, '0')}`;
  }

  async getIndentItems(indentId: number): Promise<IndentItem[]> {
    return await getDb().select().from(indentItems).where(eq(indentItems.indentId, indentId));
  }

  async replaceIndentItems(indentId: number, items: Omit<InsertIndentItem, 'indentId'>[]): Promise<IndentItem[]> {
    await getDb().delete(indentItems).where(eq(indentItems.indentId, indentId));
    if (items.length > 0) {
      return await getDb().insert(indentItems).values(items.map(item => ({ ...item, indentId }))).returning();
    }
    return [];
  }

  // Indent Approver Departments
  async getIndentApproverDepartments(): Promise<any[]> {
    const rows = await getDb().select().from(indentApproverDepartments);
    const results = [];
    for (const row of rows) {
      const [user] = await getDb().select().from(users).where(eq(users.id, row.userId));
      const [dept] = await getDb().select().from(departments).where(eq(departments.id, row.departmentId));
      if (user && dept) results.push({ ...row, user, department: dept });
    }
    return results;
  }

  async getMyIndentApproverDepartments(userId: number): Promise<number[]> {
    const rows = await getDb().select().from(indentApproverDepartments).where(eq(indentApproverDepartments.userId, userId));
    return rows.map(r => r.departmentId);
  }

  async setIndentApproverDepartments(userId: number, departmentIds: number[]): Promise<void> {
    await getDb().delete(indentApproverDepartments).where(eq(indentApproverDepartments.userId, userId));
    if (departmentIds.length > 0) {
      await getDb().insert(indentApproverDepartments).values(departmentIds.map(departmentId => ({ userId, departmentId })));
    }
  }

  async getTvDashboards(): Promise<TvDashboard[]> {
    return await getDb().select().from(tvDashboards).orderBy(tvDashboards.name);
  }

  async getTvDashboard(id: number): Promise<TvDashboard | undefined> {
    const [dashboard] = await getDb().select().from(tvDashboards).where(eq(tvDashboards.id, id));
    return dashboard;
  }

  async createTvDashboard(data: InsertTvDashboard): Promise<TvDashboard> {
    const [dashboard] = await getDb().insert(tvDashboards).values(data).returning();
    return dashboard;
  }

  async updateTvDashboard(id: number, updates: Partial<InsertTvDashboard>): Promise<TvDashboard> {
    const [dashboard] = await getDb().update(tvDashboards).set(updates).where(eq(tvDashboards.id, id)).returning();
    return dashboard;
  }

  async deleteTvDashboard(id: number): Promise<void> {
    await getDb().delete(tvDashboards).where(eq(tvDashboards.id, id));
  }

  async getTvDashboardKpis(dashboardId: number): Promise<TvDashboardKpi[]> {
    return await getDb().select().from(tvDashboardKpis).where(eq(tvDashboardKpis.dashboardId, dashboardId)).orderBy(tvDashboardKpis.sortOrder);
  }

  async createTvDashboardKpi(data: InsertTvDashboardKpi): Promise<TvDashboardKpi> {
    const [kpi] = await getDb().insert(tvDashboardKpis).values(data).returning();
    return kpi;
  }

  async updateTvDashboardKpi(id: number, updates: Partial<InsertTvDashboardKpi>): Promise<TvDashboardKpi> {
    const [kpi] = await getDb().update(tvDashboardKpis).set(updates).where(eq(tvDashboardKpis.id, id)).returning();
    return kpi;
  }

  async deleteTvDashboardKpi(id: number): Promise<void> {
    await getDb().delete(tvDashboardKpis).where(eq(tvDashboardKpis.id, id));
  }

  async getTvKpiValues(kpiIds: number[], periodType?: string, periodDate?: string): Promise<TvDashboardKpiValue[]> {
    if (kpiIds.length === 0) return [];
    const conditions = [sql`${tvDashboardKpiValues.kpiId} IN (${sql.join(kpiIds.map(id => sql`${id}`), sql`, `)})`];
    if (periodType) conditions.push(eq(tvDashboardKpiValues.periodType, periodType));
    if (periodDate) conditions.push(eq(tvDashboardKpiValues.periodDate, periodDate));
    return await getDb().select().from(tvDashboardKpiValues).where(and(...conditions));
  }

  async upsertTvKpiValues(values: InsertTvDashboardKpiValue[]): Promise<void> {
    for (const val of values) {
      const existing = await getDb().select().from(tvDashboardKpiValues)
        .where(and(
          eq(tvDashboardKpiValues.kpiId, val.kpiId),
          eq(tvDashboardKpiValues.periodType, val.periodType),
          eq(tvDashboardKpiValues.periodDate, val.periodDate),
        ));
      if (existing.length > 0) {
        await getDb().update(tvDashboardKpiValues)
          .set({ value: val.value, createdById: val.createdById })
          .where(eq(tvDashboardKpiValues.id, existing[0].id));
      } else {
        await getDb().insert(tvDashboardKpiValues).values(val);
      }
    }
  }

  async getTvDashboardVideos(dashboardId: number): Promise<TvDashboardVideo[]> {
    return await getDb().select().from(tvDashboardVideos).where(eq(tvDashboardVideos.dashboardId, dashboardId)).orderBy(tvDashboardVideos.sortOrder);
  }

  async createTvDashboardVideo(data: InsertTvDashboardVideo): Promise<TvDashboardVideo> {
    const [video] = await getDb().insert(tvDashboardVideos).values(data).returning();
    return video;
  }

  async updateTvDashboardVideo(id: number, updates: Partial<InsertTvDashboardVideo>): Promise<TvDashboardVideo> {
    const [video] = await getDb().update(tvDashboardVideos).set(updates).where(eq(tvDashboardVideos.id, id)).returning();
    return video;
  }

  async deleteTvDashboardVideo(id: number): Promise<void> {
    await getDb().delete(tvDashboardVideos).where(eq(tvDashboardVideos.id, id));
  }

  async getTvDashboardDisplay(id: number): Promise<any> {
    const dashboard = await this.getTvDashboard(id);
    if (!dashboard) return null;

    const kpis = await getDb().select().from(tvDashboardKpis)
      .where(and(eq(tvDashboardKpis.dashboardId, id), eq(tvDashboardKpis.isActive, true)))
      .orderBy(tvDashboardKpis.sortOrder);

    const kpiIds = kpis.map(k => k.id);
    let kpiValues: TvDashboardKpiValue[] = [];
    if (kpiIds.length > 0) {
      kpiValues = await getDb().select().from(tvDashboardKpiValues)
        .where(sql`${tvDashboardKpiValues.kpiId} IN (${sql.join(kpiIds.map(id => sql`${id}`), sql`, `)})`);
    }

    const videos = await getDb().select().from(tvDashboardVideos)
      .where(and(eq(tvDashboardVideos.dashboardId, id), eq(tvDashboardVideos.isActive, true)))
      .orderBy(tvDashboardVideos.sortOrder);

    let department = null;
    if (dashboard.departmentId) {
      const [dept] = await getDb().select().from(departments).where(eq(departments.id, dashboard.departmentId));
      department = dept || null;
    }

    return { ...dashboard, department, kpis, kpiValues, videos };
  }

  // Status Trackers
  async getTrackers(): Promise<(Tracker & { department?: Department })[]> {
    const rows = await getDb().select().from(trackers).orderBy(trackers.name);
    const depts = await getDb().select().from(departments);
    return rows.map(t => ({
      ...t,
      department: t.departmentId ? depts.find(d => d.id === t.departmentId) : undefined,
    }));
  }

  async getTracker(id: number): Promise<(Tracker & { department?: Department }) | undefined> {
    const [row] = await getDb().select().from(trackers).where(eq(trackers.id, id));
    if (!row) return undefined;
    let department: Department | undefined;
    if (row.departmentId) {
      const [dept] = await getDb().select().from(departments).where(eq(departments.id, row.departmentId));
      department = dept;
    }
    return { ...row, department };
  }

  async createTracker(data: InsertTracker): Promise<Tracker> {
    const [row] = await getDb().insert(trackers).values(data).returning();
    return row;
  }

  async updateTracker(id: number, updates: Partial<InsertTracker>): Promise<Tracker> {
    const [row] = await getDb().update(trackers).set(updates).where(eq(trackers.id, id)).returning();
    return row;
  }

  async deleteTracker(id: number): Promise<void> {
    await getDb().delete(trackers).where(eq(trackers.id, id));
  }

  async getTrackerItems(trackerId: number): Promise<TrackerItem[]> {
    return getDb().select().from(trackerItems)
      .where(eq(trackerItems.trackerId, trackerId))
      .orderBy(trackerItems.name);
  }

  async createTrackerItem(data: InsertTrackerItem): Promise<TrackerItem> {
    const [row] = await getDb().insert(trackerItems).values(data).returning();
    return row;
  }

  async updateTrackerItem(id: number, updates: Partial<InsertTrackerItem>): Promise<TrackerItem> {
    const [row] = await getDb().update(trackerItems).set(updates).where(eq(trackerItems.id, id)).returning();
    return row;
  }

  async deleteTrackerItem(id: number): Promise<void> {
    await getDb().delete(trackerItems).where(eq(trackerItems.id, id));
  }

  async getTrackerNotificationRules(trackerId: number): Promise<TrackerNotificationRule[]> {
    return getDb().select().from(trackerNotificationRules)
      .where(eq(trackerNotificationRules.trackerId, trackerId))
      .orderBy(trackerNotificationRules.id);
  }

  async getAllActiveTrackerNotificationRules(): Promise<(TrackerNotificationRule & { tracker: Tracker })[]> {
    const rules: TrackerNotificationRule[] = await getDb().select().from(trackerNotificationRules)
      .where(eq(trackerNotificationRules.isActive, true));
    if (rules.length === 0) return [];
    const trackerIds = Array.from(new Set(rules.map((r: TrackerNotificationRule) => r.trackerId)));
    const trackerRows: Tracker[] = await getDb().select().from(trackers)
      .where(sql`${trackers.id} IN (${sql.join(trackerIds.map((id: number) => sql`${id}`), sql`, `)})`);
    const combined = rules.map((r: TrackerNotificationRule) => ({
      ...r,
      tracker: trackerRows.find((t: Tracker) => t.id === r.trackerId)!,
    }));
    return combined.filter((r: TrackerNotificationRule & { tracker: Tracker }) => r.tracker);
  }

  async createTrackerNotificationRule(data: InsertTrackerNotificationRule): Promise<TrackerNotificationRule> {
    const [row] = await getDb().insert(trackerNotificationRules).values(data).returning();
    return row;
  }

  async updateTrackerNotificationRule(id: number, updates: Partial<TrackerNotificationRule>): Promise<TrackerNotificationRule> {
    const [row] = await getDb().update(trackerNotificationRules).set(updates).where(eq(trackerNotificationRules.id, id)).returning();
    return row;
  }

  async deleteTrackerNotificationRule(id: number): Promise<void> {
    await getDb().delete(trackerNotificationRules).where(eq(trackerNotificationRules.id, id));
  }

  // IT Operations Monitor
  async getItHostTypes(): Promise<ItHostType[]> {
    return getDb().select().from(itHostTypes).orderBy(itHostTypes.sortOrder, itHostTypes.slug);
  }

  async createItHostType(data: InsertItHostType): Promise<ItHostType> {
    const [row] = await getDb().insert(itHostTypes).values(data).returning();
    return row;
  }

  async updateItHostType(id: number, updates: Partial<InsertItHostType>): Promise<ItHostType> {
    const [row] = await getDb().update(itHostTypes).set(updates).where(eq(itHostTypes.id, id)).returning();
    return row;
  }

  async deleteItHostType(id: number): Promise<void> {
    await getDb().delete(itHostTypes).where(eq(itHostTypes.id, id));
  }

  async getItHosts(): Promise<ItMonitoredHost[]> {
    return getDb().select().from(itMonitoredHosts).orderBy(itMonitoredHosts.sortOrder, itMonitoredHosts.name);
  }

  async getItHost(id: number): Promise<ItMonitoredHost | undefined> {
    const [row] = await getDb().select().from(itMonitoredHosts).where(eq(itMonitoredHosts.id, id));
    return row;
  }

  async createItHost(data: InsertItMonitoredHost): Promise<ItMonitoredHost> {
    const [row] = await getDb().insert(itMonitoredHosts).values(data).returning();
    return row;
  }

  async updateItHost(id: number, updates: Partial<InsertItMonitoredHost>): Promise<ItMonitoredHost> {
    const [row] = await getDb().update(itMonitoredHosts).set(updates).where(eq(itMonitoredHosts.id, id)).returning();
    return row;
  }

  async deleteItHost(id: number): Promise<void> {
    await getDb().delete(itMonitoredHosts).where(eq(itMonitoredHosts.id, id));
  }

  async upsertItHostStatus(hostId: number, isOnline: boolean, responseTimeMs: number | null): Promise<void> {
    // Upsert: one current-status row per host (unique constraint on host_id)
    await getDb()
      .insert(itHostStatus)
      .values({ hostId, isOnline, responseTimeMs, checkedAt: new Date() })
      .onConflictDoUpdate({
        target: itHostStatus.hostId,
        set: { isOnline, responseTimeMs, checkedAt: new Date() },
      });
  }

  async getItHostsWithStatus(): Promise<ItHostWithStatus[]> {
    // it_host_status has a UNIQUE constraint on host_id (one current-status row per host)
    // so a LEFT JOIN is sufficient — no subquery needed
    const rows = await getDb()
      .select({
        id: itMonitoredHosts.id,
        name: itMonitoredHosts.name,
        ipAddress: itMonitoredHosts.ipAddress,
        hostType: itMonitoredHosts.hostType,
        isActive: itMonitoredHosts.isActive,
        sortOrder: itMonitoredHosts.sortOrder,
        notes: itMonitoredHosts.notes,
        departmentId: itMonitoredHosts.departmentId,
        statusId: itHostStatus.id,
        isOnline: itHostStatus.isOnline,
        responseTimeMs: itHostStatus.responseTimeMs,
        checkedAt: itHostStatus.checkedAt,
      })
      .from(itMonitoredHosts)
      .leftJoin(itHostStatus, eq(itHostStatus.hostId, itMonitoredHosts.id))
      .orderBy(itMonitoredHosts.sortOrder, itMonitoredHosts.name);

    return rows.map(r => ({
      id: r.id,
      name: r.name,
      ipAddress: r.ipAddress,
      hostType: r.hostType,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      notes: r.notes,
      departmentId: r.departmentId,
      status: r.statusId != null
        ? { id: r.statusId, isOnline: r.isOnline, responseTimeMs: r.responseTimeMs, checkedAt: r.checkedAt }
        : null,
    }));
  }

  async getItKpis(): Promise<ItKpi[]> {
    return getDb().select().from(itKpis).orderBy(itKpis.sortOrder, itKpis.name);
  }

  async createItKpi(data: InsertItKpi): Promise<ItKpi> {
    const [row] = await getDb().insert(itKpis).values(data).returning();
    return row;
  }

  async updateItKpi(id: number, updates: Partial<InsertItKpi>): Promise<ItKpi> {
    const [row] = await getDb().update(itKpis).set(updates).where(eq(itKpis.id, id)).returning();
    return row;
  }

  async deleteItKpi(id: number): Promise<void> {
    await getDb().delete(itKpis).where(eq(itKpis.id, id));
  }

  async getItKpiValues(periodType: string, periodDate: string): Promise<ItKpiValue[]> {
    return getDb()
      .select()
      .from(itKpiValues)
      .where(and(eq(itKpiValues.periodType, periodType), eq(itKpiValues.periodDate, periodDate)));
  }

  async upsertItKpiValues(values: InsertItKpiValue[]): Promise<void> {
    for (const v of values) {
      const existing = await getDb()
        .select()
        .from(itKpiValues)
        .where(and(
          eq(itKpiValues.kpiId, v.kpiId),
          eq(itKpiValues.periodType, v.periodType),
          eq(itKpiValues.periodDate, v.periodDate),
        ))
        .limit(1);
      
      if (existing.length > 0) {
        await getDb().update(itKpiValues).set({ value: v.value }).where(eq(itKpiValues.id, existing[0].id));
      } else {
        await getDb().insert(itKpiValues).values(v);
      }
    }
  }

  async getGlpiSettings(): Promise<GlpiSettings | undefined> {
    const rows = await getDb().select().from(glpiSettings).limit(1);
    return rows[0];
  }

  async upsertGlpiSettings(data: InsertGlpiSettings): Promise<GlpiSettings> {
    const existing = await getDb().select().from(glpiSettings).limit(1);
    if (existing.length > 0) {
      const [row] = await getDb().update(glpiSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(glpiSettings.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await getDb().insert(glpiSettings).values(data).returning();
    return row;
  }

  async updateGlpiSyncStatus(lastSyncAt: Date | null, lastError: string | null): Promise<void> {
    const existing = await getDb().select().from(glpiSettings).limit(1);
    if (existing.length > 0) {
      await getDb().update(glpiSettings)
        .set({ lastSyncAt, lastError, updatedAt: new Date() })
        .where(eq(glpiSettings.id, existing[0].id));
    }
  }

  // ── Hikvision NVR methods ────────────────────────────────────────────────
  async getHikvisionNvrs(): Promise<HikvisionNvr[]> {
    return getDb().select().from(hikvisionNvrs).orderBy(hikvisionNvrs.id);
  }

  async getHikvisionNvr(id: number): Promise<HikvisionNvr | undefined> {
    const rows = await getDb().select().from(hikvisionNvrs).where(eq(hikvisionNvrs.id, id));
    return rows[0];
  }

  async createHikvisionNvr(data: InsertHikvisionNvr): Promise<HikvisionNvr> {
    const [row] = await getDb().insert(hikvisionNvrs).values(data).returning();
    return row;
  }

  async updateHikvisionNvr(id: number, data: Partial<InsertHikvisionNvr>): Promise<HikvisionNvr> {
    const [row] = await getDb().update(hikvisionNvrs).set(data).where(eq(hikvisionNvrs.id, id)).returning();
    return row;
  }

  async deleteHikvisionNvr(id: number): Promise<void> {
    await getDb().delete(hikvisionNvrs).where(eq(hikvisionNvrs.id, id));
  }

  async updateHikvisionNvrStatus(id: number, data: { lastCameraTotal?: number | null; lastCameraOnline?: number | null; lastSyncedAt?: Date | null; lastError?: string | null }): Promise<void> {
    await getDb().update(hikvisionNvrs).set(data).where(eq(hikvisionNvrs.id, id));
  }

  async getHikvisionGlobalSettings(): Promise<HikvisionGlobalSettings | undefined> {
    const rows = await getDb().select().from(hikvisionGlobalSettings).limit(1);
    return rows[0];
  }

  async saveHikvisionGlobalSettings(data: InsertHikvisionGlobalSettings): Promise<HikvisionGlobalSettings> {
    const existing = await getDb().select().from(hikvisionGlobalSettings).limit(1);
    if (existing.length > 0) {
      const [row] = await getDb().update(hikvisionGlobalSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(hikvisionGlobalSettings.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await getDb().insert(hikvisionGlobalSettings).values(data).returning();
    return row;
  }

  async updateHikvisionGlobalSyncStatus(lastSyncAt: Date | null, lastError: string | null): Promise<void> {
    const existing = await getDb().select().from(hikvisionGlobalSettings).limit(1);
    if (existing.length > 0) {
      await getDb().update(hikvisionGlobalSettings)
        .set({ lastSyncAt, lastError, updatedAt: new Date() })
        .where(eq(hikvisionGlobalSettings.id, existing[0].id));
    }
  }

  // ── FortiGate bandwidth methods ──────────────────────────────────────────
  async getFortigateSettings(): Promise<FortigateSettings | undefined> {
    const rows = await getDb().select().from(fortigateSettings).limit(1);
    return rows[0];
  }

  async upsertFortigateSettings(data: InsertFortigateSettings): Promise<FortigateSettings> {
    const existing = await getDb().select().from(fortigateSettings).limit(1);
    if (existing.length > 0) {
      const [row] = await getDb().update(fortigateSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(fortigateSettings.id, existing[0].id))
        .returning();
      return row;
    }
    const [row] = await getDb().insert(fortigateSettings).values(data).returning();
    return row;
  }

  async updateFortigateSyncStatus(lastSyncAt: Date | null, lastError: string | null): Promise<void> {
    const existing = await getDb().select().from(fortigateSettings).limit(1);
    if (existing.length > 0) {
      await getDb().update(fortigateSettings)
        .set({ lastSyncAt, lastError, updatedAt: new Date() })
        .where(eq(fortigateSettings.id, existing[0].id));
    }
  }

  async insertFortigateBandwidth(rows: { interfaceName: string; txKbps: string; rxKbps: string }[]): Promise<void> {
    if (rows.length === 0) return;
    await getDb().insert(fortigateBandwidth).values(rows.map(r => ({
      interfaceName: r.interfaceName,
      txKbps: r.txKbps,
      rxKbps: r.rxKbps,
      sampledAt: new Date(),
    })));
  }

  async getFortigateBandwidth(hours: number = 1): Promise<FortigateBandwidth[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return getDb().select().from(fortigateBandwidth)
      .where(gte(fortigateBandwidth.sampledAt, since))
      .orderBy(fortigateBandwidth.sampledAt);
  }

  async pruneFortigateBandwidth(): Promise<void> {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await getDb().delete(fortigateBandwidth)
      .where(lt(fortigateBandwidth.sampledAt, cutoff));
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
  getMaintenanceTypeConfigs: () => getStorage().getMaintenanceTypeConfigs(),
  createMaintenanceTypeConfig: (...args: Parameters<DatabaseStorage['createMaintenanceTypeConfig']>) => getStorage().createMaintenanceTypeConfig(...args),
  updateMaintenanceTypeConfig: (...args: Parameters<DatabaseStorage['updateMaintenanceTypeConfig']>) => getStorage().updateMaintenanceTypeConfig(...args),
  deleteMaintenanceTypeConfig: (...args: Parameters<DatabaseStorage['deleteMaintenanceTypeConfig']>) => getStorage().deleteMaintenanceTypeConfig(...args),
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
  getVehicleTypes: () => getStorage().getVehicleTypes(),
  createVehicleType: (...args: Parameters<DatabaseStorage['createVehicleType']>) => getStorage().createVehicleType(...args),
  updateVehicleType: (...args: Parameters<DatabaseStorage['updateVehicleType']>) => getStorage().updateVehicleType(...args),
  deleteVehicleType: (...args: Parameters<DatabaseStorage['deleteVehicleType']>) => getStorage().deleteVehicleType(...args),
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
  getIndents: () => getStorage().getIndents(),
  getIndent: (...args: Parameters<DatabaseStorage['getIndent']>) => getStorage().getIndent(...args),
  createIndent: (...args: Parameters<DatabaseStorage['createIndent']>) => getStorage().createIndent(...args),
  updateIndent: (...args: Parameters<DatabaseStorage['updateIndent']>) => getStorage().updateIndent(...args),
  deleteIndent: (...args: Parameters<DatabaseStorage['deleteIndent']>) => getStorage().deleteIndent(...args),
  getNextIndentNo: () => getStorage().getNextIndentNo(),
  getIndentItems: (...args: Parameters<DatabaseStorage['getIndentItems']>) => getStorage().getIndentItems(...args),
  replaceIndentItems: (...args: Parameters<DatabaseStorage['replaceIndentItems']>) => getStorage().replaceIndentItems(...args),
  getIndentApproverDepartments: () => getStorage().getIndentApproverDepartments(),
  getMyIndentApproverDepartments: (...args: Parameters<DatabaseStorage['getMyIndentApproverDepartments']>) => getStorage().getMyIndentApproverDepartments(...args),
  setIndentApproverDepartments: (...args: Parameters<DatabaseStorage['setIndentApproverDepartments']>) => getStorage().setIndentApproverDepartments(...args),
  getTvDashboards: () => getStorage().getTvDashboards(),
  getTvDashboard: (...args: Parameters<DatabaseStorage['getTvDashboard']>) => getStorage().getTvDashboard(...args),
  createTvDashboard: (...args: Parameters<DatabaseStorage['createTvDashboard']>) => getStorage().createTvDashboard(...args),
  updateTvDashboard: (...args: Parameters<DatabaseStorage['updateTvDashboard']>) => getStorage().updateTvDashboard(...args),
  deleteTvDashboard: (...args: Parameters<DatabaseStorage['deleteTvDashboard']>) => getStorage().deleteTvDashboard(...args),
  getTvDashboardKpis: (...args: Parameters<DatabaseStorage['getTvDashboardKpis']>) => getStorage().getTvDashboardKpis(...args),
  createTvDashboardKpi: (...args: Parameters<DatabaseStorage['createTvDashboardKpi']>) => getStorage().createTvDashboardKpi(...args),
  updateTvDashboardKpi: (...args: Parameters<DatabaseStorage['updateTvDashboardKpi']>) => getStorage().updateTvDashboardKpi(...args),
  deleteTvDashboardKpi: (...args: Parameters<DatabaseStorage['deleteTvDashboardKpi']>) => getStorage().deleteTvDashboardKpi(...args),
  getTvKpiValues: (...args: Parameters<DatabaseStorage['getTvKpiValues']>) => getStorage().getTvKpiValues(...args),
  upsertTvKpiValues: (...args: Parameters<DatabaseStorage['upsertTvKpiValues']>) => getStorage().upsertTvKpiValues(...args),
  getTvDashboardVideos: (...args: Parameters<DatabaseStorage['getTvDashboardVideos']>) => getStorage().getTvDashboardVideos(...args),
  createTvDashboardVideo: (...args: Parameters<DatabaseStorage['createTvDashboardVideo']>) => getStorage().createTvDashboardVideo(...args),
  updateTvDashboardVideo: (...args: Parameters<DatabaseStorage['updateTvDashboardVideo']>) => getStorage().updateTvDashboardVideo(...args),
  deleteTvDashboardVideo: (...args: Parameters<DatabaseStorage['deleteTvDashboardVideo']>) => getStorage().deleteTvDashboardVideo(...args),
  getTvDashboardDisplay: (...args: Parameters<DatabaseStorage['getTvDashboardDisplay']>) => getStorage().getTvDashboardDisplay(...args),
  getTrackers: () => getStorage().getTrackers(),
  getTracker: (...args: Parameters<DatabaseStorage['getTracker']>) => getStorage().getTracker(...args),
  createTracker: (...args: Parameters<DatabaseStorage['createTracker']>) => getStorage().createTracker(...args),
  updateTracker: (...args: Parameters<DatabaseStorage['updateTracker']>) => getStorage().updateTracker(...args),
  deleteTracker: (...args: Parameters<DatabaseStorage['deleteTracker']>) => getStorage().deleteTracker(...args),
  getTrackerItems: (...args: Parameters<DatabaseStorage['getTrackerItems']>) => getStorage().getTrackerItems(...args),
  createTrackerItem: (...args: Parameters<DatabaseStorage['createTrackerItem']>) => getStorage().createTrackerItem(...args),
  updateTrackerItem: (...args: Parameters<DatabaseStorage['updateTrackerItem']>) => getStorage().updateTrackerItem(...args),
  deleteTrackerItem: (...args: Parameters<DatabaseStorage['deleteTrackerItem']>) => getStorage().deleteTrackerItem(...args),
  getTrackerNotificationRules: (...args: Parameters<DatabaseStorage['getTrackerNotificationRules']>) => getStorage().getTrackerNotificationRules(...args),
  getAllActiveTrackerNotificationRules: () => getStorage().getAllActiveTrackerNotificationRules(),
  createTrackerNotificationRule: (...args: Parameters<DatabaseStorage['createTrackerNotificationRule']>) => getStorage().createTrackerNotificationRule(...args),
  updateTrackerNotificationRule: (...args: Parameters<DatabaseStorage['updateTrackerNotificationRule']>) => getStorage().updateTrackerNotificationRule(...args),
  deleteTrackerNotificationRule: (...args: Parameters<DatabaseStorage['deleteTrackerNotificationRule']>) => getStorage().deleteTrackerNotificationRule(...args),
  getItHostTypes: () => getStorage().getItHostTypes(),
  createItHostType: (...args: Parameters<DatabaseStorage['createItHostType']>) => getStorage().createItHostType(...args),
  updateItHostType: (...args: Parameters<DatabaseStorage['updateItHostType']>) => getStorage().updateItHostType(...args),
  deleteItHostType: (...args: Parameters<DatabaseStorage['deleteItHostType']>) => getStorage().deleteItHostType(...args),
  getItHosts: () => getStorage().getItHosts(),
  getItHost: (...args: Parameters<DatabaseStorage['getItHost']>) => getStorage().getItHost(...args),
  createItHost: (...args: Parameters<DatabaseStorage['createItHost']>) => getStorage().createItHost(...args),
  updateItHost: (...args: Parameters<DatabaseStorage['updateItHost']>) => getStorage().updateItHost(...args),
  deleteItHost: (...args: Parameters<DatabaseStorage['deleteItHost']>) => getStorage().deleteItHost(...args),
  upsertItHostStatus: (...args: Parameters<DatabaseStorage['upsertItHostStatus']>) => getStorage().upsertItHostStatus(...args),
  getItHostsWithStatus: () => getStorage().getItHostsWithStatus(),
  getItKpis: () => getStorage().getItKpis(),
  createItKpi: (...args: Parameters<DatabaseStorage['createItKpi']>) => getStorage().createItKpi(...args),
  updateItKpi: (...args: Parameters<DatabaseStorage['updateItKpi']>) => getStorage().updateItKpi(...args),
  deleteItKpi: (...args: Parameters<DatabaseStorage['deleteItKpi']>) => getStorage().deleteItKpi(...args),
  getItKpiValues: (...args: Parameters<DatabaseStorage['getItKpiValues']>) => getStorage().getItKpiValues(...args),
  upsertItKpiValues: (...args: Parameters<DatabaseStorage['upsertItKpiValues']>) => getStorage().upsertItKpiValues(...args),
  getGlpiSettings: () => getStorage().getGlpiSettings(),
  upsertGlpiSettings: (...args: Parameters<DatabaseStorage['upsertGlpiSettings']>) => getStorage().upsertGlpiSettings(...args),
  updateGlpiSyncStatus: (...args: Parameters<DatabaseStorage['updateGlpiSyncStatus']>) => getStorage().updateGlpiSyncStatus(...args),
  getHikvisionNvrs: () => getStorage().getHikvisionNvrs(),
  getHikvisionNvr: (...args: Parameters<DatabaseStorage['getHikvisionNvr']>) => getStorage().getHikvisionNvr(...args),
  createHikvisionNvr: (...args: Parameters<DatabaseStorage['createHikvisionNvr']>) => getStorage().createHikvisionNvr(...args),
  updateHikvisionNvr: (...args: Parameters<DatabaseStorage['updateHikvisionNvr']>) => getStorage().updateHikvisionNvr(...args),
  deleteHikvisionNvr: (...args: Parameters<DatabaseStorage['deleteHikvisionNvr']>) => getStorage().deleteHikvisionNvr(...args),
  updateHikvisionNvrStatus: (...args: Parameters<DatabaseStorage['updateHikvisionNvrStatus']>) => getStorage().updateHikvisionNvrStatus(...args),
  getHikvisionGlobalSettings: () => getStorage().getHikvisionGlobalSettings(),
  saveHikvisionGlobalSettings: (...args: Parameters<DatabaseStorage['saveHikvisionGlobalSettings']>) => getStorage().saveHikvisionGlobalSettings(...args),
  updateHikvisionGlobalSyncStatus: (...args: Parameters<DatabaseStorage['updateHikvisionGlobalSyncStatus']>) => getStorage().updateHikvisionGlobalSyncStatus(...args),
  getFortigateSettings: () => getStorage().getFortigateSettings(),
  upsertFortigateSettings: (...args: Parameters<DatabaseStorage['upsertFortigateSettings']>) => getStorage().upsertFortigateSettings(...args),
  updateFortigateSyncStatus: (...args: Parameters<DatabaseStorage['updateFortigateSyncStatus']>) => getStorage().updateFortigateSyncStatus(...args),
  insertFortigateBandwidth: (...args: Parameters<DatabaseStorage['insertFortigateBandwidth']>) => getStorage().insertFortigateBandwidth(...args),
  getFortigateBandwidth: (...args: Parameters<DatabaseStorage['getFortigateBandwidth']>) => getStorage().getFortigateBandwidth(...args),
  pruneFortigateBandwidth: () => getStorage().pruneFortigateBandwidth(),
  get sessionStore() { return getStorage().sessionStore; },
};
