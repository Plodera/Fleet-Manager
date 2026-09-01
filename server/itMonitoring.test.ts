import { describe, expect, it } from "vitest";
import { calculateAvailability } from "./itMonitor";
import { getSafePollIntervalMinutes } from "./fortigateSync";
import { aggregateBandwidthRows, buildFollowUpSummary, getMonthlyReportRange, getPreviousWeekRange } from "./itMonitoringReports";

describe("internet and network monitoring calculations", () => {
  it("calculates availability from retained checks", () => {
    expect(calculateAvailability([])).toBe(0);
    expect(calculateAvailability([{ isOnline: true }, { isOnline: true }, { isOnline: false }])).toBe(66.67);
  });

  it("caps FortiGate polling so configured monitoring has at least three daily opportunities", () => {
    expect(getSafePollIntervalMinutes(undefined)).toBe(1);
    expect(getSafePollIntervalMinutes(30)).toBe(30);
    expect(getSafePollIntervalMinutes(1440)).toBe(480);
  });

  it("aggregates monthly bandwidth rows by day", () => {
    expect(aggregateBandwidthRows([
      { day: "2026-08-01", interfaceName: "wan1", txMbpsTotal: 2, rxMbpsTotal: 3 },
      { day: "2026-08-01", interfaceName: "wan2", txMbpsTotal: 4, rxMbpsTotal: 5 },
    ])["2026-08-01"]).toEqual({ day: "2026-08-01", tx: 6, rx: 8 });
  });

  it("returns the previous complete Monday-to-Monday reporting range", () => {
    const range = getPreviousWeekRange(new Date("2026-09-01T12:00:00Z"));
    expect(range.weekStart).toBe("2026-08-24");
    expect(range.weekEnd).toBe("2026-08-31");
  });

  it("builds a monthly report range with a five-month uptime comparison window", () => {
    const range = getMonthlyReportRange("2026-05");
    expect(range.monthKey).toBe("2026-05");
    expect(range.from.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(range.comparisonFrom.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("tracks open, resolved, and overdue follow-up counts", () => {
    expect(buildFollowUpSummary([
      { status: "open", targetDate: "2026-08-01" },
      { status: "investigating", targetDate: "2026-12-01" },
      { status: "resolved" },
    ], new Date("2026-09-01T00:00:00Z"))).toEqual({ total: 3, open: 1, resolved: 1, overdue: 1 });
  });
});