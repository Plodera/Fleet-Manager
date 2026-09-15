import { storage } from "./storage";
import { sendEmailWithResult } from "./email";
import type { ExpiryNotificationRule, ExpiryNotificationRecipient } from "@shared/schema";

type ExpiryEntity = {
  entityType: "vehicle_license" | "vehicle_ownership" | "vehicle_insurance" | "vehicle_ivm" | "driver_license" | "company_document";
  id: number;
  name: string;
  expiryDate: string | null;
  isActive?: boolean;
  accessUserIds?: number[];
};

type ScheduledRule = Partial<Pick<ExpiryNotificationRule, "preferredTime" | "scheduleTimezone" | "timesPerDay">>;

function zonedDateTime(now: Date, timezone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute")),
  };
}

export function scheduledMinutes(preferredTime: string, timesPerDay: number): number[] {
  const [hour, minute] = (preferredTime || "09:00").split(":").map(Number);
  const start = hour * 60 + minute;
  const count = timesPerDay || 1;
  return Array.from({ length: count }, (_, index) =>
    (start + Math.floor(index * 1440 / count)) % 1440,
  ).sort((left, right) => left - right);
}

export function nextDeliveryOccurrence(rule: ScheduledRule & { isActive?: boolean; sendEmail?: boolean }, now = new Date()): { date: string; time: string; timezone: string } | null {
  if (rule.isActive === false || rule.sendEmail === false) return null;
  const timezone = rule.scheduleTimezone || "Africa/Lagos";
  const local = zonedDateTime(now, timezone);
  const slots = scheduledMinutes(rule.preferredTime || "09:00", rule.timesPerDay || 1);
  const next = slots.find(minutes => minutes > local.minutes);
  const deliveryMinutes = next ?? slots[0];
  const localDate = new Date(`${local.date}T00:00:00Z`);
  if (next === undefined) localDate.setUTCDate(localDate.getUTCDate() + 1);
  return {
    date: localDate.toISOString().slice(0, 10),
    time: `${String(Math.floor(deliveryMinutes / 60)).padStart(2, "0")}:${String(deliveryMinutes % 60).padStart(2, "0")}`,
    timezone,
  };
}

async function recordDeliveryAttempt(data: { ruleId: number; deliveryType: "scheduled" | "test"; success: boolean; error?: string | null }): Promise<void> {
  try {
    await storage.recordExpiryNotificationDeliveryAttempt(data);
  } catch (error) {
    console.error("[licenseExpiry] Could not record delivery attempt:", error);
  }
}

export function dueDeliveryOccurrence(
  rule: ScheduledRule,
  now = new Date(),
): { deliveryDate: string; deliveryOccurrence: number } | null {
  const local = zonedDateTime(now, rule.scheduleTimezone || "Africa/Lagos");
  const due = scheduledMinutes(rule.preferredTime || "09:00", rule.timesPerDay || 1)
    .map((minutes, occurrence) => ({ minutes, occurrence }))
    .filter(slot => slot.minutes <= local.minutes)
    .at(-1);
  return due ? { deliveryDate: local.date, deliveryOccurrence: due.occurrence } : null;
}

function daysUntil(expiryDate: string, todayKey: string): number {
  const today = Date.parse(`${todayKey}T00:00:00Z`);
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function matchesRule(rule: { triggerType: string; thresholdDays: number | null }, expiryDate: string, todayKey: string): boolean {
  const remaining = daysUntil(expiryDate, todayKey);
  if (rule.triggerType === "expired") return remaining < 0;
  return remaining <= (rule.thresholdDays ?? 30);
}

function describeExpiry(expiryDate: string, todayKey: string): string {
  const remaining = daysUntil(expiryDate, todayKey);
  if (remaining < 0) return `${Math.abs(remaining)} day(s) overdue`;
  if (remaining === 0) return "expires today";
  return `${remaining} day(s) remaining`;
}

function entityLabel(entityType: ExpiryEntity["entityType"]): string {
  if (entityType === "vehicle_license") return "Vehicle licence";
  if (entityType === "vehicle_ownership") return "Vehicle ownership document";
  if (entityType === "vehicle_insurance") return "Vehicle insurance";
  if (entityType === "vehicle_ivm") return "Vehicle IVM";
  if (entityType === "driver_license") return "Driver licence";
  return "Company document";
}

async function getEntities(): Promise<ExpiryEntity[]> {
  const [vehicles, drivers, companyDocuments] = await Promise.all([
    storage.getVehicles(),
    storage.getDrivers(),
    storage.getCompanyDocuments(),
  ]);

  return [
    ...vehicles
      .map(vehicle => ({
        entityType: "vehicle_license" as const,
        id: vehicle.id,
        name: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        expiryDate: vehicle.licenseExpiryDate,
      })),
    ...vehicles.map(vehicle => ({
      entityType: "vehicle_ownership" as const,
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      expiryDate: vehicle.ownershipExpiryDate,
    })),
    ...vehicles.map(vehicle => ({
      entityType: "vehicle_insurance" as const,
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      expiryDate: vehicle.insuranceExpiryDate,
    })),
    ...vehicles.map(vehicle => ({
      entityType: "vehicle_ivm" as const,
      id: vehicle.id,
      name: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
      expiryDate: vehicle.ivmExpiryDate,
    })),
    ...drivers
      .map(driver => ({
        entityType: "driver_license" as const,
        id: driver.id,
        name: `${driver.fullName}${driver.licenseNumber ? ` (${driver.licenseNumber})` : ""}`,
        expiryDate: driver.licenseExpiryDate,
      })),
    ...companyDocuments
      .map(document => ({
        entityType: "company_document" as const,
        id: document.id,
        name: document.name,
        expiryDate: document.expiryDate,
        isActive: document.isActive,
        accessUserIds: document.accessUserIds,
      })),
  ];
}

async function deliverOnce(
  ruleId: number,
  entity: ExpiryEntity & { expiryDate: string },
  recipientKey: string,
  logicalRecipientKey: string,
  recipientAliases: string[],
  channel: "email" | "in_app",
  deliveryDate: string,
  deliveryOccurrence: number,
  deliver: () => Promise<boolean>,
): Promise<void> {
  const delivery = {
    ruleId,
    entityType: entity.entityType,
    entityId: entity.id,
    recipientKey,
    logicalRecipientKey,
    recipientAliases,
    channel,
    deliveryDate,
    deliveryOccurrence,
  };
  const claimedAt = await storage.claimExpiryNotificationDelivery(delivery);
  if (!claimedAt) return;

  let success = false;
  try {
    success = await deliver();
  } catch (error) {
    await storage.completeExpiryNotificationDelivery(delivery, claimedAt, false);
    throw error;
  }
  await storage.completeExpiryNotificationDelivery(delivery, claimedAt, success);
}

export async function runLicenseExpiryChecks(options: { scheduled?: boolean; now?: Date } = {}): Promise<number> {
  const now = options.now ?? new Date();
  const [rules, entities, users] = await Promise.all([
    storage.getExpiryNotificationRules(),
    getEntities(),
    storage.getUsers(),
  ]);
  const usersById = new Map(users.map(user => [user.id, user]));
  const userKeysByEmail = new Map<string, string[]>();
  for (const user of [...users].sort((left, right) => left.id - right.id)) {
    if (!user.email) continue;
    const email = user.email.trim().toLowerCase();
    const userKeys = userKeysByEmail.get(email) ?? [];
    userKeys.push(`user:${user.id}`);
    userKeysByEmail.set(email, userKeys);
  }
  const matchedEntities = new Set<string>();
  const scheduledDeliveries = new Set<string>();

  const scheduleDelivery = async (
    ruleId: number,
    entity: ExpiryEntity & { expiryDate: string },
    logicalRecipientKey: string,
    claimRecipientKey: string,
    recipientAliases: string[],
    channel: "email" | "in_app",
    deliveryDate: string,
    deliveryOccurrence: number,
    deliver: () => Promise<boolean>,
  ): Promise<void> => {
    const logicalKey = [
      entity.entityType,
      entity.id,
      logicalRecipientKey,
      channel,
      deliveryDate,
      deliveryOccurrence,
    ].join(":");
    if (scheduledDeliveries.has(logicalKey)) return;
    scheduledDeliveries.add(logicalKey);
    await deliverOnce(
      ruleId,
      entity,
      claimRecipientKey,
      logicalRecipientKey,
      Array.from(new Set([claimRecipientKey, logicalRecipientKey, ...recipientAliases])),
      channel,
      deliveryDate,
      deliveryOccurrence,
      deliver,
    );
  };

  for (const entity of entities) {
    await storage.resolveObsoleteExpiryNotifications(
      entity.entityType,
      entity.id,
      entity.expiryDate,
      entity.isActive !== false,
    );
  }

  const activeRules = rules.filter(rule => rule.isActive).sort((left, right) => left.id - right.id);
  for (const rule of activeRules) {
    const scheduledOccurrence = dueDeliveryOccurrence(rule, now);
    if (options.scheduled && !scheduledOccurrence) continue;
    const timing = scheduledOccurrence ?? {
      deliveryDate: zonedDateTime(now, rule.scheduleTimezone || "Africa/Lagos").date,
      deliveryOccurrence: 0,
    };
    const matched = entities.filter((entity): entity is ExpiryEntity & { expiryDate: string } =>
      entity.expiryDate !== null &&
      entity.isActive !== false &&
      entity.entityType === rule.entityType &&
      matchesRule(rule, entity.expiryDate, timing.deliveryDate),
    );
    for (const entity of matched) {
      matchedEntities.add(`${entity.entityType}:${entity.id}`);
    }

    for (const entity of matched) {
      const subject = `[Licence expiry] ${entityLabel(entity.entityType)} alert: ${entity.name}`;
      const body = [
        "Licence Expiry Alert",
        "",
        `Type: ${entityLabel(entity.entityType)}`,
        `Item: ${entity.name}`,
        `Expiry date: ${entity.expiryDate} (${describeExpiry(entity.expiryDate, timing.deliveryDate)})`,
        "",
        "Please log in to Fleet Management and take the required action.",
      ].join("\n");

      const recipients = [...rule.recipients].sort((left, right) =>
        Number(Boolean(right.userId)) - Number(Boolean(left.userId)),
      );
      for (const recipient of recipients) {
        if (recipient.userId) {
          const recipientUser = usersById.get(recipient.userId);
          if (!recipientUser) continue;
          if (entity.entityType === "company_document" && !entity.accessUserIds?.includes(recipientUser.id)) continue;
          const userKey = `user:${recipientUser.id}`;

          if (rule.sendInApp) {
            await scheduleDelivery(rule.id, entity, userKey, userKey, [userKey], "in_app", timing.deliveryDate, 0, async () => {
              const existing = await storage.getExpiryNotificationForAlert({
                userId: recipientUser.id, ruleId: rule.id, entityType: entity.entityType,
                entityId: entity.id, expiryDate: entity.expiryDate,
              });
              if (!existing) {
                await storage.createExpiryNotification({
                  userId: recipientUser.id, ruleId: rule.id, entityType: entity.entityType,
                  entityId: entity.id, entityName: entity.name, expiryDate: entity.expiryDate,
                });
              }
              return true;
            });
          }

          if (rule.sendEmail && recipientUser.email) {
            const email = recipientUser.email.trim().toLowerCase();
            const emailKey = `email:${email}`;
            const matchingUserKeys = userKeysByEmail.get(email) ?? [userKey];
            await scheduleDelivery(
              rule.id,
              entity,
              emailKey,
              emailKey,
              [emailKey, ...matchingUserKeys],
              "email",
              timing.deliveryDate,
              timing.deliveryOccurrence,
              async () => {
                const result = await sendEmailWithResult({ to: recipientUser.email!, subject, body });
                await recordDeliveryAttempt({ ruleId: rule.id, deliveryType: "scheduled", success: result.success, error: result.success ? null : result.error });
                return result.success;
              },
            );
          }
        }

        if (rule.sendEmail && recipient.email) {
          const email = recipient.email.trim().toLowerCase();
          const emailKey = `email:${email}`;
          const matchingUserKeys = userKeysByEmail.get(email) ?? [];
          await scheduleDelivery(
            rule.id,
            entity,
            emailKey,
            emailKey,
            [emailKey, ...matchingUserKeys],
            "email",
            timing.deliveryDate,
            timing.deliveryOccurrence,
            async () => {
              const result = await sendEmailWithResult({ to: email, subject, body });
              await recordDeliveryAttempt({ ruleId: rule.id, deliveryType: "scheduled", success: result.success, error: result.success ? null : result.error });
              return result.success;
            },
          );
        }
      }
    }
  }

  return matchedEntities.size;
}

export async function sendExpiryRuleTest(
  ruleId: number,
): Promise<{ success: boolean; sentCount: number; failedCount: number }> {
  const [rules, users] = await Promise.all([
    storage.getExpiryNotificationRules(),
    storage.getUsers(),
  ]);
  const rule = rules.find(candidate => candidate.id === ruleId);
  if (!rule) throw new Error("Reminder rule not found");
  if (!rule.sendEmail) throw new Error("Enable email delivery before testing this rule");

  const usersById = new Map(users.map(user => [user.id, user]));
  const addresses = Array.from(new Set(
    rule.recipients
      .map((recipient: ExpiryNotificationRecipient) =>
        recipient.email ?? (recipient.userId ? usersById.get(recipient.userId)?.email : null),
      )
      .filter((email): email is string => Boolean(email))
      .map(email => email.trim().toLowerCase()),
  ));
  if (addresses.length === 0) throw new Error("Add at least one recipient with a valid email address");

  const schedule = `${rule.timesPerDay} time(s) per day from ${rule.preferredTime} (${rule.scheduleTimezone})`;
  const results = await Promise.all(addresses.map(async to => {
    const result = await sendEmailWithResult({
    to,
    subject: `[TEST] Licence expiry notification: ${entityLabel(rule.entityType as ExpiryEntity["entityType"])}`,
    body: [
      "TEST NOTIFICATION — no action is required.",
      "",
      `Rule: ${entityLabel(rule.entityType as ExpiryEntity["entityType"])}`,
      `Trigger: ${rule.triggerType === "expired" ? "When expired" : `${rule.thresholdDays ?? 30} day(s) before expiry`}`,
      `Schedule: ${schedule}`,
      "",
      "If you received this message, this reminder rule can deliver email successfully.",
    ].join("\n"),
    });
    await recordDeliveryAttempt({ ruleId, deliveryType: "test", success: result.success, error: result.success ? null : result.error });
    return result;
  }));
  const sentCount = results.filter(result => result.success).length;
  const failedCount = results.length - sentCount;
  return { success: failedCount === 0, sentCount, failedCount };
}

export function scheduleLicenseExpiryNotifications(): void {
  setTimeout(() => {
    runLicenseExpiryChecks({ scheduled: true })
      .then(matches => console.log(`[licenseExpiry] Completed startup check (${matches} match(es)).`))
      .catch(error => console.error("[licenseExpiry] Startup check failed:", error));
  }, 6000);

  setInterval(() => {
    runLicenseExpiryChecks({ scheduled: true })
      .then(matches => console.log(`[licenseExpiry] Completed scheduled check (${matches} match(es)).`))
      .catch(error => console.error("[licenseExpiry] Scheduled check failed:", error));
  }, 60 * 1000);
}