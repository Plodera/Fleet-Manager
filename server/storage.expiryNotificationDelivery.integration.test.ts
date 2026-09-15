import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { initDatabase, getPool } from "./db";
import { DatabaseStorage } from "./storage";

type DeliveryKey = Parameters<DatabaseStorage["claimExpiryNotificationDelivery"]>[0];

const TEST_ENTITY_TYPE = `claim-integration-${process.pid}`;
const DELIVERY_DATE = "2099-12-31";
const LEASE_MS = 15 * 60 * 1000;

describe("DatabaseStorage expiry notification delivery claims", () => {
  let storage: DatabaseStorage;
  let ruleIds: [number, number];
  let entityId = 0;

  beforeAll(async () => {
    await initDatabase();
    storage = new DatabaseStorage();
  });

  beforeEach(async () => {
    entityId += 1;
    const result = await getPool().query<{ id: number }>(`
      INSERT INTO expiry_notification_rules
        (entity_type, trigger_type, threshold_days, send_email, send_in_app, is_active)
      VALUES
        ($1, 'expiry_approaching', 30, TRUE, FALSE, TRUE),
        ($1, 'expiry_approaching', 60, TRUE, FALSE, TRUE)
      RETURNING id
    `, [TEST_ENTITY_TYPE]);
    ruleIds = [result.rows[0].id, result.rows[1].id];
  });

  afterEach(async () => {
    await getPool().query(
      "DELETE FROM expiry_notification_rules WHERE entity_type = $1",
      [TEST_ENTITY_TYPE],
    );
  });

  afterAll(async () => {
    await getPool().query(
      "DELETE FROM expiry_notification_rules WHERE entity_type = $1",
      [TEST_ENTITY_TYPE],
    );
    await getPool().end();
  });

  function delivery(
    ruleId: number,
    recipientKey: string,
    overrides: Partial<DeliveryKey> = {},
  ): DeliveryKey {
    return {
      ruleId,
      entityType: TEST_ENTITY_TYPE,
      entityId,
      recipientKey,
      logicalRecipientKey: "user:claim-integration",
      recipientAliases: ["user:claim-integration", "email:claim-integration@example.com"],
      channel: "email",
      deliveryDate: DELIVERY_DATE,
      ...overrides,
    };
  }

  async function insertDelivery(
    ruleId: number,
    recipientKey: string,
    success: boolean,
    createdAt = new Date(),
  ) {
    await getPool().query(`
      INSERT INTO expiry_notification_deliveries
        (rule_id, entity_type, entity_id, recipient_key, channel, delivery_date, success, created_at)
      VALUES ($1, $2, $3, $4, 'email', $5, $6, $7)
    `, [ruleId, TEST_ENTITY_TYPE, entityId, recipientKey, DELIVERY_DATE, success, createdAt]);
  }

  it("deletes only delivery attempts older than the retention cutoff", async () => {
    const oldAttempt = new Date("2026-01-01T00:00:00.000Z");
    const recentAttempt = new Date("2026-09-01T00:00:00.000Z");
    const cutoff = new Date("2026-06-17T00:00:00.000Z");

    await getPool().query(`
      INSERT INTO expiry_notification_delivery_attempts
        (rule_id, delivery_type, channel, recipient_label, success, attempted_at)
      VALUES
        ($1, 'scheduled', 'email', 'a***@example.com', TRUE, $2),
        ($1, 'test', 'email', 'a***@example.com', FALSE, $3)
    `, [ruleIds[0], oldAttempt, recentAttempt]);

    await expect(storage.deleteExpiredExpiryNotificationDeliveryAttempts(cutoff)).resolves.toBe(1);

    const attempts = await storage.getRecentExpiryNotificationDeliveryAttempts(ruleIds, 5);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attemptedAt).toEqual(recentAttempt);
  });

  it("allows only one of two simultaneous claims from overlapping rules", async () => {
    const claims = await Promise.all([
      storage.claimExpiryNotificationDelivery(
        delivery(ruleIds[0], "user:claim-integration"),
      ),
      storage.claimExpiryNotificationDelivery(
        delivery(ruleIds[1], "email:claim-integration@example.com"),
      ),
    ]);

    expect(claims.filter((claim) => claim !== null)).toHaveLength(1);
    const persisted = await getPool().query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM expiry_notification_deliveries
      WHERE entity_type = $1 AND entity_id = $2
    `, [TEST_ENTITY_TYPE, entityId]);
    expect(persisted.rows[0].count).toBe("1");
  });

  it("rejects another overlapping claim after a successful delivery", async () => {
    const first = delivery(ruleIds[0], "user:claim-integration");
    const claimedAt = await storage.claimExpiryNotificationDelivery(first);
    expect(claimedAt).not.toBeNull();
    await storage.completeExpiryNotificationDelivery(first, claimedAt!, true);

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[1], "email:claim-integration@example.com"),
    )).resolves.toBeNull();
  });

  it("rejects another overlapping claim while a pending claim lease is live", async () => {
    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[0], "user:claim-integration"),
    )).resolves.not.toBeNull();

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[1], "email:claim-integration@example.com"),
    )).resolves.toBeNull();
  });

  it("reclaims a failed pending delivery after its lease expires", async () => {
    await insertDelivery(
      ruleIds[0],
      "user:claim-integration",
      false,
      new Date(Date.now() - LEASE_MS - 1_000),
    );

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[1], "email:claim-integration@example.com"),
    )).resolves.not.toBeNull();
  });

  it("honors a successful legacy recipient-key record through aliases", async () => {
    await insertDelivery(
      ruleIds[0],
      "email:claim-integration@example.com",
      true,
    );

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[1], "user:claim-integration"),
    )).resolves.toBeNull();
  });

  it("allows a failed claim to retry immediately after release", async () => {
    const first = delivery(ruleIds[0], "user:claim-integration");
    const claimedAt = await storage.claimExpiryNotificationDelivery(first);
    expect(claimedAt).not.toBeNull();
    await storage.completeExpiryNotificationDelivery(first, claimedAt!, false);

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[1], "email:claim-integration@example.com"),
    )).resolves.not.toBeNull();
  });

  it("allows separate scheduled occurrences on the same day", async () => {
    const first = delivery(ruleIds[0], "user:claim-integration", { deliveryOccurrence: 0 });
    const claimedAt = await storage.claimExpiryNotificationDelivery(first);
    expect(claimedAt).not.toBeNull();
    await storage.completeExpiryNotificationDelivery(first, claimedAt!, true);

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(ruleIds[0], "user:claim-integration", { deliveryOccurrence: 1 }),
    )).resolves.not.toBeNull();
  });

  it("rejects a repeated-clock-hour claim for the same local occurrence", async () => {
    const repeatedLocalOccurrence = delivery(
      ruleIds[0],
      "user:claim-integration",
      { deliveryDate: "2026-10-25", deliveryOccurrence: 0 },
    );
    const claimedAt = await storage.claimExpiryNotificationDelivery(repeatedLocalOccurrence);
    expect(claimedAt).not.toBeNull();
    await storage.completeExpiryNotificationDelivery(repeatedLocalOccurrence, claimedAt!, true);

    await expect(storage.claimExpiryNotificationDelivery(
      delivery(
        ruleIds[0],
        "user:claim-integration",
        { deliveryDate: "2026-10-25", deliveryOccurrence: 0 },
      ),
    )).resolves.toBeNull();
  });
});