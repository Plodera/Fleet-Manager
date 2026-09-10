import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import http from "http";
import request from "supertest";

const { authState, sendTestEmailMock } = vi.hoisted(() => ({
  authState: {
    authenticated: false,
    user: undefined as { id: number; role: string; permissions: string[] } | undefined,
  },
  sendTestEmailMock: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: {
    getUsers: vi.fn().mockResolvedValue([{ id: 1 }]),
    getVehicles: vi.fn().mockResolvedValue([]),
    getBookings: vi.fn().mockResolvedValue([]),
    getMaintenanceRecords: vi.fn().mockResolvedValue([]),
    getTrackers: vi.fn().mockResolvedValue([]),
  },
}));

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
  sendTestEmail: sendTestEmailMock,
  getMicrosoftGraphStatus: vi.fn(),
}));

vi.mock("./trackerNotifications", () => ({
  scheduleTrackerNotifications: vi.fn(),
  runChecksForTracker: vi.fn().mockResolvedValue(0),
}));

vi.mock("./licenseExpiryNotifications", () => ({
  scheduleLicenseExpiryNotifications: vi.fn(),
  runLicenseExpiryChecks: vi.fn().mockResolvedValue(0),
}));

describe("POST /api/settings/email/test", () => {
  let app: express.Express;
  let server: http.Server;

  beforeAll(async () => {
    app = express();
    server = http.createServer(app);
    const { registerRoutes } = await import("./routes");
    await registerRoutes(server, app);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    authState.authenticated = true;
    authState.user = { id: 1, role: "admin", permissions: [] };
  });

  afterAll(() => {
    server.close();
  });

  it("requires authentication", async () => {
    authState.authenticated = false;
    authState.user = undefined;

    const response = await request(app)
      .post("/api/settings/email/test")
      .send({ email: "recipient@example.com" });

    expect(response.status).toBe(401);
    expect(response.text).toBe("Unauthorized");
    expect(sendTestEmailMock).not.toHaveBeenCalled();
  });

  it("requires an admin user", async () => {
    authState.user = { id: 2, role: "user", permissions: [] };

    const response = await request(app)
      .post("/api/settings/email/test")
      .send({ email: "recipient@example.com" });

    expect(response.status).toBe(401);
    expect(response.text).toBe("Unauthorized");
    expect(sendTestEmailMock).not.toHaveBeenCalled();
  });

  it("returns a successful provider result", async () => {
    sendTestEmailMock.mockResolvedValueOnce({ success: true });

    const response = await request(app)
      .post("/api/settings/email/test")
      .send({ email: "recipient@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(sendTestEmailMock).toHaveBeenCalledWith("recipient@example.com");
  });

  it("returns provider failure details without hiding them", async () => {
    sendTestEmailMock.mockResolvedValueOnce({
      success: false,
      error: "Insufficient privileges to complete the operation.",
    });

    const response = await request(app)
      .post("/api/settings/email/test")
      .send({ email: "recipient@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: false,
      error: "Insufficient privileges to complete the operation.",
    });
  });

  it("returns the documented failure shape when the provider throws", async () => {
    sendTestEmailMock.mockRejectedValueOnce(new Error("Microsoft Graph is unavailable"));

    const response = await request(app)
      .post("/api/settings/email/test")
      .send({ email: "recipient@example.com" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      message: "Microsoft Graph is unavailable",
    });
  });
});