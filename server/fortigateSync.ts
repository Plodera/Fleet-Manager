import { storage } from "./storage";
import https from "https";
import http from "http";

let syncTimer: ReturnType<typeof setInterval> | null = null;

// Per-interface byte counters from previous poll for delta computation
const prevCounters: Record<string, { tx: number; rx: number; ts: number }> = {};

// Reusable HTTPS agent that skips certificate verification.
// FortiGate and other local appliances use self-signed certificates.
const tlsAgent = new https.Agent({ rejectUnauthorized: false });

/** Thin fetch wrapper using Node https/http modules (bypasses self-signed cert rejection). */
function fortigateFetch(url: string, headers: Record<string, string>, timeoutMs = 10000): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const agent = parsed.protocol === "https:" ? tlsAgent : undefined;
    const req = lib.request(
      { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === "https:" ? 443 : 80), path: parsed.pathname + parsed.search, method: "GET", headers, agent },
      (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: data }));
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error("Request timed out")); });
    req.on("error", reject);
    req.end();
  });
}

/**
 * Fetch the interface list from a FortiGate without storing data.
 * Returns { ok, interfaces, error }
 */
export async function testFortigateConnection(settings: {
  host: string;
  port: number;
  apiToken: string;
}): Promise<{ ok: boolean; interfaces: string[]; error?: string }> {
  const base = buildBase(settings.host, settings.port);
  try {
    const { status, body } = await fortigateFetch(
      `${base}/api/v2/monitor/system/interface/`,
      { Authorization: `Bearer ${settings.apiToken}` }
    );
    if (status < 200 || status >= 300) {
      return { ok: false, interfaces: [], error: `HTTP ${status}: ${body.slice(0, 200)}` };
    }
    const data = JSON.parse(body);
    const ifaceList: any[] = Array.isArray(data.results) ? data.results : [];
    const interfaces = ifaceList.map((i: any) => i.name || i.id || "").filter(Boolean);
    return { ok: true, interfaces };
  } catch (err: any) {
    return { ok: false, interfaces: [], error: err.message || String(err) };
  }
}

function buildBase(host: string, port: number): string {
  const trimmed = host.replace(/\/+$/, "").trim();
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withScheme);
  if (!url.port) {
    if ((url.protocol === "https:" && port !== 443) || (url.protocol === "http:" && port !== 80)) {
      url.port = String(port);
    }
  }
  return url.toString().replace(/\/+$/, "");
}

async function pollFortigate(): Promise<void> {
  const settings = await storage.getFortigateSettings();
  if (!settings || !settings.enabled || !settings.host || !settings.apiToken) return;

  const ifaces: string[] = (() => {
    try { return JSON.parse(settings.interfaces || "[]"); } catch { return []; }
  })();

  const base = buildBase(settings.host, settings.port);

  try {
    const { status, body } = await fortigateFetch(
      `${base}/api/v2/monitor/system/interface/`,
      { Authorization: `Bearer ${settings.apiToken}` }
    );

    if (status < 200 || status >= 300) {
      throw new Error(`HTTP ${status}: ${body.slice(0, 200)}`);
    }

    const data = JSON.parse(body);
    const ifaceList: any[] = Array.isArray(data.results) ? data.results : [];

    const now = Date.now();
    const rows: { interfaceName: string; txKbps: string; rxKbps: string }[] = [];

    for (const iface of ifaceList) {
      const name: string = iface.name || iface.id || "";
      if (!name) continue;
      if (ifaces.length > 0 && !ifaces.includes(name)) continue;

      const txBytes: number = Number(iface.tx_bytes ?? iface.statistics?.tx_bytes ?? 0);
      const rxBytes: number = Number(iface.rx_bytes ?? iface.statistics?.rx_bytes ?? 0);

      const prev = prevCounters[name];
      prevCounters[name] = { tx: txBytes, rx: rxBytes, ts: now };

      if (!prev) continue;

      const elapsed = (now - prev.ts) / 1000;
      if (elapsed <= 0) continue;

      const txDelta = txBytes >= prev.tx ? txBytes - prev.tx : txBytes;
      const rxDelta = rxBytes >= prev.rx ? rxBytes - prev.rx : rxBytes;

      // Store as Kbps; chart converts to Mbps for display
      const txKbps = ((txDelta * 8) / elapsed / 1000).toFixed(2);
      const rxKbps = ((rxDelta * 8) / elapsed / 1000).toFixed(2);

      rows.push({ interfaceName: name, txKbps, rxKbps });
    }

    if (rows.length > 0) {
      await storage.insertFortigateBandwidth(rows);
    }

    await storage.pruneFortigateBandwidth();
    await storage.updateFortigateSyncStatus(new Date(), null);

    if (rows.length > 0) {
      const summary = rows.map(r => `${r.interfaceName} TX=${r.txKbps} RX=${r.rxKbps} kbps`).join(", ");
      console.log(`[fortigateSync] ${summary}`);
    }

  } catch (err: any) {
    const msg = err.message || String(err);
    console.error("[fortigateSync] Poll failed:", msg);
    await storage.updateFortigateSyncStatus(null, msg);
  }
}

async function reschedule(): Promise<void> {
  try {
    const settings = await storage.getFortigateSettings();
    const intervalMs = Math.max(1, settings?.pollIntervalMinutes ?? 1) * 60 * 1000;
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
  pollFortigate().catch(err => console.error("[fortigateSync] Initial poll error:", err));
  reschedule();
}
