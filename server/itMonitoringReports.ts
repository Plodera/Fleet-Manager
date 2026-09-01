import { sendEmail } from "./email";
import { storage } from "./storage";

export type ItWeekRange = { weekStart: string; weekEnd: string; from: Date; to: Date };

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getPreviousWeekRange(reference = new Date()): ItWeekRange {
  const current = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const daysSinceMonday = (current.getUTCDay() + 6) % 7;
  const thisMonday = new Date(current);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - daysSinceMonday);
  const start = new Date(thisMonday);
  start.setUTCDate(start.getUTCDate() - 7);
  const end = new Date(thisMonday);
  return { weekStart: isoDate(start), weekEnd: isoDate(end), from: start, to: end };
}

export function buildFollowUpSummary(issues: Array<{ status: string; targetDate?: string | null }>, today = new Date()): Record<string, number> {
  const todayText = isoDate(today);
  return issues.reduce((summary, issue) => {
    summary.total += 1;
    if (issue.status === "resolved") summary.resolved += 1;
    else if (issue.targetDate && issue.targetDate < todayText) summary.overdue += 1;
    else summary.open += 1;
    return summary;
  }, { total: 0, open: 0, resolved: 0, overdue: 0 });
}

export function aggregateBandwidthRows(rows: Array<{ day: string; interfaceName: string; txMbpsTotal: number; rxMbpsTotal: number }>) {
  return rows.reduce((days: Record<string, { day: string; tx: number; rx: number }>, row) => {
    days[row.day] ||= { day: row.day, tx: 0, rx: 0 };
    days[row.day].tx += Number(row.txMbpsTotal || 0);
    days[row.day].rx += Number(row.rxMbpsTotal || 0);
    return days;
  }, {});
}

export async function generateWeeklyItReport(options: { reference?: Date; email?: boolean } = {}) {
  const range = getPreviousWeekRange(options.reference);
  const [hosts, issues, bandwidth] = await Promise.all([
    storage.getItMonitoringSummary(range.from, range.to),
    storage.getItNetworkIssues(),
    storage.getItMonthlyBandwidth(range.from, range.to),
  ]);

  const periodIssues = issues.filter((issue: any) => {
    const started = new Date(issue.startedAt).getTime();
    const resolved = issue.resolvedAt ? new Date(issue.resolvedAt).getTime() : 0;
    return started < range.to.getTime() && (!resolved || resolved >= range.from.getTime());
  });
  const reportJson = {
    generatedAt: new Date().toISOString(),
    period: { weekStart: range.weekStart, weekEnd: range.weekEnd },
    hosts,
    outages: periodIssues.filter((issue: any) => issue.issueType === "outage"),
    performanceIssues: periodIssues.filter((issue: any) => issue.issueType === "performance"),
    openIssues: issues.filter((issue: any) => issue.status !== "resolved"),
    followUp: buildFollowUpSummary(issues),
    bandwidth: {
      samples: bandwidth,
      interfaces: Array.from(new Set(bandwidth.map((row: any) => row.interfaceName))),
    },
  };
  const report = await storage.createItMonitoringReport({
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    reportJson,
  });

  const settings = await storage.getItMonitoringSettings();
  const recipients = settings?.reportRecipients ?? [];
  if ((options.email || settings?.emailReports) && recipients.length > 0) {
    const body = [
      `IT monitoring report: ${range.weekStart} to ${range.weekEnd}`,
      "",
      `Hosts monitored: ${hosts.length}`,
      `Open issues: ${reportJson.openIssues.length}`,
      `Outages in period: ${reportJson.outages.length}`,
      `Performance issues in period: ${reportJson.performanceIssues.length}`,
      `Bandwidth samples: ${bandwidth.reduce((total: number, row: any) => total + Number(row.samples || 0), 0)}`,
      "",
      "Please log in to review issue ownership, investigation notes, corrective actions, and resolutions.",
    ].join("\n");
    let sent = false;
    for (const recipient of recipients) {
      if (await sendEmail({ to: recipient, subject: `IT monitoring report — ${range.weekStart}`, body })) sent = true;
    }
    if (sent) await storage.markItMonitoringReportEmailed(report.id);
  }
  return report;
}

let reportTimer: ReturnType<typeof setInterval> | null = null;
let lastScheduleKey = "";

async function runScheduledReport() {
  const settings = (await storage.getItMonitoringSettings()) ?? {
    reportsEnabled: true,
    reportDayOfWeek: 1,
    reportHour: 8,
    reportRecipients: [],
    emailReports: false,
  };
  if (!settings.reportsEnabled) return;
  const now = new Date();
  const scheduleKey = `${isoDate(now)}-${settings.reportDayOfWeek}-${settings.reportHour}`;
  if (now.getUTCDay() !== settings.reportDayOfWeek % 7 || now.getUTCHours() < settings.reportHour || now.getUTCHours() > settings.reportHour + 1 || lastScheduleKey === scheduleKey) return;
  lastScheduleKey = scheduleKey;
  const range = getPreviousWeekRange(now);
  const existing = (await storage.getItMonitoringReports(100)).some(report => report.weekStart === range.weekStart);
  if (!existing) await generateWeeklyItReport();
}

export function startITMonitoringReports() {
  if (reportTimer) return;
  runScheduledReport().catch(error => console.error("[itReports] Scheduled report failed:", error));
  reportTimer = setInterval(() => {
    runScheduledReport().catch(error => console.error("[itReports] Scheduled report failed:", error));
  }, 15 * 60 * 1000);
}

export function stopITMonitoringReports() {
  if (reportTimer) clearInterval(reportTimer);
  reportTimer = null;
}