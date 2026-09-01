import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { itMonitoredHosts, itHostStatus, type ItMonitoredHost } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

const execFileAsync = promisify(execFile);

// Strict allowlist regex: IPv4 only (no shell metacharacters possible)
const SAFE_IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export function isSafeIpAddress(ip: string): boolean {
  if (!SAFE_IP_RE.test(ip)) return false; // nosemgrep
  return ip.split(".").every(p => {
    const n = parseInt(p, 10);
    return n >= 0 && n <= 255;
  });
}

export function calculateAvailability(checks: Array<{ isOnline: boolean }>): number {
  if (checks.length === 0) return 0;
  return Math.round((checks.filter(check => check.isOnline).length / checks.length) * 10000) / 100;
}

export async function pingHost(ipAddress: string): Promise<{ isOnline: boolean; responseTimeMs: number | null; failureReason: string | null }> {
  // Reject any IP that doesn't pass strict validation — never pass to shell
  if (!isSafeIpAddress(ipAddress)) {
    console.warn("[itMonitor] Rejected IP: value did not pass strict IPv4 validation");
    return { isOnline: false, responseTimeMs: null, failureReason: "invalid_ip" };
  }

  try {
    // Use execFile (NOT exec) — arguments are passed directly to the OS,
    // bypassing shell interpretation entirely. No injection risk.
    const { stdout } = await execFileAsync("ping", ["-c", "1", "-W", "1", ipAddress], {
      timeout: 3000,
    });

    // Parse response time from output: "time=12.3 ms"
    const match = stdout.match(/time[=<](\d+(?:\.\d+)?)\s*ms/);
    const responseTimeMs = match ? Math.round(parseFloat(match[1])) : null;

    return { isOnline: true, responseTimeMs, failureReason: null };
  } catch (error: any) {
    const failureReason = error?.killed || error?.code === "ETIMEDOUT" ? "timeout" : "unreachable";
    return { isOnline: false, responseTimeMs: null, failureReason };
  }
}

export async function runPingChecks() {
  try {
    const db = getDb();

    const hosts = await db
      .select()
      .from(itMonitoredHosts)
      .where(eq(itMonitoredHosts.isActive, true));

    if (hosts.length === 0) return;

    console.log(`[itMonitor] Pinging ${hosts.length} host(s)...`);

    const results = await Promise.all(
      hosts.map(async (host: ItMonitoredHost) => {
        const previousStatus = await storage.getItHostStatus(host.id);
        const result = await pingHost(host.ipAddress);
        return { host, previousStatus, ...result };
      })
    );

    // Upsert: one current-status row per host (UNIQUE host_id constraint)
    const now = new Date();
    for (const { host, isOnline, responseTimeMs, failureReason, previousStatus } of results) {
      await storage.recordItHostCheck({
        hostId: host.id,
        isOnline,
        responseTimeMs,
        failureReason,
        checkedAt: now,
      });
      await db
        .insert(itHostStatus)
        .values({ hostId: host.id, isOnline, responseTimeMs, checkedAt: now })
        .onConflictDoUpdate({
          target: itHostStatus.hostId,
          set: { isOnline, responseTimeMs, checkedAt: now },
        });

      const openOutage = await storage.getItOpenIssue(host.id, "outage");
      const openPerformance = await storage.getItOpenIssue(host.id, "performance");
      if (!isOnline) {
        if (!openOutage) {
          await storage.createItNetworkIssue({
            hostId: host.id,
            issueType: "outage",
            title: `${host.name} is unreachable`,
            severity: host.hostType === "internet_link" ? "critical" : "high",
            startedAt: now,
          });
        }
        if (openPerformance) {
          const resolved = await storage.updateItNetworkIssue(openPerformance.id, {
            status: "resolved",
            resolvedAt: now,
            resolutionDetails: "Superseded by an outage condition.",
          });
          await storage.addItNetworkIssueUpdate({
            issueId: resolved.id,
            status: "resolved",
            note: "Host became unreachable; performance issue closed.",
            resolutionDetails: "Superseded by an outage condition.",
          });
        }
      } else {
        if (openOutage && previousStatus?.isOnline === false) {
          const resolved = await storage.updateItNetworkIssue(openOutage.id, {
            status: "resolved",
            resolvedAt: now,
            resolutionDetails: `Connectivity restored${responseTimeMs != null ? ` at ${responseTimeMs} ms.` : "."}`,
          });
          await storage.addItNetworkIssueUpdate({
            issueId: resolved.id,
            status: "resolved",
            note: "Connectivity restored during the continuous check.",
            resolutionDetails: resolved.resolutionDetails,
          });
        }

        const latencyThresholdMs = 250;
        if (responseTimeMs != null && responseTimeMs > latencyThresholdMs) {
          if (!openPerformance) {
            await storage.createItNetworkIssue({
              hostId: host.id,
              issueType: "performance",
              title: `${host.name} latency is above ${latencyThresholdMs} ms`,
              severity: responseTimeMs > 1000 ? "high" : "medium",
              startedAt: now,
              investigationNotes: `Observed response time: ${responseTimeMs} ms.`,
            });
          }
        } else if (openPerformance) {
          const resolved = await storage.updateItNetworkIssue(openPerformance.id, {
            status: "resolved",
            resolvedAt: now,
            resolutionDetails: `Latency returned below ${latencyThresholdMs} ms.`,
          });
          await storage.addItNetworkIssueUpdate({
            issueId: resolved.id,
            status: "resolved",
            note: "Latency returned to the configured normal range.",
            resolutionDetails: resolved.resolutionDetails,
          });
        }
      }
    }

    const online = results.filter(r => r.isOnline).length;
    console.log(`[itMonitor] Check complete: ${online}/${hosts.length} online`);
  } catch (err) {
    console.error("[itMonitor] Error during ping check:", err);
  }
}

let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startITMonitor() {
  if (monitorInterval) return; // prevent double-start
  console.log("[itMonitor] Starting IT monitor (30s interval)");
  runPingChecks();
  monitorInterval = setInterval(runPingChecks, 30_000);
}

export function stopITMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export async function triggerITCheck(): Promise<void> {
  await runPingChecks();
}
