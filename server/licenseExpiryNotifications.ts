import { storage } from "./storage";
import { sendEmail } from "./email";

type ExpiryEntity = {
  entityType: "vehicle_license" | "driver_license" | "company_document";
  id: number;
  name: string;
  expiryDate: string | null;
  isActive?: boolean;
  accessUserIds?: number[];
};

function daysUntil(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiryDate}T00:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function matchesRule(rule: { triggerType: string; thresholdDays: number | null }, expiryDate: string): boolean {
  const remaining = daysUntil(expiryDate);
  if (rule.triggerType === "expired") return remaining < 0;
  return remaining === (rule.thresholdDays ?? 30);
}

function describeExpiry(expiryDate: string): string {
  const remaining = daysUntil(expiryDate);
  if (remaining < 0) return `${Math.abs(remaining)} day(s) overdue`;
  if (remaining === 0) return "expires today";
  return `${remaining} day(s) remaining`;
}

function entityLabel(entityType: ExpiryEntity["entityType"]): string {
  if (entityType === "vehicle_license") return "Vehicle licence";
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
  channel: "email" | "in_app",
  deliver: () => Promise<boolean>,
): Promise<void> {
  const delivery = {
    ruleId,
    entityType: entity.entityType,
    entityId: entity.id,
    recipientKey,
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
  let matches = 0;

  for (const entity of entities) {
    await storage.resolveObsoleteExpiryNotifications(
      entity.entityType,
      entity.id,
      entity.expiryDate,
      entity.isActive !== false,
    );
  }

  for (const rule of rules.filter(rule => rule.isActive)) {
    const matched = entities.filter((entity): entity is ExpiryEntity & { expiryDate: string } =>
      entity.expiryDate !== null &&
      entity.isActive !== false &&
      entity.entityType === rule.entityType &&
      matchesRule(rule, entity.expiryDate),
    );
    matches += matched.length;

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

      for (const recipient of rule.recipients) {
        if (recipient.userId) {
          const recipientUser = usersById.get(recipient.userId);
          if (!recipientUser) continue;
          if (entity.entityType === "company_document" && !entity.accessUserIds?.includes(recipientUser.id)) continue;
          const userKey = `user:${recipientUser.id}`;

          if (rule.sendInApp) {
            await deliverOnce(rule.id, entity, userKey, "in_app", async () => {
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
            await deliverOnce(
              rule.id,
              entity,
              userKey,
              "email",
              () => sendEmail({ to: recipientUser.email!, subject, body }),
            );
          }
        }

        if (rule.sendEmail && recipient.email) {
          const email = recipient.email.trim().toLowerCase();
          const emailKey = `email:${email}`;
          await deliverOnce(
            rule.id,
            entity,
            emailKey,
            "email",
            () => sendEmail({ to: email, subject, body }),
          );
        }
      }
    }
  }

  return matches;
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