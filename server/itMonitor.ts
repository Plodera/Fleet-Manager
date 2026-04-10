import { execFile } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { itMonitoredHosts, itHostStatus } from "@shared/schema";
import { eq } from "drizzle-orm";

const execFileAsync = promisify(execFile);

// Strict allowlist regex: IPv4 only (no shell metacharacters possible)
const SAFE_IP_RE = /^(\d{1,3}\.){3}\d{1,3}$/;

export function isSafeIpAddress(ip: string): boolean {
  if (!SAFE_IP_RE.test(ip)) return false;
  return ip.split(".").every(p => {
    const n = parseInt(p, 10);
    return n >= 0 && n <= 255;
  });
}

async function pingHost(ipAddress: string): Promise<{ isOnline: boolean; responseTimeMs: number | null }> {
  // Reject any IP that doesn't pass strict validation — never pass to shell
  if (!isSafeIpAddress(ipAddress)) {
    console.warn(`[itMonitor] Rejected unsafe IP address: "${ipAddress}"`);
    return { isOnline: false, responseTimeMs: null };
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

    return { isOnline: true, responseTimeMs };
  } catch {
    return { isOnline: false, responseTimeMs: null };
  }
}

async function runPingChecks() {
  try {
    const db = getDb();

    const hosts = await db
      .select()
      .from(itMonitoredHosts)
      .where(eq(itMonitoredHosts.isActive, true));

    if (hosts.length === 0) return;

    console.log(`[itMonitor] Pinging ${hosts.length} host(s)...`);

    const results = await Promise.all(
      hosts.map(async (host) => {
        const result = await pingHost(host.ipAddress);
        return { host, ...result };
      })
    );

    // Upsert: one current-status row per host (UNIQUE host_id constraint)
    const now = new Date();
    for (const { host, isOnline, responseTimeMs } of results) {
      await db
        .insert(itHostStatus)
        .values({ hostId: host.id, isOnline, responseTimeMs, checkedAt: now })
        .onConflictDoUpdate({
          target: itHostStatus.hostId,
          set: { isOnline, responseTimeMs, checkedAt: now },
        });
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
