import { storage } from "./storage";

let syncTimer: ReturnType<typeof setInterval> | null = null;

const GLPI_KPI_DEFS = [
  { name: "open_tickets",    labelEn: "Open Tickets",   labelPt: "Tickets Abertos",  unit: "tickets" },
  { name: "new_today",       labelEn: "New Today",      labelPt: "Novos Hoje",        unit: "tickets" },
  { name: "resolved_today",  labelEn: "Resolved Today", labelPt: "Resolvidos Hoje",   unit: "tickets" },
];

function buildSearchUrl(
  base: string,
  criteria: Array<{ field: number; searchtype: string; value: string; link?: string }>,
): string {
  const parts = ["range=0-0", "forcedisplay[0]=2"];
  criteria.forEach((c, i) => {
    if (c.link && i > 0) parts.push(`criteria[${i}][link]=${encodeURIComponent(c.link)}`);
    parts.push(`criteria[${i}][field]=${c.field}`);
    parts.push(`criteria[${i}][searchtype]=${encodeURIComponent(c.searchtype)}`);
    parts.push(`criteria[${i}][value]=${encodeURIComponent(c.value)}`);
  });
  return `${base}/apirest.php/search/Ticket?${parts.join("&")}`;
}

/** Throws on any non-206/200 response or JSON parse failure */
async function countTickets(
  base: string,
  appToken: string,
  sessionToken: string,
  criteria: Array<{ field: number; searchtype: string; value: string; link?: string }>,
): Promise<number> {
  const url = buildSearchUrl(base, criteria);
  const res = await fetch(url, {
    headers: { "App-Token": appToken, "Session-Token": sessionToken },
  });

  // GLPI returns 206 Partial Content when search results exist; 200 on zero results
  if (!res.ok && res.status !== 206) {
    const body = await res.text();
    throw new Error(`Search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const text = await res.text();
  if (!text) return 0;
  const data = JSON.parse(text);
  return typeof data.totalcount === "number" ? data.totalcount : 0;
}

async function runGlpiSync(): Promise<void> {
  const settings = await storage.getGlpiSettings();
  if (!settings || !settings.enabled || !settings.url || !settings.appToken || !settings.userToken) {
    return;
  }

  const base = settings.url.replace(/\/+$/, "");
  const appToken = settings.appToken;

  // ── 1. Authenticate ──────────────────────────────────────────────────────
  let sessionToken: string;
  try {
    const initRes = await fetch(`${base}/apirest.php/initSession`, {
      headers: {
        "App-Token": appToken,
        "Authorization": `user_token ${settings.userToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!initRes.ok) {
      const body = await initRes.text();
      throw new Error(`initSession ${initRes.status}: ${body.slice(0, 200)}`);
    }
    const initData = await initRes.json();
    sessionToken = initData.session_token;
    if (!sessionToken) throw new Error("No session_token in GLPI response");
  } catch (err: any) {
    const msg = `Auth failed: ${err.message}`;
    console.error("[glpiSync]", msg);
    await storage.updateGlpiSyncStatus(null, msg);
    return;
  }

  // ── 2. Fetch ticket counts (propagate errors — do not silently zero out) ─
  const today = new Date().toISOString().split("T")[0];

  const openCriteria = [
    { field: 12, searchtype: "equals", value: "1" },
    { field: 12, searchtype: "equals", value: "2", link: "OR" },
    { field: 12, searchtype: "equals", value: "3", link: "OR" },
    { field: 12, searchtype: "equals", value: "4", link: "OR" },
  ];
  const newTodayCriteria = [
    { field: 15, searchtype: "contains", value: today },
  ];
  const resolvedTodayCriteria = [
    { field: 12, searchtype: "equals", value: "5" },
    { field: 12, searchtype: "equals", value: "6", link: "OR" },
    { field: 16, searchtype: "contains", value: today, link: "AND" },
  ];

  let openCount: number;
  let newTodayCount: number;
  let resolvedTodayCount: number;

  try {
    [openCount, newTodayCount, resolvedTodayCount] = await Promise.all([
      countTickets(base, appToken, sessionToken, openCriteria),
      countTickets(base, appToken, sessionToken, newTodayCriteria),
      countTickets(base, appToken, sessionToken, resolvedTodayCriteria),
    ]);
  } catch (err: any) {
    const msg = `Query failed: ${err.message}`;
    console.error("[glpiSync]", msg);
    await storage.updateGlpiSyncStatus(null, msg);
    // Kill session without crashing
    try { await fetch(`${base}/apirest.php/killSession`, { headers: { "App-Token": appToken, "Session-Token": sessionToken } }); } catch {}
    return;
  }

  // ── 3. Kill session ───────────────────────────────────────────────────────
  try {
    await fetch(`${base}/apirest.php/killSession`, {
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    });
  } catch {}

  // ── 4. Ensure KPIs exist, then upsert values ──────────────────────────────
  const allKpis = await storage.getItKpis();
  const kpiMap: Record<string, number> = {};
  for (const def of GLPI_KPI_DEFS) {
    let kpi = allKpis.find(k => k.name === def.name);
    if (!kpi) {
      kpi = await storage.createItKpi({
        name: def.name,
        labelEn: def.labelEn,
        labelPt: def.labelPt,
        unit: def.unit,
        sortOrder: 90 + GLPI_KPI_DEFS.indexOf(def),
        isActive: true,
      });
    }
    kpiMap[def.name] = kpi.id;
  }

  const monthDate = today.substring(0, 7) + "-01";
  await storage.upsertItKpiValues([
    { kpiId: kpiMap["open_tickets"],   periodType: "daily",   periodDate: today,     value: String(openCount) },
    { kpiId: kpiMap["open_tickets"],   periodType: "monthly", periodDate: monthDate,  value: String(openCount) },
    { kpiId: kpiMap["new_today"],      periodType: "daily",   periodDate: today,     value: String(newTodayCount) },
    { kpiId: kpiMap["resolved_today"], periodType: "daily",   periodDate: today,     value: String(resolvedTodayCount) },
  ]);

  // ── 5. Record successful sync ─────────────────────────────────────────────
  await storage.updateGlpiSyncStatus(new Date(), null);
  console.log(`[glpiSync] Synced — open=${openCount} new=${newTodayCount} resolved=${resolvedTodayCount}`);
}

/** Returns the lastError string if sync failed, null if successful */
export async function triggerGlpiSync(): Promise<string | null> {
  await runGlpiSync();
  const settings = await storage.getGlpiSettings();
  return settings?.lastError ?? null;
}

async function reschedule() {
  try {
    const settings = await storage.getGlpiSettings();
    const intervalMs = Math.max(1, settings?.syncIntervalMinutes ?? 15) * 60 * 1000;
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(async () => {
      await runGlpiSync().catch(err => console.error("[glpiSync] Sync error:", err));
      reschedule();
    }, intervalMs);
  } catch {}
}

/** Call after saving settings to apply the new interval immediately */
export function rescheduleGlpiSync(): void {
  reschedule().catch(() => {});
}

export function startGlpiSync(): void {
  runGlpiSync().catch(err => console.error("[glpiSync] Initial sync error:", err));
  reschedule();
}
