import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import http from "http";
import request from "supertest";

const { authState, state, storageMock } = vi.hoisted(() => {
  const state = {
    vehicles: [] as any[],
    imports: [] as any[],
    importRows: [] as any[],
    undoAttempts: [] as any[],
    undoAttemptRows: [] as any[],
    nextVehicleId: 1,
    nextImportId: 1,
    nextUndoAttemptId: 1,
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
    getVehicle: vi.fn(async (id: number) => state.vehicles.find((vehicle: any) => vehicle.id === id)),
    getVehicleComplianceImport: vi.fn(async (id: number) => {
      const imported = state.imports.find((candidate: any) => candidate.id === id);
      if (!imported) return undefined;
      const attempts = state.undoAttempts
        .filter((attempt: any) => attempt.importId === id)
        .map((attempt: any) => ({ ...attempt, rows: state.undoAttemptRows.filter((row: any) => row.attemptId === attempt.id) }));
      return { import: imported, rows: state.importRows.filter((row: any) => row.importId === id), undoAttempts: attempts };
    }),
    beginVehicleComplianceImportUndo: vi.fn(async (id: number, actorId: number, actorName: string) => {
      const imported = state.imports.find((candidate: any) => candidate.id === id);
      if (!imported || imported.undoStatus) return false;
      Object.assign(imported, { undoStatus: "in_progress", undoAt: new Date(), undoActorId: actorId, undoActorName: actorName });
      return true;
    }),
    beginVehicleComplianceImportUndoRetry: vi.fn(async (id: number, actorId: number, actorName: string) => {
      const imported = state.imports.find((candidate: any) => candidate.id === id);
      if (!imported || imported.undoStatus !== "partial") return undefined;
      imported.undoStatus = "in_progress";
      const attempt = { id: state.nextUndoAttemptId++, importId: id, actorId, actorName, startedAt: new Date(), status: "in_progress" };
      state.undoAttempts.push(attempt);
      return attempt;
    }),
    createVehicleComplianceImportUndoAttempt: vi.fn(async (input: any) => {
      const attempt = { id: state.nextUndoAttemptId++, startedAt: new Date(), status: "in_progress", ...input };
      state.undoAttempts.push(attempt);
      return attempt;
    }),
    createVehicleComplianceImportUndoAttemptRow: vi.fn(async (input: any) => {
      const record = { id: state.undoAttemptRows.length + 1, ...input };
      state.undoAttemptRows.push(record);
      return record;
    }),
    completeVehicleComplianceImportUndoAttempt: vi.fn(async (id: number, status: string) => {
      const attempt = state.undoAttempts.find((candidate: any) => candidate.id === id);
      Object.assign(attempt, { status, completedAt: new Date() });
    }),
    updateVehicleComplianceImportUndo: vi.fn(async (id: number, actorId: number, actorName: string, status: string) => {
      const imported = state.imports.find((candidate: any) => candidate.id === id);
      Object.assign(imported, { undoStatus: status, undoAt: new Date(), undoActorId: actorId, undoActorName: actorName });
    }),
    completeVehicleComplianceImportUndoRetry: vi.fn(async (id: number, attemptId: number, status: string) => {
      const imported = state.imports.find((candidate: any) => candidate.id === id);
      imported.undoStatus = status;
      const attempt = state.undoAttempts.find((candidate: any) => candidate.id === attemptId);
      Object.assign(attempt, { status, completedAt: new Date() });
    }),
    updateVehicleComplianceImportRowUndo: vi.fn(async (id: number, status: string, warning?: string, skippedFields?: string[]) => {
      const row = state.importRows.find((candidate: any) => candidate.id === id);
      Object.assign(row, { undoStatus: status, undoWarning: warning || null, undoSkippedFields: skippedFields?.length ? skippedFields : null });
    }),
    updateVehicleIfUnchanged: vi.fn(async (id: number, updates: Record<string, unknown>, afterValues: Record<string, unknown>) => {
      const vehicle = state.vehicles.find((candidate: any) => candidate.id === id);
      if (!vehicle || Object.keys(updates).some(field => (vehicle[field] ?? null) !== (afterValues[field] ?? null))) return false;
      Object.assign(vehicle, updates);
      return true;
    }),
    deleteVehicleIfUnchanged: vi.fn(async (id: number, afterValues: Record<string, unknown>) => {
      const index = state.vehicles.findIndex((candidate: any) => candidate.id === id);
      const vehicle = state.vehicles[index];
      if (!vehicle || Object.keys(afterValues).some(field => (vehicle[field] ?? null) !== (afterValues[field] ?? null))) return false;
      state.vehicles.splice(index, 1);
      return true;
    }),
    recordVehicleComplianceImportUndoRetryOutcome: vi.fn(async (input: any) => {
      const row = state.importRows.find((candidate: any) => candidate.id === input.importRowId);
      Object.assign(row, { undoStatus: input.status, undoWarning: input.warning || null, undoSkippedFields: input.skippedFields.length ? input.skippedFields : null });
      state.undoAttemptRows.push({ id: state.undoAttemptRows.length + 1, ...input });
    }),
    retryVehicleComplianceImportUndoUpdate: vi.fn(async (input: any) => {
      const vehicle = state.vehicles.find((candidate: any) => candidate.id === input.vehicleId);
      if (!vehicle || Object.keys(input.updates).some(field => (vehicle[field] ?? null) !== (input.afterValues[field] ?? null))) return false;
      Object.assign(vehicle, input.updates);
      const row = state.importRows.find((candidate: any) => candidate.id === input.importRowId);
      Object.assign(row, { undoStatus: input.status, undoWarning: input.warning || null, undoSkippedFields: input.skippedFields.length ? input.skippedFields : null });
      state.undoAttemptRows.push({ id: state.undoAttemptRows.length + 1, ...input });
      return true;
    }),
    retryVehicleComplianceImportUndoDelete: vi.fn(async (input: any) => {
      const index = state.vehicles.findIndex((candidate: any) => candidate.id === input.vehicleId);
      const vehicle = state.vehicles[index];
      if (!vehicle || Object.keys(input.afterValues).some(field => (vehicle[field] ?? null) !== (input.afterValues[field] ?? null))) return false;
      state.vehicles.splice(index, 1);
      const row = state.importRows.find((candidate: any) => candidate.id === input.importRowId);
      Object.assign(row, { undoStatus: "deleted", undoWarning: null, undoSkippedFields: null });
      state.undoAttemptRows.push({ id: state.undoAttemptRows.length + 1, ...input, restoredFields: [], skippedFields: [] });
      return true;
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
  state.undoAttempts = [];
  state.undoAttemptRows = [];
  state.nextVehicleId = 1;
  state.nextImportId = 1;
  state.nextUndoAttemptId = 1;
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

  it("accepts blank optional date cells during preview", async () => {
    const preview = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{
        rowNumber: 2,
        licensePlate: "DATE-BLANK-1",
        make: "New",
        model: "Vehicle",
        ownershipExpiryDate: "",
        insuranceExpiryDate: "",
        ivmExpiryDate: "",
      }], { mode: "preview" }));

    expect(preview.status).toBe(200);
    expect(preview.body.summary).toEqual({ total: 1, create: 1, update: 0, error: 0 });
  });

  it("identifies the spreadsheet row and column for invalid date payloads", async () => {
    const preview = await request(app)
      .post("/api/vehicle-compliance/import")
      .send(importPayload([{
        rowNumber: 19,
        licensePlate: "DATE-ERROR-1",
        make: "New",
        model: "Vehicle",
        insuranceExpiryDate: "30/03/2027",
      }], { mode: "preview" }));

    expect(preview.status).toBe(400);
    expect(preview.body.message).toBe("Insurance Expiration Date in spreadsheet row 19 must use YYYY-MM-DD or be blank");
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

describe("POST /api/vehicle-compliance/import-history/:id/undo/retry", () => {
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

  it("retries only selected skipped fields and records a separate durable outcome", async () => {
    const originalUndoAt = new Date("2026-09-10T08:00:00.000Z");
    state.vehicles.push(existingVehicle({ id: 7, color: "Blue", insuranceNumber: "Changed later" }));
    state.imports.push({
      id: 1,
      sourceFilename: "compliance.xlsx",
      actorName: "Import Admin",
      options: {},
      undoStatus: "partial",
      undoAt: originalUndoAt,
      undoActorName: "First Admin",
    });
    state.importRows.push({
      id: 11,
      importId: 1,
      rowNumber: 2,
      vehicleId: 7,
      auditedVehicleId: 7,
      action: "update",
      success: true,
      beforeValues: { color: "Red", insuranceNumber: "POLICY-1" },
      afterValues: { color: "Blue", insuranceNumber: "POLICY-2" },
      changedFields: ["color", "insuranceNumber"],
      undoStatus: "partial",
      undoWarning: "Skipped conflicting fields: color",
      undoSkippedFields: ["color"],
    });

    const response = await request(app)
      .post("/api/vehicle-compliance/import-history/1/undo/retry")
      .send({ rows: [{ rowId: 11, fields: ["color"] }] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      restored: [{ rowNumber: 2, fields: ["color"] }],
      deleted: [],
      skipped: [],
      status: "completed",
    });
    expect(state.vehicles[0]).toMatchObject({ color: "Red", insuranceNumber: "Changed later" });
    expect(state.importRows[0]).toMatchObject({
      beforeValues: { color: "Red", insuranceNumber: "POLICY-1" },
      afterValues: { color: "Blue", insuranceNumber: "POLICY-2" },
      undoStatus: "restored",
      undoSkippedFields: null,
    });
    expect(state.imports[0]).toMatchObject({ undoStatus: "completed", undoAt: originalUndoAt, undoActorName: "First Admin" });
    expect(state.undoAttempts).toHaveLength(1);
    expect(state.undoAttemptRows).toEqual([expect.objectContaining({
      importRowId: 11,
      attemptedFields: ["color"],
      restoredFields: ["color"],
      skippedFields: [],
      status: "restored",
    })]);
  });

  it("does not retry fields that are not still skipped", async () => {
    state.imports.push({ id: 1, sourceFilename: "compliance.xlsx", actorName: "Import Admin", options: {}, undoStatus: "partial" });
    state.importRows.push({
      id: 11, importId: 1, rowNumber: 2, vehicleId: 7, action: "update", success: true,
      beforeValues: { color: "Red", insuranceNumber: "POLICY-1" },
      afterValues: { color: "Blue", insuranceNumber: "POLICY-2" },
      changedFields: ["color", "insuranceNumber"],
      undoStatus: "partial", undoSkippedFields: ["color"],
    });

    const response = await request(app)
      .post("/api/vehicle-compliance/import-history/1/undo/retry")
      .send({ rows: [{ rowId: 11, fields: ["insuranceNumber"] }] });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "A selected row or field is no longer retryable" });
    expect(storageMock.beginVehicleComplianceImportUndoRetry).not.toHaveBeenCalled();
  });

  it("retries a skipped created vehicle as a complete row and records its deletion", async () => {
    state.vehicles.push(existingVehicle({ id: 7, make: "Imported", model: "Vehicle", color: "Blue" }));
    state.imports.push({ id: 1, sourceFilename: "compliance.xlsx", actorName: "Import Admin", options: {}, undoStatus: "partial" });
    state.importRows.push({
      id: 12, importId: 1, rowNumber: 3, vehicleId: 7, auditedVehicleId: 7, action: "create", success: true,
      beforeValues: {}, afterValues: { make: "Imported", model: "Vehicle", color: "Blue" },
      changedFields: ["make", "model", "color"],
      undoStatus: "skipped", undoSkippedFields: ["make", "model", "color"],
    });

    const response = await request(app)
      .post("/api/vehicle-compliance/import-history/1/undo/retry")
      .send({ rows: [{ rowId: 12, fields: ["make", "model", "color"] }] });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      restored: [],
      deleted: [{ rowNumber: 3 }],
      skipped: [],
      status: "completed",
    });
    expect(state.vehicles).toHaveLength(0);
    expect(state.importRows[0]).toMatchObject({ undoStatus: "deleted", undoSkippedFields: null });
    expect(state.undoAttemptRows).toEqual([expect.objectContaining({
      importRowId: 12,
      attemptedFields: ["make", "model", "color"],
      restoredFields: [],
      skippedFields: [],
      status: "deleted",
    })]);
  });
});