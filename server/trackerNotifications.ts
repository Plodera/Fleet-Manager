import { storage } from "./storage";
import { getDb } from "./db";
import { trackerNotificationRules, trackerItems } from "@shared/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";

interface EmailContent {
  to: string;
  subject: string;
  body: string;
}

async function sendEmail(content: EmailContent): Promise<boolean> {
  const settings = await storage.getEmailSettings();

  if (!settings || !settings.enabled) {
    console.log("=== STATUS TRACKER EMAIL (Email disabled — logging only) ===");
    console.log(`To: ${content.to}`);
    console.log(`Subject: ${content.subject}`);
    console.log(`Body:\n${content.body}`);
    console.log("=== END EMAIL ===");
    return false;
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail}>`,
      to: content.to,
      subject: content.subject,
      text: content.body,
    });

    console.log(`[trackerNotifications] Email sent to ${content.to}`);
    return true;
  } catch (err) {
    console.error("[trackerNotifications] Failed to send email:", err);
    return false;
  }
}

function daysDiff(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function runChecksForTracker(trackerId: number): Promise<number> {
  const rules = await storage.getTrackerNotificationRules(trackerId);
  const items = await storage.getTrackerItems(trackerId);
  const tracker = await storage.getTracker(trackerId);
  if (!tracker) return 0;

  const activeItems = items.filter(i => i.isActive && i.expiryDate);
  let totalMatches = 0;

  for (const rule of rules.filter(r => r.isActive)) {
    const matchedItems = activeItems.filter(item => {
      const diff = daysDiff(item.expiryDate!);
      if (rule.triggerType === "expired") {
        return diff < 0;
      } else if (rule.triggerType === "expiry_approaching") {
        const threshold = rule.thresholdDays ?? 30;
        return diff >= 0 && diff <= threshold;
      }
      return false;
    });

    totalMatches += matchedItems.length;

    if (matchedItems.length > 0 && rule.recipients && rule.recipients.length > 0) {
      const subject = rule.triggerType === "expired"
        ? `[Status Tracker] EXPIRED items in: ${tracker.name}`
        : `[Status Tracker] Items expiring soon in: ${tracker.name}`;

      const lines = matchedItems.map(item => {
        const diff = daysDiff(item.expiryDate!);
        const daysText = diff < 0
          ? `${Math.abs(diff)} day(s) overdue`
          : `${diff} day(s) remaining`;
        return [
          `  • ${item.name}${item.serialNumber ? ` (S/N: ${item.serialNumber})` : ""}`,
          `    Location: ${item.location || "—"}`,
          `    Expiry: ${item.expiryDate} (${daysText})`,
        ].join("\n");
      });

      const body = [
        `Status Tracker Alert`,
        ``,
        `Tracker: ${tracker.name}`,
        `${tracker.description ? `Description: ${tracker.description}\n` : ""}`,
        rule.triggerType === "expired"
          ? `The following items have EXPIRED:`
          : `The following items are expiring within ${rule.thresholdDays ?? 30} days:`,
        ``,
        lines.join("\n\n"),
        ``,
        `Please take action as required.`,
        ``,
        `— AAMS Status Tracker`,
      ].join("\n");

      for (const recipient of rule.recipients) {
        await sendEmail({ to: recipient.trim(), subject, body });
      }
    }

    await storage.updateTrackerNotificationRule(rule.id, {
      lastRunAt: new Date(),
      lastMatchCount: matchedItems.length,
    } as any);
  }

  return totalMatches;
}

export async function runAllTrackerChecks(): Promise<void> {
  try {
    const rules = await storage.getAllActiveTrackerNotificationRules();
    const trackerIds = [...new Set(rules.map(r => r.trackerId))];
    console.log(`[trackerNotifications] Running checks for ${trackerIds.length} tracker(s)...`);
    for (const tid of trackerIds) {
      await runChecksForTracker(tid);
    }
    console.log(`[trackerNotifications] Done.`);
  } catch (err) {
    console.error("[trackerNotifications] Error during checks:", err);
  }
}

export function scheduleTrackerNotifications(): void {
  // Run once on startup (delayed 5s to let DB init finish)
  setTimeout(() => {
    runAllTrackerChecks();
  }, 5000);

  // Run every 24 hours
  setInterval(() => {
    runAllTrackerChecks();
  }, 24 * 60 * 60 * 1000);
}
