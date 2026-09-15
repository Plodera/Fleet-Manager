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
    recordExpiryNotificationDeliveryAttempt: vi.fn(),
    getExpiryNotificationForAlert: vi.fn(),
    createExpiryNotification: vi.fn(),
  },
}));

vi.mock("./email", () => ({
  sendEmailWithResult: vi.fn(),
}));

import { storage } from "./storage";
import { sendEmailWithResult } from "./email";
import {
  dueDeliveryOccurrence,
  nextDeliveryOccurrence,
  runLicenseExpiryChecks,
  scheduledMinutes,
  sendExpiryRuleTest,
} from "./licenseExpiryNotifications";

const storageMock = storage as unknown as {
  getVehicles: ReturnType<typeof vi.fn>;
  getDrivers: ReturnType<typeof vi.fn>;
  getCompanyDocuments: ReturnType<typeof vi.fn>;
  getExpiryNotificationRules: ReturnType<typeof vi.fn>;
  getUsers: ReturnType<typeof vi.fn>;
  resolveObsoleteExpiryNotifications: ReturnType<typeof vi.fn>;
  claimExpiryNotificationDelivery: ReturnType<typeof vi.fn>;
  completeExpiryNotificationDelivery: ReturnType<typeof vi.fn>;
  recordExpiryNotificationDeliveryAttempt: ReturnType<typeof vi.fn>;
  getExpiryNotificationForAlert: ReturnType<typeof vi.fn>;
  createExpiryNotification: ReturnType<typeof vi.fn>;
};
const sendEmailMock = sendEmailWithResult as unknown as ReturnType<typeof vi.fn>;

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
    preferredTime: "09:00",
    scheduleTimezone: "Africa/Lagos",
    timesPerDay: 1,
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
    data.deliveryOccurrence ?? 0,
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
  storageMock.recordExpiryNotificationDeliveryAttempt.mockResolvedValue(undefined);
  storageMock.getExpiryNotificationForAlert.mockResolvedValue(undefined);
  storageMock.createExpiryNotification.mockResolvedValue({ id: 1 });
  sendEmailMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("runLicenseExpiryChecks", () => {
  it("calculates evenly spaced daily delivery times", () => {
    expect(scheduledMinutes("09:00", 1)).toEqual([540]);
    expect(scheduledMinutes("09:00", 3)).toEqual([60, 540, 1020]);
  });

  it("uses the configured timezone to decide whether a scheduled occurrence is due", () => {
    const scheduledRule = rule({ preferredTime: "09:00", scheduleTimezone: "Africa/Lagos", timesPerDay: 1 });
    expect(dueDeliveryOccurrence(scheduledRule, new Date("2026-08-28T07:59:00Z"))).toBeNull();
    expect(dueDeliveryOccurrence(scheduledRule, new Date("2026-08-28T08:00:00Z"))).toEqual({
      deliveryDate: "2026-08-28",
      deliveryOccurrence: 0,
    });
  });

  it("honors each configured daily occurrence without duplicating the same occurrence", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: false, preferredTime: "09:00", timesPerDay: 2 }),
    ]);
    const claims = new Set<string>();
    storageMock.claimExpiryNotificationDelivery.mockImplementation(async data => {
      const key = deliveryKey(data);
      if (claims.has(key)) return null;
      claims.add(key);
      return new Date();
    });

    await runLicenseExpiryChecks({ scheduled: true, now: new Date("2026-08-28T08:00:00Z") });
    await runLicenseExpiryChecks({ scheduled: true, now: new Date("2026-08-28T08:30:00Z") });
    await runLicenseExpiryChecks({ scheduled: true, now: new Date("2026-08-28T20:00:00Z") });

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(storageMock.claimExpiryNotificationDelivery.mock.calls.map(([data]) => data.deliveryOccurrence)).toEqual([0, 0, 1]);
  });

  it("does not run an automatic email check before the first configured occurrence", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: false, preferredTime: "09:00" }),
    ]);

    await expect(runLicenseExpiryChecks({
      scheduled: true,
      now: new Date("2026-08-28T07:59:00Z"),
    })).resolves.toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("supports ownership, insurance, and IVM reminder entity types", async () => {
    storageMock.getVehicles.mockResolvedValue([{
      ...vehicle,
      licenseExpiryDate: null,
      ownershipExpiryDate: null,
      insuranceExpiryDate: "2026-09-27",
      ivmExpiryDate: null,
    }]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ entityType: "vehicle_insurance", thresholdDays: 30 }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({
      entityType: "vehicle_insurance",
      entityId: vehicle.id,
      expiryDate: "2026-09-27",
    }));
  });

  it("matches approaching alerts throughout their daily window and expired alerts after expiry", async () => {
    storageMock.getVehicles.mockResolvedValue([
      vehicle,
      {
        ...vehicle,
        id: 11,
        licensePlate: "NOT-030",
        licenseExpiryDate: "2026-09-26",
      },
      {
        ...vehicle,
        id: 12,
        licensePlate: "NOT-YET",
        licenseExpiryDate: "2026-09-28",
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

    await expect(runLicenseExpiryChecks()).resolves.toBe(3);

    expect(storageMock.createExpiryNotification).toHaveBeenCalledTimes(3);
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
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({
      entityId: 11,
    }));
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalledWith(expect.objectContaining({
      entityId: 12,
    }));
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalledWith(expect.objectContaining({
      entityId: 21,
    }));
  });

  it("keeps an approaching rule active after expiry until the date changes or is cleared", async () => {
    storageMock.getVehicles.mockResolvedValue([{
      ...vehicle,
      licenseExpiryDate: "2026-08-20",
    }]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ sendEmail: true, sendInApp: false }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining("8 day(s) overdue"),
    }));
  });

  it("sends again on the next calendar day but not twice on the same day", async () => {
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

    await runLicenseExpiryChecks();
    await runLicenseExpiryChecks();
    vi.setSystemTime(new Date("2026-08-29T12:00:00Z"));
    await runLicenseExpiryChecks();

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledTimes(3);
    expect(new Set(
      storageMock.claimExpiryNotificationDelivery.mock.calls.map(([data]) => data.deliveryDate),
    )).toEqual(new Set(["2026-08-28", "2026-08-29"]));
  });

  it("suppresses overlapping rule and recipient email duplicates for the same item and day", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ id: 1, thresholdDays: 30, sendEmail: true, sendInApp: false }),
      rule({
        id: 2,
        thresholdDays: 60,
        sendEmail: true,
        sendInApp: false,
        recipients: [{ userId: user.id }, { email: user.email }],
      }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledTimes(1);
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      recipientKey: `email:${user.email}`,
    }));
  });

  it("sends one email per shared mailbox while keeping in-app alerts per account", async () => {
    const sharedUser = { id: 2, fullName: "Second Admin", email: "ADMIN@example.com" };
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([sharedUser, user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({
        sendEmail: true,
        sendInApp: true,
        recipients: [{ userId: sharedUser.id }, { userId: user.id }],
      }),
    ]);

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledTimes(2);
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id }));
    expect(storageMock.createExpiryNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: sharedUser.id }));
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      logicalRecipientKey: "email:admin@example.com",
      recipientAliases: expect.arrayContaining(["email:admin@example.com", "user:1", "user:2"]),
      channel: "email",
    }));
  });

  it("maps a manual shared address to the mailbox deterministically regardless of user order", async () => {
    const laterUser = { id: 20, fullName: "Later Account", email: "shared@example.com" };
    const earlierUser = { id: 10, fullName: "Earlier Account", email: "SHARED@example.com" };
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([laterUser, earlierUser]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({
        sendEmail: true,
        sendInApp: false,
        recipients: [{ email: " Shared@Example.com " }],
      }),
    ]);

    await runLicenseExpiryChecks();

    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: "shared@example.com" }));
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      recipientKey: "email:shared@example.com",
      logicalRecipientKey: "email:shared@example.com",
      recipientAliases: [
        "email:shared@example.com",
        "user:10",
        "user:20",
      ],
    }));
  });

  it("continues sending emails to distinct addresses", async () => {
    const secondUser = { id: 2, fullName: "Second Admin", email: "second@example.com" };
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user, secondUser]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({
        sendEmail: true,
        sendInApp: false,
        recipients: [{ userId: user.id }, { userId: secondUser.id }],
      }),
    ]);

    await runLicenseExpiryChecks();

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: user.email }));
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: secondUser.email }));
  });

  it("uses the same deterministic rule claim during concurrent overlapping checks", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({ id: 20, thresholdDays: 60, sendEmail: true, sendInApp: false }),
      rule({ id: 10, thresholdDays: 30, sendEmail: true, sendInApp: false }),
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
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledTimes(2);
    expect(storageMock.claimExpiryNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      ruleId: 10,
      recipientKey: `email:${user.email}`,
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
      .mockResolvedValueOnce({ success: false, error: "Provider unavailable" })
      .mockResolvedValueOnce({ success: true });

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

  it("does not release a successful delivery claim when attempt history cannot be recorded", async () => {
    storageMock.getVehicles.mockResolvedValue([vehicle]);
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([rule({ sendEmail: true, sendInApp: false })]);
    storageMock.recordExpiryNotificationDeliveryAttempt.mockRejectedValueOnce(new Error("audit database unavailable"));

    await expect(runLicenseExpiryChecks()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(storageMock.completeExpiryNotificationDelivery).toHaveBeenCalledWith(
      expect.any(Object), expect.any(Date), true,
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
        `email:${user.email}`,
        "email",
        "2026-08-28",
        0,
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

describe("sendExpiryRuleTest", () => {
  it("sends one labeled test email per unique configured address without delivery claims", async () => {
    storageMock.getUsers.mockResolvedValue([user]);
    storageMock.getExpiryNotificationRules.mockResolvedValue([
      rule({
        sendEmail: true,
        recipients: [{ userId: user.id }, { email: "ADMIN@example.com" }],
      }),
    ]);

    await expect(sendExpiryRuleTest(1)).resolves.toEqual({
      success: true,
      sentCount: 1,
      failedCount: 0,
    });
    expect(sendEmailMock).toHaveBeenCalledOnce();
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({
      to: "admin@example.com",
      subject: expect.stringContaining("[TEST]"),
      body: expect.stringContaining("no action is required"),
    }));
    expect(storageMock.claimExpiryNotificationDelivery).not.toHaveBeenCalled();
    expect(storageMock.createExpiryNotification).not.toHaveBeenCalled();
  });

  it("rejects testing a rule without email delivery", async () => {
    storageMock.getExpiryNotificationRules.mockResolvedValue([rule({ sendEmail: false })]);
    await expect(sendExpiryRuleTest(1)).rejects.toThrow("Enable email delivery");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("nextDeliveryOccurrence", () => {
  it("returns the next configured local slot and rolls to tomorrow after the final slot", () => {
    const schedule = { preferredTime: "09:00", scheduleTimezone: "UTC", timesPerDay: 2, isActive: true };
    expect(nextDeliveryOccurrence(schedule, new Date("2026-09-15T10:00:00Z"))).toEqual({
      date: "2026-09-15", time: "21:00", timezone: "UTC",
    });
    expect(nextDeliveryOccurrence(schedule, new Date("2026-09-15T22:00:00Z"))).toEqual({
      date: "2026-09-16", time: "09:00", timezone: "UTC",
    });
  });

  it("does not report a next delivery for an inactive rule", () => {
    expect(nextDeliveryOccurrence({ isActive: false })).toBeNull();
    expect(nextDeliveryOccurrence({ isActive: true, sendEmail: false })).toBeNull();
  });
});