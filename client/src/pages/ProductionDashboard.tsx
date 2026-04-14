import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Zap, Layers, TrendingUp, Package, Clock, BarChart3, Flame } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { PageHeader } from "@/components/PageHeader";

type Kpis = {
  rollingMill: {
    todayTons: string;
    mtdTons: string;
    todayShifts: number;
    lastReport: any;
  };
  sms: {
    todayHeats: number;
    mtdHeats: number;
    todayKwh: string;
    mtdKwh: string;
    lastReport: any;
  };
  ccm: {
    todayBillets: number;
    mtdBillets: number;
    todaySequences: number;
    lastReport: any;
  };
};

type RollingMillReport = {
  id: number;
  receivedAt: string;
  reportDate: string;
  shift: string;
  tonsProduced: string | null;
  billetsTaken: number | null;
  billetsRolled: number | null;
  missRoll: number | null;
  cobleCut: number | null;
  hotOut: number | null;
  breakdownMinutes: number | null;
  source: string;
};

type SmsReport = {
  id: number;
  receivedAt: string;
  reportDate: string;
  shift: string;
  heatNo: string | null;
  startTime: string | null;
  tapingTime: string | null;
  tapToTapMinutes: number | null;
  tapingTempC: number | null;
  ladleTempC: number | null;
  totalKwh: string | null;
  fcTons: string | null;
  source: string;
};

type CcmReport = {
  id: number;
  receivedAt: string;
  reportDate: string;
  shift: string;
  incharge: string | null;
  heatNo: string | null;
  noBillets: number | null;
  strandsRun: number | null;
  mouldLife1: number | null;
  mouldLife2: number | null;
  ladleNo: string | null;
  tundishNo: string | null;
  sequence: number | null;
  source: string;
};

function KpiCard({
  label, value, unit, subLabel, subValue, icon: Icon, color,
}: {
  label: string; value: string | number; unit?: string;
  subLabel?: string; subValue?: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <Card data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-3xl font-bold ${color}`}>{value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </div>
            {subLabel && (
              <p className="text-xs text-muted-foreground mt-1">
                {subLabel}: <span className="font-semibold text-foreground">{subValue}</span>
              </p>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.replace("text-", "bg-").replace("-600", "-100").replace("-500", "-100")}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function buildTrendData(reports: any[], dateKey: string, valueKey: string, label: string) {
  const byDate: Record<string, number> = {};
  for (const r of reports) {
    const d = r[dateKey];
    if (!d) continue;
    const v = parseFloat(r[valueKey] || "0") || (r[valueKey] ?? 0);
    byDate[d] = (byDate[d] || 0) + (typeof v === "number" ? v : parseFloat(v) || 0);
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, val]) => ({ date: date.slice(5), [label]: parseFloat(val.toFixed(2)) }));
}

function formatDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function ProductionDashboard() {
  const { t } = useLanguage();

  const { data: kpis, isLoading: kpisLoading } = useQuery<Kpis>({
    queryKey: ["/api/production/kpis"],
    refetchInterval: 60000,
    staleTime: 0,
  });

  const { data: rmReports = [] } = useQuery<RollingMillReport[]>({
    queryKey: ["/api/production/rolling-mill"],
    refetchInterval: 60000,
    staleTime: 0,
  });

  const { data: smsReports = [] } = useQuery<SmsReport[]>({
    queryKey: ["/api/production/sms"],
    refetchInterval: 60000,
    staleTime: 0,
  });

  const { data: ccmReports = [] } = useQuery<CcmReport[]>({
    queryKey: ["/api/production/ccm"],
    refetchInterval: 60000,
    staleTime: 0,
  });

  const rmTrendData = buildTrendData(rmReports, "reportDate", "tonsProduced", "Tons");
  const smsTrendData = buildTrendData(smsReports, "reportDate", "totalKwh", "kWh");
  const ccmTrendData = buildTrendData(ccmReports, "reportDate", "noBillets", "Billets");

  const prod = t.production || {} as any;

  return (
    <div className="space-y-6">
      <PageHeader
        title={prod.dashboardTitle || "Steel Production Dashboard"}
        description={prod.dashboardSubtitle || "Real-time KPIs from Rolling Mill, SMS, and CCM"}
      />

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-5 h-28 animate-pulse bg-muted/40" /></Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KpiCard label={prod.rmTodayTons || "Today Tons"} value={kpis.rollingMill.todayTons} unit="t" subLabel={prod.mtd || "MTD"} subValue={`${kpis.rollingMill.mtdTons} t`} icon={Layers} color="text-blue-600" />
          <KpiCard label={prod.rmShifts || "Today Shifts"} value={kpis.rollingMill.todayShifts} subLabel={prod.section || "Section"} subValue={prod.rollingMill || "Rolling Mill"} icon={TrendingUp} color="text-indigo-600" />
          <KpiCard label={prod.smsTodayHeats || "Today Heats"} value={kpis.sms.todayHeats} unit="" subLabel={prod.mtd || "MTD"} subValue={kpis.sms.mtdHeats} icon={Flame} color="text-orange-500" />
          <KpiCard label={prod.smsTodayKwh || "Today kWh"} value={parseInt(kpis.sms.todayKwh).toLocaleString()} unit="kWh" subLabel={prod.mtd || "MTD"} subValue={`${parseInt(kpis.sms.mtdKwh).toLocaleString()} kWh`} icon={Zap} color="text-yellow-600" />
          <KpiCard label={prod.ccmTodayBillets || "Today Billets"} value={kpis.ccm.todayBillets} subLabel={prod.mtd || "MTD"} subValue={kpis.ccm.mtdBillets} icon={Package} color="text-green-600" />
          <KpiCard label={prod.ccmSequences || "Sequences"} value={kpis.ccm.todaySequences} subLabel={prod.section || "Section"} subValue={prod.ccm || "CCM"} icon={Factory} color="text-teal-600" />
        </div>
      ) : null}

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              {prod.rollingMill || "Rolling Mill"} — {prod.trendTons || "Daily Tons (30d)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rmTrendData.length === 0 ? <EmptyState message={prod.noData || "No data yet"} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rmTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v} t`, "Tons"]} />
                  <Bar dataKey="Tons" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              {prod.sms || "SMS"} — {prod.trendKwh || "Daily kWh (30d)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {smsTrendData.length === 0 ? <EmptyState message={prod.noData || "No data yet"} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={smsTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v} kWh`, "kWh"]} />
                  <Bar dataKey="kWh" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Factory className="w-4 h-4 text-green-500" />
              {prod.ccm || "CCM"} — {prod.trendBillets || "Daily Billets (30d)"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ccmTrendData.length === 0 ? <EmptyState message={prod.noData || "No data yet"} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ccmTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v}`, "Billets"]} />
                  <Bar dataKey="Billets" fill="#10b981" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Report Tables */}
      <Tabs defaultValue="rolling-mill">
        <TabsList>
          <TabsTrigger value="rolling-mill" data-testid="tab-rolling-mill">
            <Layers className="w-3.5 h-3.5 mr-1.5" />
            {prod.rollingMill || "Rolling Mill"}
          </TabsTrigger>
          <TabsTrigger value="sms" data-testid="tab-sms">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {prod.sms || "SMS"}
          </TabsTrigger>
          <TabsTrigger value="ccm" data-testid="tab-ccm">
            <Factory className="w-3.5 h-3.5 mr-1.5" />
            {prod.ccm || "CCM"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rolling-mill">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{prod.recentReports || "Recent Reports"} — {prod.rollingMill || "Rolling Mill"}</CardTitle>
              <CardDescription className="text-xs">{prod.last50 || "Last 50 received records"}</CardDescription>
            </CardHeader>
            <CardContent>
              {rmReports.length === 0 ? (
                <EmptyState message={prod.noReports || "No reports received yet. Configure a Power Automate webhook to start."} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Shift</TableHead>
                        <TableHead className="text-xs text-right">Tons</TableHead>
                        <TableHead className="text-xs text-right">Billets Taken</TableHead>
                        <TableHead className="text-xs text-right">Rolled</TableHead>
                        <TableHead className="text-xs text-right">Miss Roll</TableHead>
                        <TableHead className="text-xs text-right">Coble Cut</TableHead>
                        <TableHead className="text-xs text-right">Hot Out</TableHead>
                        <TableHead className="text-xs text-right">B/D (min)</TableHead>
                        <TableHead className="text-xs">Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rmReports.slice(0, 50).map(r => (
                        <TableRow key={r.id} data-testid={`row-rm-${r.id}`}>
                          <TableCell className="text-xs font-medium">{formatDate(r.reportDate)}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px] px-1">{r.shift || "—"}</Badge></TableCell>
                          <TableCell className="text-xs text-right font-semibold">{r.tonsProduced ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.billetsTaken ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.billetsRolled ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.missRoll ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.cobleCut ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.hotOut ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.breakdownMinutes ?? "—"}</TableCell>
                          <TableCell className="text-xs"><Badge variant="secondary" className="text-[10px]">{r.source}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{prod.recentReports || "Recent Reports"} — {prod.sms || "SMS"}</CardTitle>
              <CardDescription className="text-xs">{prod.last50 || "Last 50 received records"}</CardDescription>
            </CardHeader>
            <CardContent>
              {smsReports.length === 0 ? (
                <EmptyState message={prod.noReports || "No reports received yet."} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Shift</TableHead>
                        <TableHead className="text-xs">Heat No.</TableHead>
                        <TableHead className="text-xs">Start</TableHead>
                        <TableHead className="text-xs">Taping</TableHead>
                        <TableHead className="text-xs text-right">Tap-to-Tap</TableHead>
                        <TableHead className="text-xs text-right">Taping °C</TableHead>
                        <TableHead className="text-xs text-right">Ladle °C</TableHead>
                        <TableHead className="text-xs text-right">kWh</TableHead>
                        <TableHead className="text-xs text-right">F/C C</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {smsReports.slice(0, 50).map(r => (
                        <TableRow key={r.id} data-testid={`row-sms-${r.id}`}>
                          <TableCell className="text-xs font-medium">{formatDate(r.reportDate)}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px] px-1">{r.shift || "—"}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{r.heatNo || "—"}</TableCell>
                          <TableCell className="text-xs">{r.startTime || "—"}</TableCell>
                          <TableCell className="text-xs">{r.tapingTime || "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.tapToTapMinutes != null ? `${r.tapToTapMinutes} min` : "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.tapingTempC ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.ladleTempC ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{r.totalKwh ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.fcTons ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ccm">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{prod.recentReports || "Recent Reports"} — {prod.ccm || "CCM"}</CardTitle>
              <CardDescription className="text-xs">{prod.last50 || "Last 50 received records"}</CardDescription>
            </CardHeader>
            <CardContent>
              {ccmReports.length === 0 ? (
                <EmptyState message={prod.noReports || "No reports received yet."} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Shift</TableHead>
                        <TableHead className="text-xs">Incharge</TableHead>
                        <TableHead className="text-xs">Heat No.</TableHead>
                        <TableHead className="text-xs text-right">Billets</TableHead>
                        <TableHead className="text-xs text-right">Strands</TableHead>
                        <TableHead className="text-xs">Ladle</TableHead>
                        <TableHead className="text-xs">Tundish</TableHead>
                        <TableHead className="text-xs text-right">Sequence</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ccmReports.slice(0, 50).map(r => (
                        <TableRow key={r.id} data-testid={`row-ccm-${r.id}`}>
                          <TableCell className="text-xs font-medium">{formatDate(r.reportDate)}</TableCell>
                          <TableCell className="text-xs"><Badge variant="outline" className="text-[10px] px-1">{r.shift || "—"}</Badge></TableCell>
                          <TableCell className="text-xs">{r.incharge || "—"}</TableCell>
                          <TableCell className="text-xs font-mono">{r.heatNo || "—"}</TableCell>
                          <TableCell className="text-xs text-right font-semibold">{r.noBillets ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.strandsRun ?? "—"}</TableCell>
                          <TableCell className="text-xs">{r.ladleNo || "—"}</TableCell>
                          <TableCell className="text-xs">{r.tundishNo ? `${r.tundishNo}` : "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.sequence ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
