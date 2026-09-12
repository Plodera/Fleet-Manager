import { storage } from "./storage";
import { sendEmail } from "./email";

type ExpiryEntity = {
  entityType: "vehicle_license" | "vehicle_ownership" | "vehicle_insurance" | "vehicle_ivm" | "driver_license" | "company_document";
  id: number;
  name: string;
  expiryDate: string | null;
  isActive?: boolean;
  accessUserIds?: number[];
};

function daysUntil(expiryDate: string): number {
  const today = Date.parse(`${dateKey()}T00:00:00Z`);
  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  return Math.round((expiry - today) / (1000 * 60 * 60 * 24));
}

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesRule(rule: { triggerType: string; thresholdDays: number | null }, expiryDate: string): boolean {
  const remaining = daysUntil(expiryDate);
  if (rule.triggerType === "expired") return remaining < 0;
  return remaining <= (rule.thresholdDays ?? 30);
}

function describeExpiry(expiryDate: string): string {
  const remaining = daysUntil(expiryDate);
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
    deliveryDate: dateKey(),
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

export async function runLicenseExpiryChecks(): Promise<number> {
  const [rules, entities, users] = await Promise.all([
    storage.getExpiryNotificationRules(),
    getEntities(),
    storage.getUsers(),
  ]);
  const usersById = new Map(users.map(user => [user.id, user]));
  const usersByEmail = new Map(
    users
      .filter(user => user.email)
      .map(user => [user.email!.trim().toLowerCase(), user]),
  );
  const matchedEntities = new Set<string>();
  const scheduledDeliveries = new Set<string>();

  const scheduleDelivery = async (
    ruleId: number,
    entity: ExpiryEntity & { expiryDate: string },
    logicalRecipientKey: string,
    claimRecipientKey: string,
    recipientAliases: string[],
    channel: "email" | "in_app",
    deliver: () => Promise<boolean>,
  ): Promise<void> => {
    const logicalKey = [
      entity.entityType,
      entity.id,
      logicalRecipientKey,
      channel,
      dateKey(),
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
    const matched = entities.filter((entity): entity is ExpiryEntity & { expiryDate: string } =>
      entity.expiryDate !== null &&
      entity.isActive !== false &&
      entity.entityType === rule.entityType &&
      matchesRule(rule, entity.expiryDate),
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
        `Expiry date: ${entity.expiryDate} (${describeExpiry(entity.expiryDate)})`,
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
            await scheduleDelivery(rule.id, entity, userKey, userKey, [userKey], "in_app", async () => {
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
            const emailKey = `email:${recipientUser.email.trim().toLowerCase()}`;
            await scheduleDelivery(
              rule.id,
              entity,
              userKey,
              userKey,
              [userKey, emailKey],
              "email",
              () => sendEmail({ to: recipientUser.email!, subject, body }),
            );
          }
        }

        if (rule.sendEmail && recipient.email) {
          const email = recipient.email.trim().toLowerCase();
          const emailKey = `email:${email}`;
          const matchingUser = usersByEmail.get(email);
          const logicalRecipientKey = matchingUser ? `user:${matchingUser.id}` : emailKey;
          await scheduleDelivery(
            rule.id,
            entity,
            logicalRecipientKey,
            emailKey,
            [emailKey, logicalRecipientKey],
            "email",
            () => sendEmail({ to: email, subject, body }),
          );
        }
      }
    }
  }

  return matchedEntities.size;
}

export function scheduleLicenseExpiryNotifications(): void {
  setTimeout(() => {
    runLicenseExpiryChecks()
      .then(matches => console.log(`[licenseExpiry] Completed startup check (${matches} match(es)).`))
      .catch(error => console.error("[licenseExpiry] Startup check failed:", error));
  }, 6000);

  setInterval(() => {
    runLicenseExpiryChecks()
      .then(matches => console.log(`[licenseExpiry] Completed scheduled check (${matches} match(es)).`))
      .catch(error => console.error("[licenseExpiry] Scheduled check failed:", error));
  }, 24 * 60 * 60 * 1000);
}