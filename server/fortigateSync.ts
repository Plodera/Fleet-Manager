import { storage } from "./storage";

let syncTimer: ReturnType<typeof setInterval> | null = null;

// Per-interface byte counters from previous poll for delta computation
const prevCounters: Record<string, { tx: number; rx: number; ts: number }> = {};

async function pollFortigate(): Promise<void> {
  const settings = await storage.getFortigateSettings();
  if (!settings || !settings.enabled || !settings.host || !settings.apiToken) return;

  const base = settings.host.replace(/\/+$/, "");
  const ifaces = settings.interfaces
    ? settings.interfaces.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  try {
    const url = `${base}/api/v2/monitor/system/interface/`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${settings.apiToken}` },
      // Ignore self-signed certs — FortiGate default setup
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const ifaceList: any[] = Array.isArray(data.results) ? data.results : [];

    const now = Date.now();
    const rows: { interfaceName: string; txMbps: string; rxMbps: string }[] = [];

    for (const iface of ifaceList) {
      const name: string = iface.name || iface.id || "";
      if (!name) continue;
      if (ifaces.length > 0 && !ifaces.includes(name)) continue;

      // Byte counters (cumulative, wrap at ~2^64 on FW)
      const txBytes: number = Number(iface.tx_bytes ?? iface.statistics?.tx_bytes ?? 0);
      const rxBytes: number = Number(iface.rx_bytes ?? iface.statistics?.rx_bytes ?? 0);

      const prev = prevCounters[name];
      prevCounters[name] = { tx: txBytes, rx: rxBytes, ts: now };

      if (!prev) continue;

      const elapsed = (now - prev.ts) / 1000; // seconds
      if (elapsed <= 0) continue;

      const txDelta = txBytes >= prev.tx ? txBytes - prev.tx : txBytes; // handle wrap
      const rxDelta = rxBytes >= prev.rx ? rxBytes - prev.rx : rxBytes;

      const txMbps = ((txDelta * 8) / elapsed / 1_000_000).toFixed(3);
      const rxMbps = ((rxDelta * 8) / elapsed / 1_000_000).toFixed(3);

      rows.push({ interfaceName: name, txMbps, rxMbps });
    }

    if (rows.length > 0) {
      await storage.insertFortigateBandwidth(rows);
    }

    // Prune data older than 2 hours
    await storage.pruneFortigateBandwidth();
    await storage.updateFortigateSyncStatus(new Date(), null);

    const summary = rows.map(r => `${r.interfaceName} TX=${r.txMbps} RX=${r.rxMbps} Mbps`).join(", ");
    if (summary) console.log(`[fortigateSync] ${summary}`);

  } catch (err: any) {
    const msg = err.message || String(err);
    console.error("[fortigateSync] Poll failed:", msg);
    await storage.updateFortigateSyncStatus(null, msg);
  }
}

async function reschedule(): Promise<void> {
  try {
    const settings = await storage.getFortigateSettings();
    const intervalMs = Math.max(15, settings?.pollIntervalSeconds ?? 60) * 1000;
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      pollFortigate().catch(err => console.error("[fortigateSync] Error:", err));
    }, intervalMs);
  } catch {}
}

export function rescheduleFortigateSync(): void {
  reschedule().catch(() => {});
}

export async function triggerFortigateSync(): Promise<string | null> {
  await pollFortigate();
  const settings = await storage.getFortigateSettings();
  return settings?.lastError ?? null;
}

export function startFortigateSync(): void {
  // First poll runs after one interval — we need counters from poll N to compute delta at poll N+1
  pollFortigate().catch(err => console.error("[fortigateSync] Initial poll error:", err));
  reschedule();
}
