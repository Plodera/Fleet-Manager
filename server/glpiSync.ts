import { storage } from "./storage";

let syncTimer: ReturnType<typeof setInterval> | null = null;

// Matches the 8 categories shown on the GLPI ticket dashboard
const GLPI_KPI_DEFS = [
  { name: "glpi_total",    labelEn: "Tickets",           labelPt: "Tickets",              unit: "tickets", sortOrder: 80 },
  { name: "glpi_new",      labelEn: "Incoming Tickets",  labelPt: "Tickets Entrada",      unit: "tickets", sortOrder: 81 },
  { name: "glpi_pending",  labelEn: "Pending Tickets",   labelPt: "Tickets Pendentes",    unit: "tickets", sortOrder: 82 },
  { name: "glpi_open",     labelEn: "Not Solved",        labelPt: "Não Resolvidos",       unit: "tickets", sortOrder: 83 },
  { name: "glpi_assigned", labelEn: "Assigned Tickets",  labelPt: "Tickets Atribuídos",   unit: "tickets", sortOrder: 84 },
  { name: "glpi_solved",   labelEn: "Solved Tickets",    labelPt: "Tickets Resolvidos",   unit: "tickets", sortOrder: 85 },
  { name: "glpi_planned",  labelEn: "Planned Tickets",   labelPt: "Tickets Planeados",    unit: "tickets", sortOrder: 86 },
  { name: "glpi_closed",   labelEn: "Closed Tickets",    labelPt: "Tickets Fechados",     unit: "tickets", sortOrder: 87 },
];

// GLPI status field IDs (field 12):
//   1 = New  |  2 = Processing (assigned)  |  3 = Processing (planned)
//   4 = Waiting (pending)  |  5 = Solved  |  6 = Closed

type Criterion = { field: number; searchtype: string; value: string; link?: string };

const STATUS_CRITERIA: Record<string, Criterion[]> = {
  glpi_total:    [
    { field: 12, searchtype: "equals", value: "1" },
    { field: 12, searchtype: "equals", value: "2", link: "OR" },
    { field: 12, searchtype: "equals", value: "3", link: "OR" },
    { field: 12, searchtype: "equals", value: "4", link: "OR" },
    { field: 12, searchtype: "equals", value: "5", link: "OR" },
    { field: 12, searchtype: "equals", value: "6", link: "OR" },
  ],
  glpi_new:      [{ field: 12, searchtype: "equals", value: "1" }],
  glpi_pending:  [{ field: 12, searchtype: "equals", value: "4" }],
  glpi_open:     [
    { field: 12, searchtype: "equals", value: "1" },
    { field: 12, searchtype: "equals", value: "2", link: "OR" },
    { field: 12, searchtype: "equals", value: "3", link: "OR" },
    { field: 12, searchtype: "equals", value: "4", link: "OR" },
  ],
  glpi_assigned: [{ field: 12, searchtype: "equals", value: "2" }],
  glpi_solved:   [{ field: 12, searchtype: "equals", value: "5" }],
  glpi_planned:  [{ field: 12, searchtype: "equals", value: "3" }],
  glpi_closed:   [{ field: 12, searchtype: "equals", value: "6" }],
};

function buildSearchUrl(base: string, criteria: Criterion[]): string {
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
  criteria: Criterion[],
): Promise<number> {
  const url = buildSearchUrl(base, criteria);
  const res = await fetch(url, {
    headers: { "App-Token": appToken, "Session-Token": sessionToken },
  });

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

  // ── 2. Fetch all 8 ticket counts in parallel ──────────────────────────────
  let counts: Record<string, number>;
  try {
    const results = await Promise.all(
      GLPI_KPI_DEFS.map(def => countTickets(base, appToken, sessionToken, STATUS_CRITERIA[def.name]))
    );
    counts = Object.fromEntries(GLPI_KPI_DEFS.map((def, i) => [def.name, results[i]]));
  } catch (err: any) {
    const msg = `Query failed: ${err.message}`;
    console.error("[glpiSync]", msg);
    await storage.updateGlpiSyncStatus(null, msg);
    try { await fetch(`${base}/apirest.php/killSession`, { headers: { "App-Token": appToken, "Session-Token": sessionToken } }); } catch {}
    return;
  }

  // ── 3. Kill session ───────────────────────────────────────────────────────
  try {
    await fetch(`${base}/apirest.php/killSession`, {
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    });
  } catch {}

  // ── 4. Ensure all 8 KPIs exist, then upsert values ───────────────────────
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
        sortOrder: def.sortOrder,
        isActive: true,
      });
    }
    kpiMap[def.name] = kpi.id;
  }

  const today = new Date().toISOString().split("T")[0];
  const monthDate = today.substring(0, 7) + "-01";

  const valuesToUpsert = GLPI_KPI_DEFS.flatMap(def => [
    { kpiId: kpiMap[def.name], periodType: "daily",   periodDate: today,      value: String(counts[def.name]) },
    { kpiId: kpiMap[def.name], periodType: "monthly",  periodDate: monthDate,  value: String(counts[def.name]) },
  ]);
  await storage.upsertItKpiValues(valuesToUpsert);

  // ── 5. Record successful sync ─────────────────────────────────────────────
  await storage.updateGlpiSyncStatus(new Date(), null);
  const summary = GLPI_KPI_DEFS.map(d => `${d.name.replace("glpi_", "")}=${counts[d.name]}`).join(" ");
  console.log(`[glpiSync] Synced — ${summary}`);
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
