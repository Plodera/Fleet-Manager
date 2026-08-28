import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./storage", () => ({
  storage: {
    getVehicles: vi.fn(),
    getDrivers: vi.fn(),
    getCompanyDocuments: vi.fn(),
    getExpiryNotificationRules: vi.fn(),
    getUsers: vi.fn(),
    resolveObsoleteExpiryNotifications: vi.fn(),
    claimExpiryNotificationDelivery: vi.fn(),
    completeExpiryNotificationDelivery: vi.fn(),
    getExpiryNotificationForAlert: vi.fn(),
    createExpiryNotification: vi.fn(),
  },
}));

vi.mock("./email", () => ({
  sendEmail: vi.fn(),
}));

import { storage } from "./storage";
import { sendEmail } from "./email";
import { runLicenseExpiryChecks } from "./licenseExpiryNotifications";

const storageMock = storage as unknown as {
  getVehicles: ReturnType<typeof vi.fn>;
  getDrivers: ReturnType<typeof vi.fn>;
  getCompanyDocuments: ReturnType<typeof vi.fn>;
  getExpiryNotificationRules: ReturnType<typeof vi.fn>;
  getUsers: ReturnType<typeof vi.fn>;
  resolveObsoleteExpiryNotifications: ReturnType<typeof vi.fn>;
  claimExpiryNotificationDelivery: ReturnType<typeof vi.fn>;
  completeExpiryNotificationDelivery: ReturnType<typeof vi.fn>;
  getExpiryNotificationForAlert: ReturnType<typeof vi.fn>;
  createExpiryNotification: ReturnType<typeof vi.fn>;
};
const sendEmailMock = sendEmail as unknown as ReturnType<typeof vi.fn>;

const vehicle = {
  id: 10,
  make: "Ford",
  model: "Transit",
  licensePlate: "ABC-123",
  licenseExpiryDate: "2026-09-27",
};

const user = {
  id: 1,
  fullName: "Fleet Admin",
  email: "admin@example.com",
};

function rule(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    entityType: "vehicle_license",
    triggerType: "expiry_approaching",
    thresholdDays: 30,
    sendEmail: false,
    sendInApp: true,
    isActive: true,
    recipients: [{ userId: user.id }],
    ...overrides,
  };
}

function deliveryKey(data: {
  ruleId: number;
  entityType: string;
  entityId: number;
  recipientKey: string;
  channel: string;
  deliveryDate: string;
}) {
  return [
    data.ruleId,
    data.entityType,
    data.entityId,
    data.recipientKey,
    data.channel,
    data.deliveryDate,
  ].join(":");
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-28T12:00:00Z"));
  vi.clearAllMocks();

  storageMock.getVehicles.mockResolvedValue([]);
  storageMock.getDrivers.mockResolvedValue([]);
  storageMock.getCompanyDocuments.mockResolvedValue([]);
  storageMock.getExpiryNotificationRules.mockResolvedValue([]);
  storageMock.getUsers.mockResolvedValue([]);
  storageMock.resolveObsoleteExpiryNotifications.mockResolvedValue(undefined);
  storageMock.claimExpiryNotificationDelivery.mockResolvedValue(new Date());
  storageMock.completeExpiryNotificationDelivery.mockResolvedValue(undefined);
  storageMock.getExpiryNotificationForAlert.mockResolvedValue(undefined);
  storageMock.createExpiryNotification.mockResolvedValue({ id: 1 });
  sendEmailMock.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runLicenseExpiryChecks", () => {
  it("matches an approaching alert on its threshold day and an expired alert after its expiry date", async () => {
    storageMock.getVehicles.mockResolvedValue([
      vehicle,
      {
        ...vehicle,
        id: 11,
        licensePlate: "NOT-030",
        licenseExpiryDate: "2026-09-26",
      },
    ]);
    storageMock.getDrivers.mockResolvedValue([
      {
        id: 20,
        fullName: "Expired Driver",
        licenseNumber: "DL-20",
        licenseExpiryDate: "2026-08-27",
      },
      {
        id: 21,
        fullName: "Expires Today",
        licenseNumber: "DL-21",
        licenseExpiryDate: "2026-08-28",
      },
    ]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ id: 1, entityType: "vehicle_license", triggerType: "expiry_approaching", thresholdDays: 30 }),
      rule({
        id: 2,
        entityType: "driver_license",
        triggerType: "expired",
        thresholdDays: null,
        recipients: [{ userId: user.id }],
      }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(2);

    expect(storageMock.createExpiryNotification).toHaveBeenCalledTimes(2);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({
      ruleId: 1,
      entityType: "vehicle_license",
      entityId: vehicle.id,
      expiryDate: vehicle.licenseExpiryDate,
    }));
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({
      ruleId: 2,
      entityType: "driver_license",
      entityId: 20,
      expiryDate: "2026-08-27",
    }));
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalledWith(expect.objectContaining({
      entityId: 11,
    }));
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalledWith(expect.objectContaining({
      entityId: 21,
    }));
  });

  it("does not attempt the same in-app and email deliveries twice when checks run concurrently", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: true }),
    ]);

    const claims = new Set<string>();
    storageMock.claimExpiryNotificationDelivery.mockImplementation(async (data) => {
      const key = deliveryKey(data);
      if (claims.has(key)) return null;
      claims.add(key);
      return new Date();
    });

    await Promise.all([
      runLicenseExpiryChecks(),
      runLicenseExpiryChecks(),
    ]);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledTimes(1);
    expect(storageMock.completeExpiryNotificationDelivery).toHaveBeenCalledTimes(2);
    expect(new Set(
      storageMock.completeExpiryNotificationDelivery.mock.calls.map(([data]) => deliveryKey(data)),
    ).size).toBe(2);
  });

  it("releases a failed email claim so the delivery can succeed later the same day", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: false }),
    ]);

    const claims = new Set<string>();
    storageMock.claimExpiryNotificationDelivery.mockImplementation(async (data) => {
      const key = deliveryKey(data);
      if (claims.has(key)) return null;
      claims.add(key);
      return new Date();
    });
    storageMock.completeExpiryNotificationDelivery.mockImplementation(async (data, _claimedAt, success) => {
      if (!success) claims.delete(deliveryKey(data));
    });
    sendEmailMock
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await runLicenseExpiryChecks();
    await runLicenseExpiryChecks();

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(storageMock.completeExpiryNotificationDelivery).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      expect.any(Date),
      false,
    );
    expect(storageMock.completeExpiryNotificationDelivery).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      expect.any(Date),
      true,
    );
  });

  it("retries an abandoned delivery after its claim lease expires", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: false }),
    ]);

    const leaseMs = 15 * 60 * 1000;
    const claims = new Map<string, number>();
    claims.set(
      [
        1,
        "vehicle_license",
        vehicle.id,
        `user:${user.id}`,
        "email",
        "2026-08-28",
      ].join(":"),
      Date.now(),
    );
    storageMock.claimExpiryNotificationDelivery.mockImplementation(async (data) => {
      const key = deliveryKey(data);
      const previousClaim = claims.get(key);
      if (previousClaim !== undefined && Date.now() - previousClaim <= leaseMs) return null;
      claims.set(key, Date.now());
      return new Date();
    });

    await runLicenseExpiryChecks();
    expect(sendEmailMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(leaseMs + 1);
    await runLicenseExpiryChecks();

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(storageMock.completeExpiryNotificationDelivery).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Date),
      true,
    );
  });

  it("only sends company-document alerts to system users in that document's access list", async () => {
    storageMock.getUsers.mockResolvedValue([
      user,
      { id: 2, fullName: "Unselected User", email: "unselected@example.com" },
    ]);
    storageMock.getCompanyDocuments.mockResolvedValue([{
      id: 30,
      name: "Insurance Certificate",
      expiryDate: "2026-09-27",
      isActive: true,
      accessUserIds: [user.id],
    }]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({
        entityType: "company_document",
        recipients: [{ userId: user.id }, { userId: 2 }],
      }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);

    expect(storageMock.createExpiryNotification).toHaveBeenCalledTimes(1);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: user.id,
      entityType: "company_document",
      entityId: 30,
    }));
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      recipientKey: `user:${user.id}`,
    }));
  });

  it("passes the current expiry date so changed-date alerts are resolved", async () => {
    storageMock.getCompanyDocuments.mockResolvedValue([{
      id: 30,
      name: "Updated Policy",
      expiryDate: "2026-10-01",
      isActive: true,
      accessUserIds: [],
    }]);

    await runLicenseExpiryChecks();

    expect(storageMock.resolveObsoleteExpiryNotifications).toHaveBeenCalledWith(
      "company_document",
      30,
      "2026-10-01",
      true,
    );
  });

  it("resolves all alerts when a vehicle expiry date is cleared", async () => {
    storageMock.getVehicles.mockResolvedValue([{
      ...vehicle,
      licenseExpiryDate: null,
    }]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([rule()]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(0);

    expect(storageMock.resolveObsoleteExpiryNotifications).toHaveBeenCalledWith(
      "vehicle_license",
      vehicle.id,
      null,
      true,
    );
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalled();
  });

  it("resolves all alerts for a deactivated document and does not deliver a new one", async () => {
    storageMock.getCompanyDocuments.mockResolvedValue([{
      id: 30,
      name: "Retired Policy",
      expiryDate: "2026-09-27",
      isActive: false,
      accessUserIds: [user.id],
    }]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([rule({
      entityType: "company_document",
      recipients: [{ userId: user.id }],
    })]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(0);

    expect(storageMock.resolveObsoleteExpiryNotifications).toHaveBeenCalledWith(
      "company_document",
      30,
      "2026-09-27",
      false,
    );
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});