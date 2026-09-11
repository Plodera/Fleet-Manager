import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import http from "http";
import request from "supertest";

const { authState, state, storageMock } = vi.hoisted(() => {
  const state = {
    vehicles: [] as any[],
    imports: [] as any[],
    importRows: [] as any[],
    nextVehicleId: 1,
    nextImportId: 1,
  };
  const storageMock = {
    getUsers: vi.fn().mockResolvedValue([{ id: 1 }]),
    getVehicles: vi.fn(async () => state.vehicles),
    getBookings: vi.fn().mockResolvedValue([]),
    getMaintenanceRecords: vi.fn().mockResolvedValue([]),
    getTrackers: vi.fn().mockResolvedValue([]),
    createVehicleComplianceImport: vi.fn(async (input: any) => {
      const record = { id: state.nextImportId++, ...input };
      state.imports.push(record);
      return record;
    }),
    createVehicleComplianceImportRow: vi.fn(async (input: any) => {
      const record = { id: state.importRows.length + 1, ...input };
      state.importRows.push(record);
      return record;
    }),
    applyVehicleComplianceImportUpdate: vi.fn(async ({ vehicleId, updates }: any) => {
      const vehicle = state.vehicles.find((candidate: any) => candidate.id === vehicleId);
      if (!vehicle) throw new Error("Vehicle no longer exists");
      Object.assign(vehicle, updates);
      return { vehicle, changedFields: Object.keys(updates) };
    }),
    applyVehicleComplianceImportCreate: vi.fn(async ({ vehicle }: any) => {
      const created = { id: state.nextVehicleId++, ...vehicle };
      state.vehicles.push(created);
      return created;
    }),
  };
  return {
    authState: {
      authenticated: true,
      user: { id: 1, fullName: "Import Admin", role: "admin", permissions: [] as string[] } as any,
    },
    state,
    storageMock,
  };
});

vi.mock("./storage", () => ({ storage: storageMock }));

vi.mock("./auth", () => ({
  setupAuth: (app: express.Express) => {
    app.use(express.json());
    app.use((req: any, _res: any, next: any) => {
      req.isAuthenticated = () => authState.authenticated;
      req.user = authState.user;
      next();
    });
  },
  validateSession: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("./email", () => ({
  sendBookingNotification: vi.fn(),
  sendBookingStatusUpdate: vi.fn(),
  sendTripStatusToApprover: vi.fn(),
  sendBreakdownAlertEmail: vi.fn(),
  getEmailDeliveryHealth: vi.fn(),
}));

vi.mock("./trackerNotifications", () => ({
  scheduleTrackerNotifications: vi.fn(),
  runChecksForTracker: vi.fn().mockResolvedValue(0),
}));

vi.mock("./licenseExpiryNotifications", () => ({
  scheduleLicenseExpiryNotifications: vi.fn(),
  runLicenseExpiryChecks: vi.fn().mockResolvedValue(0),
}));

function resetState() {
  state.vehicles = [];
  state.imports = [];
  state.importRows = [];
  state.nextVehicleId = 1;
  state.nextImportId = 1;
  vi.clearAllMocks();
  storageMock.getUsers.mockResolvedValue([{ id: 1 }]);
  storageMock.getBookings.mockResolvedValue([]);
  storageMock.getMaintenanceRecords.mockResolvedValue([]);
  storageMock.getTrackers.mockResolvedValue([]);
  authState.authenticated = true;
  authState.user = { id: 1, fullName: "Import Admin", role: "admin", permissions: [] };
}

function existingVehicle(overrides: Record<string, unknown> = {}) {
  return {
    id: state.nextVehicleId++,
    make: "Existing",
    model: "Vehicle",
    year: 2024,
    licensePlate: "EX-100",
    vin: null,
    status: "available",
    currentMileage: 0,
    imageUrl: null,
    category: "car",
    capacity: 5,
    color: "Blue",
    insuranceNumber: "POLICY-1",
    ...overrides,
  };
}

function importPayload(rows: unknown[], options: Record<string, unknown> = {}) {
  return {
    mode: "apply",
    createUnmatched: true,
    replaceBlanks: false,
    sourceFilename: "compliance.xlsx",
    rows,
    ...options,
  };
}

describe("POST /api/vehicle-compliance/import", () => {
  let app: express.Express;
  let server: http.Server;

  beforeAll(async () => {
    app = express();
    server = http.createServer(app);
    const { registerRoutes } = await import("./routes");
    await registerRoutes(server, app);
  });

  beforeEach(resetState);

  afterAll(() => {
    server.close();
  });

  it("rejects unauthenticated and non-admin imports before accessing import data", async () => {
    authState.authenticated = false;
    authState.user = undefined;
    const unauthenticated = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{ rowNumber: 2, licensePlate: "NEW-1", make: "New", model: "Vehicle" }]));

    expect(unauthenticated.status).toBe(401);
    expect(storageMock.getVehicles).not.toHaveBeenCalled();

    authState.authenticated = true;
    authState.user = { id: 2, fullName: "Regular User", role: "staff", permissions: ["manage_vehicles"] };
    const nonAdmin = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{ rowNumber: 2, licensePlate: "NEW-1", make: "New", model: "Vehicle" }]));

    expect(nonAdmin.status).toBe(403);
    expect(nonAdmin.body).toEqual({ message: "Admin only" });
    expect(storageMock.getVehicles).not.toHaveBeenCalled();
    expect(storageMock.createVehicleComplianceImport).not.toHaveBeenCalled();
  });

  it("keeps preview classifications consistent with mixed apply results", async () => {
    state.vehicles.push(existingVehicle({ id: 7, licensePlate: "UP-100", color: "Blue" }));
    state.nextVehicleId = 8;
    const rows = [
      { rowNumber: 2, licensePlate: "up 100", color: "Green" },
      { rowNumber: 3, licensePlate: "NEW-200", make: "New", model: "Van", vehicleTypeLabel: "Cargo van" },
      { rowNumber: 4, licensePlate: "", make: "Broken", model: "Row" },
    ];

    const preview = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload(rows, { mode: "preview" }));
    const applied = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload(rows));

    expect(preview.status).toBe(200);
    expect(preview.body.summary).toEqual({ total: 3, create: 1, update: 1, error: 1 });
    expect(preview.body.rows.map((row: any) => [row.rowNumber, row.action])).toEqual([
      [2, "update"],
      [3, "create"],
      [4, "error"],
    ]);
    expect(preview.body.rows[0]).toMatchObject({ vehicleId: 7, messages: [] });
    expect(preview.body.rows[2].messages).toContain("Vehicle Plate is required");

    expect(applied.status).toBe(200);
    expect(applied.body.summary).toEqual({ total: 3, create: 1, update: 1, error: 1, applied: 2, failed: 1 });
    expect(applied.body.results).toEqual([
      { rowNumber: 2, action: "update", success: true, vehicleId: 7 },
      { rowNumber: 3, action: "create", success: true, vehicleId: 8 },
      expect.objectContaining({ rowNumber: 4, action: "error", success: false, message: "Vehicle Plate is required" }),
    ]);
    expect(state.vehicles).toHaveLength(2);
    expect(state.vehicles[0].color).toBe("Green");
    expect(state.vehicles[1]).toMatchObject({ licensePlate: "NEW-200", category: "van" });
    expect(state.importRows).toContainEqual(expect.objectContaining({
      rowNumber: 4,
      action: "error",
      success: false,
      message: "Vehicle Plate is required",
    }));
  });

  it("updates an existing plate on a repeat import instead of creating a duplicate", async () => {
    const first = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{ rowNumber: 2, licensePlate: "repeat-10", make: "First", model: "Import", color: "Red" }]));
    const second = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{ rowNumber: 2, licensePlate: "REPEAT 10", color: "Black" }]));

    expect(first.body.results).toEqual([{ rowNumber: 2, action: "create", success: true, vehicleId: 1 }]);
    expect(second.body.results).toEqual([{ rowNumber: 2, action: "update", success: true, vehicleId: 1 }]);
    expect(state.vehicles).toHaveLength(1);
    expect(state.vehicles[0]).toMatchObject({
      id: 1,
      licensePlate: "REPEAT-10",
      make: "First",
      model: "Import",
      color: "Black",
    });
    expect(storageMock.applyVehicleComplianceImportCreate).toHaveBeenCalledTimes(1);
    expect(storageMock.applyVehicleComplianceImportUpdate).toHaveBeenCalledTimes(1);
  });

  it("preserves blank fields by default and persists null replacements when requested", async () => {
    state.vehicles.push(existingVehicle({
      licensePlate: "BLANK-10",
      color: "Orange",
      insuranceNumber: "POLICY-10",
      insurancePolicyNumber: "INSURED-10",
    }));
    const blankRow = {
      rowNumber: 2,
      licensePlate: "blank 10",
      make: "",
      model: "",
      color: "",
      insuranceNumber: "",
      insurancePolicyNumber: " ",
    };

    const preserve = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([blankRow]));
    expect(preserve.status).toBe(200);
    expect(state.vehicles[0]).toMatchObject({
      make: "Existing",
      model: "Vehicle",
      color: "Orange",
      insuranceNumber: "POLICY-10",
      insurancePolicyNumber: "INSURED-10",
    });

    const replace = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([blankRow], { replaceBlanks: true }));
    expect(replace.status).toBe(200);
    expect(replace.body.results).toEqual([{ rowNumber: 2, action: "update", success: true, vehicleId: 1 }]);
    expect(state.vehicles[0]).toMatchObject({
      make: "Existing",
      model: "Vehicle",
      color: null,
      insuranceNumber: null,
      insurancePolicyNumber: null,
    });
  });
});