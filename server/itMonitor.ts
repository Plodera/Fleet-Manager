import { exec } from "child_process";
import { promisify } from "util";
import { getDb } from "./db";
import { itMonitoredHosts, itHostStatus } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const execAsync = promisify(exec);

async function pingHost(ipAddress: string): Promise<{ isOnline: boolean; responseTimeMs: number | null }> {
  try {
    // Works on Linux (on-prem Ubuntu) and most Unix systems
    // -c 1: send 1 packet, -W 1: wait 1 second for response
    const { stdout } = await execAsync(`ping -c 1 -W 1 ${ipAddress}`, { timeout: 3000 });
    
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
    
    // Get all active hosts
    const hosts = await db
      .select()
      .from(itMonitoredHosts)
      .where(eq(itMonitoredHosts.isActive, true));

    if (hosts.length === 0) return;

    console.log(`[itMonitor] Pinging ${hosts.length} host(s)...`);

    // Ping all hosts in parallel
    const results = await Promise.all(
      hosts.map(async (host) => {
        const result = await pingHost(host.ipAddress);
        return { host, ...result };
      })
    );

    // Upsert status records
    for (const { host, isOnline, responseTimeMs } of results) {
      await db.insert(itHostStatus).values({
        hostId: host.id,
        isOnline,
        responseTimeMs,
        checkedAt: new Date(),
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
  console.log("[itMonitor] Starting IT monitor (30s interval)");
  // Run immediately on start
  runPingChecks();
  // Then every 30 seconds
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
