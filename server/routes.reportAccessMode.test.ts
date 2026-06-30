import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import express from "express";
import http from "http";
import request from "supertest";

vi.mock("./storage", () => {
  const mockStorage = {
    getMachineStatus: vi.fn(),
    createMachineRecord: vi.fn(),
    updateFactoryMachine: vi.fn(),
    getUsers: vi.fn().mockResolvedValue([{ id: 1 }]),
    getVehicles: vi.fn().mockResolvedValue([]),
    getBookings: vi.fn().mockResolvedValue([]),
    getMaintenanceRecords: vi.fn().mockResolvedValue([]),
    getTrackers: vi.fn().mockResolvedValue([]),
  };
  return { storage: mockStorage };
});

let _testIsAuthenticated = false;

vi.mock("./auth", () => ({
  setupAuth: (app: express.Express) => {
    app.use(express.json());
    app.use((req: any, _res: any, next: any) => {
      req.isAuthenticated = () => _testIsAuthenticated;
      req.user = _testIsAuthenticated
        ? { id: 1, role: "admin", permissions: [] }
        : undefined;
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
}));

vi.mock("./trackerNotifications", () => ({
  scheduleTrackerNotifications: vi.fn(),
  runChecksForTracker: vi.fn().mockResolvedValue(0),
}));

async function buildApp() {
  const app = express();
  const server = http.createServer(app);
  const { registerRoutes } = await import("./routes");
  await registerRoutes(server, app);
  return { app, server };
}

describe("POST /api/machine-status/:slug/report — access mode enforcement", () => {
  let app: express.Express;
  let server: http.Server;

  beforeAll(async () => {
    _testIsAuthenticated = false;
    ({ app, server } = await buildApp());
  });

  afterAll(() => {
    server.close();
  });

  it("returns 403 when reportAccessMode is 'disabled'", async () => {
    const { storage } = await import("./storage");
    (storage.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      machine: { id: 1, name: "Test Machine", reportAccessMode: "disabled" },
      records: [],
    });

    const res = await request(app)
      .post("/api/machine-status/test-slug/report")
      .send({ recordType: "maintenance", description: "Oil change" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/disabled/i);
  });

  it("returns 401 when reportAccessMode is 'login_required' and request is unauthenticated", async () => {
    const { storage } = await import("./storage");
    (storage.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      machine: { id: 1, name: "Test Machine", reportAccessMode: "login_required" },
      records: [],
    });

    const res = await request(app)
      .post("/api/machine-status/test-slug/report")
      .send({ recordType: "maintenance", description: "Oil change" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/logged in/i);
  });

  it("returns 201 when reportAccessMode is 'public' and request is unauthenticated", async () => {
    const { storage } = await import("./storage");
    (storage.getMachineStatus as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      machine: { id: 1, name: "Test Machine", reportAccessMode: "public", breakdownAlertRecipients: [] },
      records: [],
    });
    (storage.createMachineRecord as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 42,
      machineId: 1,
      recordType: "maintenance",
      description: "Oil change",
      date: "2026-06-30",
      performedBy: null,
      nextMaintenanceDate: null,
      createdById: null,
    });

    const res = await request(app)
      .post("/api/machine-status/test-slug/report")
      .send({ recordType: "maintenance", description: "Oil change" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 42, recordType: "maintenance" });
  });
});

describe("PATCH /api/factory-machines/:id/report-access — validation", () => {
  let app: express.Express;
  let server: http.Server;

  beforeAll(async () => {
    _testIsAuthenticated = true;
    ({ app, server } = await buildApp());
  });

  afterAll(() => {
    server.close();
    _testIsAuthenticated = false;
  });

  it("returns 400 when reportAccessMode value is not a valid enum member", async () => {
    const res = await request(app)
      .patch("/api/factory-machines/1/report-access")
      .send({ reportAccessMode: "invalid_mode" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when reportAccessMode field is missing from the body", async () => {
    const res = await request(app)
      .patch("/api/factory-machines/1/report-access")
      .send({});

    expect(res.status).toBe(400);
  });
});
