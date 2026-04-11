import { storage } from "./storage";

let syncTimer: ReturnType<typeof setInterval> | null = null;

const GLPI_KPI_DEFS = [
  { name: "glpi_open_tickets",     labelEn: "Open Tickets",    labelPt: "Tickets Abertos",   unit: "tickets" },
  { name: "glpi_new_today",        labelEn: "New Today",       labelPt: "Novos Hoje",         unit: "tickets" },
  { name: "glpi_resolved_today",   labelEn: "Resolved Today",  labelPt: "Resolvidos Hoje",    unit: "tickets" },
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

async function glpiFetch(url: string, headers: Record<string, string>): Promise<any> {
  const res = await fetch(url, { headers });
  if (!res.ok && res.status !== 206) {
    const body = await res.text();
    throw new Error(`GLPI ${res.status}: ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

async function countTickets(
  base: string,
  appToken: string,
  sessionToken: string,
  criteria: Array<{ field: number; searchtype: string; value: string; link?: string }>,
): Promise<number> {
  const url = buildSearchUrl(base, criteria);
  const headers = { "App-Token": appToken, "Session-Token": sessionToken };
  try {
    const data = await glpiFetch(url, headers);
    return typeof data.totalcount === "number" ? data.totalcount : 0;
  } catch {
    return 0;
  }
}

async function runGlpiSync(): Promise<void> {
  const settings = await storage.getGlpiSettings();
  if (!settings || !settings.enabled || !settings.url || !settings.appToken || !settings.userToken) {
    return;
  }

  const base = settings.url.replace(/\/+$/, "");
  const appToken = settings.appToken;

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
    console.error("[glpiSync] Auth failed:", err.message);
    await storage.updateGlpiSyncStatus(null, `Auth failed: ${err.message}`);
    return;
  }

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

  const [openCount, newTodayCount, resolvedTodayCount] = await Promise.all([
    countTickets(base, appToken, sessionToken, openCriteria),
    countTickets(base, appToken, sessionToken, newTodayCriteria),
    countTickets(base, appToken, sessionToken, resolvedTodayCriteria),
  ]);

  try {
    await fetch(`${base}/apirest.php/killSession`, {
      headers: { "App-Token": appToken, "Session-Token": sessionToken },
    });
  } catch {}

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
    { kpiId: kpiMap["glpi_open_tickets"],   periodType: "daily",   periodDate: today,      value: String(openCount) },
    { kpiId: kpiMap["glpi_open_tickets"],   periodType: "monthly", periodDate: monthDate,   value: String(openCount) },
    { kpiId: kpiMap["glpi_new_today"],      periodType: "daily",   periodDate: today,      value: String(newTodayCount) },
    { kpiId: kpiMap["glpi_resolved_today"], periodType: "daily",   periodDate: today,      value: String(resolvedTodayCount) },
  ]);

  await storage.updateGlpiSyncStatus(new Date(), null);
  console.log(`[glpiSync] Synced — open=${openCount} new=${newTodayCount} resolved=${resolvedTodayCount}`);
}

export async function triggerGlpiSync(): Promise<void> {
  await runGlpiSync();
}

export function startGlpiSync(): void {
  runGlpiSync().catch(err => console.error("[glpiSync] Initial sync error:", err));

  if (syncTimer) clearInterval(syncTimer);

  const reschedule = async () => {
    try {
      const settings = await storage.getGlpiSettings();
      const intervalMs = Math.max(1, settings?.syncIntervalMinutes ?? 15) * 60 * 1000;
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(async () => {
        await runGlpiSync().catch(err => console.error("[glpiSync] Sync error:", err));
        reschedule();
      }, intervalMs);
    } catch {}
  };

  reschedule();
}
