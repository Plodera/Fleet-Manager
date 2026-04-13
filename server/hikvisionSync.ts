import { createHash } from "crypto";
import { storage } from "./storage";

let syncTimer: ReturnType<typeof setInterval> | null = null;

const HIK_KPI_DEFS = [
  { name: "nvr_cameras_total",   labelEn: "Total Cameras",    labelPt: "Câmeras Total",    unit: "cameras", sortOrder: 90 },
  { name: "nvr_cameras_online",  labelEn: "Cameras Online",   labelPt: "Câmeras Online",   unit: "cameras", sortOrder: 91 },
  { name: "nvr_cameras_offline", labelEn: "Cameras Offline",  labelPt: "Câmeras Offline",  unit: "cameras", sortOrder: 92 },
];

// ── Digest Auth helper (uses Node.js built-in crypto, no extra packages) ──────
async function digestFetch(url: string, username: string, password: string): Promise<{ ok: boolean; status: number; text: string }> {
  // Step 1: unauthenticated request to get WWW-Authenticate challenge
  const challenge = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (challenge.status !== 401) {
    const text = await challenge.text();
    return { ok: challenge.ok, status: challenge.status, text };
  }

  const wwwAuth = challenge.headers.get("WWW-Authenticate") || "";
  const getParam = (key: string) => {
    const m = wwwAuth.match(new RegExp(`${key}="([^"]*)"`));
    return m ? m[1] : "";
  };

  const realm  = getParam("realm");
  const nonce  = getParam("nonce");
  const qop    = getParam("qop") || "auth";
  const opaque = getParam("opaque");

  const uri = new URL(url).pathname + (new URL(url).search || "");
  const nc  = "00000001";
  const cnonce = createHash("md5").update(Math.random().toString()).digest("hex").slice(0, 8);

  const ha1 = createHash("md5").update(`${username}:${realm}:${password}`).digest("hex");
  const ha2 = createHash("md5").update(`GET:${uri}`).digest("hex");
  const response = createHash("md5").update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest("hex");

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  if (opaque) authHeader += `, opaque="${opaque}"`;

  // Step 2: authenticated request
  const res = await fetch(url, {
    headers: { Authorization: authHeader },
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

// ── Parse Hikvision ISAPI XML for channel counts ──────────────────────────────
// Splits the response into per-channel blocks so each channel is counted at
// most once, regardless of how many status fields the NVR includes per block.
function parseCameraChannels(xml: string): { total: number; online: number } {
  // Split into individual <InputProxyChannel>…</InputProxyChannel> blocks.
  // Hikvision ISAPI always returns full open/close pairs for channel elements.
  const channelBlocks = xml.match(/<InputProxyChannel[\s\S]*?<\/InputProxyChannel>/gi) ?? [];
  const total = channelBlocks.length;

  // For each channel block check whether ANY status field indicates online/connected.
  // Known field names across Hikvision firmware versions:
  //   connectionStatus, streamStatus, onlineStatus
  // Known positive values (case-insensitive):
  //   online, connected
  const statusRe = /<(?:connectionStatus|streamStatus|onlineStatus)>\s*(?:online|connected)\s*<\/(?:connectionStatus|streamStatus|onlineStatus)>/i;
  const online = channelBlocks.filter(block => statusRe.test(block)).length;

  // Debug: when cameras are found but none are online, log the first block so
  // admins can check pm2 logs to see the actual XML structure
  if (total > 0 && online === 0 && channelBlocks[0]) {
    console.warn("[hikvisionSync] WARNING: 0 online out of", total, "— first channel block:\n", channelBlocks[0].slice(0, 600));
  }

  return { total, online };
}

// ── Fetch raw ISAPI XML from a single NVR (for diagnostics) ──────────────────
// Returns up to 4 KB from both /channels and /channels/status endpoints.
export async function fetchNvrRawXml(nvrId: number): Promise<{ ok: boolean; channelsXml?: string; statusXml?: string; error?: string }> {
  const nvr = await storage.getHikvisionNvr(nvrId);
  if (!nvr) return { ok: false, error: "NVR not found" };
  const base = `http://${nvr.ipAddress}:${nvr.port}/ISAPI/ContentMgmt/InputProxy`;
  try {
    const [chRes, stRes] = await Promise.allSettled([
      digestFetch(`${base}/channels`, nvr.username, nvr.password),
      digestFetch(`${base}/channels/status`, nvr.username, nvr.password),
    ]);
    const channelsXml = chRes.status === "fulfilled" && chRes.value.ok ? chRes.value.text.slice(0, 4096) : `ERROR: ${chRes.status === "fulfilled" ? chRes.value.status : (chRes as any).reason?.message}`;
    const statusXml   = stRes.status === "fulfilled" && stRes.value.ok ? stRes.value.text.slice(0, 4096) : `ERROR: ${stRes.status === "fulfilled" ? stRes.value.status : (stRes as any).reason?.message}`;
    return { ok: true, channelsXml, statusXml };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// ── Parse the dedicated /channels/status endpoint ────────────────────────────
// Newer and high-channel-count NVRs separate live status into this endpoint.
// Returns {total, online} where total is the number of status entries returned.
function parseChannelStatusXml(xml: string): { total: number; online: number } {
  // <InputProxyChannelStatus> blocks (singular per channel)
  const blocks = xml.match(/<InputProxyChannelStatus[\s\S]*?<\/InputProxyChannelStatus>/gi) ?? [];
  const total = blocks.length;
  // onlineStatus is the primary field in the status endpoint
  // Known positive patterns across Hikvision firmware variants:
  //   <onlineStatus>online</onlineStatus>  — most common
  //   <onlineStatus>Online</onlineStatus>  — some firmware
  //   <onlineStatus>true</onlineStatus>    — boolean form
  //   <connectionStatus>connected</connectionStatus>
  //   <streamStatus>online</streamStatus>
  //   <status>online</status>              — simpler field name
  const onlineRe = /<(?:onlineStatus|connectionStatus|streamStatus|status)>\s*(?:online|connected|true)\s*<\/(?:onlineStatus|connectionStatus|streamStatus|status)>/i;
  const online = blocks.filter(b => onlineRe.test(b)).length;

  // Debug: log first status block when all cameras appear offline so admins
  // can check pm2 logs to identify the exact status field the NVR uses
  if (total > 0 && online === 0 && blocks[0]) {
    console.warn("[hikvisionSync] STATUS DEBUG — first InputProxyChannelStatus block:\n", blocks[0].slice(0, 800));
  }

  return { total, online };
}

// ── Poll one NVR and return camera counts ─────────────────────────────────────
// Strategy:
//   1. Always fetch /channels for total channel count.
//   2. Try /channels/status (newer NVRs) for online count — takes priority.
//   3. Fall back to status fields embedded in /channels (older NVRs).
async function pollNvr(nvrId: number, ipAddress: string, port: number, username: string, password: string): Promise<{ total: number; online: number }> {
  const base = `http://${ipAddress}:${port}/ISAPI/ContentMgmt/InputProxy`;

  // Step 1 — channel list (for total count)
  const chResult = await digestFetch(`${base}/channels`, username, password);
  if (!chResult.ok) {
    throw new Error(`ISAPI /channels returned ${chResult.status}: ${chResult.text.slice(0, 200)}`);
  }
  const { total, online: onlineFromChannels } = parseCameraChannels(chResult.text);

  // Step 2 — dedicated status endpoint (for online count on newer/larger NVRs)
  try {
    const stResult = await digestFetch(`${base}/channels/status`, username, password);
    if (stResult.ok && stResult.text.length > 10) {
      const { online: onlineFromStatus } = parseChannelStatusXml(stResult.text);
      if (onlineFromStatus > 0 || onlineFromChannels === 0) {
        console.log(`[hikvisionSync] Using /channels/status for online count: ${onlineFromStatus}/${total}`);
        return { total, online: onlineFromStatus };
      }
    }
  } catch {
    // status endpoint not available — fall through to embedded status
  }

  return { total, online: onlineFromChannels };
}

// ── Main sync function ────────────────────────────────────────────────────────
// force=true bypasses the enabled check so manual "Sync All Now" always runs
async function runHikvisionSync(force = false): Promise<{ total: number; online: number; offline: number; errors: string[] }> {
  const globalSettings = await storage.getHikvisionGlobalSettings();
  if (!force && !globalSettings?.enabled) {
    return { total: 0, online: 0, offline: 0, errors: [] };
  }

  const nvrs = await storage.getHikvisionNvrs();
  const activeNvrs = nvrs.filter(n => n.isActive);

  if (activeNvrs.length === 0) {
    return { total: 0, online: 0, offline: 0, errors: [] };
  }

  // Poll all NVRs in parallel
  const results = await Promise.allSettled(
    activeNvrs.map(nvr => pollNvr(nvr.id, nvr.ipAddress, nvr.port, nvr.username, nvr.password))
  );

  let aggTotal = 0;
  let aggOnline = 0;
  const errors: string[] = [];

  for (let i = 0; i < activeNvrs.length; i++) {
    const nvr = activeNvrs[i];
    const result = results[i];

    if (result.status === "fulfilled") {
      const { total, online } = result.value;
      aggTotal += total;
      aggOnline += online;
      await storage.updateHikvisionNvrStatus(nvr.id, {
        lastCameraTotal: total,
        lastCameraOnline: online,
        lastSyncedAt: new Date(),
        lastError: null,
      });
      console.log(`[hikvisionSync] ${nvr.name}: ${online}/${total} cameras online`);
    } else {
      const msg = `${nvr.name}: ${result.reason?.message || "Unknown error"}`;
      errors.push(msg);
      await storage.updateHikvisionNvrStatus(nvr.id, {
        lastSyncedAt: new Date(),
        lastError: result.reason?.message || "Unknown error",
      });
      console.warn(`[hikvisionSync] ${msg}`);
    }
  }

  const aggOffline = aggTotal - aggOnline;

  // Ensure the 3 KPIs exist, then upsert values
  const allKpis = await storage.getItKpis();
  const kpiMap: Record<string, number> = {};
  for (const def of HIK_KPI_DEFS) {
    let kpi = allKpis.find(k => k.name === def.name);
    if (!kpi) {
      kpi = await storage.createItKpi({
        name: def.name,
        labelEn: def.labelEn,
        labelPt: def.labelPt,
        unit: def.unit,
        sortOrder: def.sortOrder,
        isActive: true,
      });
    }
    kpiMap[def.name] = kpi.id;
  }

  const today = new Date().toISOString().split("T")[0];
  const monthDate = today.substring(0, 7) + "-01";
  const counts: Record<string, number> = {
    nvr_cameras_total: aggTotal,
    nvr_cameras_online: aggOnline,
    nvr_cameras_offline: aggOffline,
  };

  const valuesToUpsert = HIK_KPI_DEFS.flatMap(def => [
    { kpiId: kpiMap[def.name], periodType: "daily",   periodDate: today,     value: String(counts[def.name]) },
    { kpiId: kpiMap[def.name], periodType: "monthly",  periodDate: monthDate, value: String(counts[def.name]) },
  ]);
  await storage.upsertItKpiValues(valuesToUpsert);

  const syncError = errors.length > 0 ? errors.join("; ") : null;
  await storage.updateHikvisionGlobalSyncStatus(new Date(), syncError);

  console.log(`[hikvisionSync] Sync complete — total=${aggTotal} online=${aggOnline} offline=${aggOffline}${errors.length ? ` errors=${errors.length}` : ""}`);
  return { total: aggTotal, online: aggOnline, offline: aggOffline, errors };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Trigger a full sync (manual); always runs regardless of the enabled toggle */
export async function triggerHikvisionSync(): Promise<{ total: number; online: number; offline: number; errors: string[] }> {
  return runHikvisionSync(true);
}

/** Test a single NVR connection without persisting results */
export async function testNvrConnection(nvrId: number): Promise<{ ok: boolean; cameraTotal?: number; cameraOnline?: number; error?: string }> {
  const nvr = await storage.getHikvisionNvr(nvrId);
  if (!nvr) return { ok: false, error: "NVR not found" };
  try {
    const { total, online } = await pollNvr(nvr.id, nvr.ipAddress, nvr.port, nvr.username, nvr.password);
    return { ok: true, cameraTotal: total, cameraOnline: online };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function reschedule() {
  try {
    const settings = await storage.getHikvisionGlobalSettings();
    const intervalMs = Math.max(1, settings?.syncIntervalMinutes ?? 1) * 60 * 1000;
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(async () => {
      await runHikvisionSync().catch(err => console.error("[hikvisionSync] Sync error:", err));
      reschedule();
    }, intervalMs);
  } catch {}
}

/** Call after saving settings to apply the new interval immediately */
export function rescheduleHikvisionSync(): void {
  reschedule().catch(() => {});
}

export function startHikvisionSync(): void {
  runHikvisionSync().catch(err => console.error("[hikvisionSync] Initial sync error:", err));
  reschedule();
}
