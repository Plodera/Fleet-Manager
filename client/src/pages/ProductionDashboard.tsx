import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Zap, Layers, TrendingUp, Package, BarChart3, Flame, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────

type RollingMillReport = {
  id: number;
  receivedAt: string;
  reportDate: string;
  shift: string;
  isDailyTotal: boolean;
  tonsProduced: string | null;
  billetsTaken: number | null;
  billetsRolled: number | null;
  missRoll: number | null;
  cobleCut: number | null;
  hotOut: number | null;
  breakdownMinutes: number | null;
  billetSize: string | null;
  size: string | null;
  millSpeed: string | null;
  timeFrom: string | null;
  timeTo: string | null;
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

type Kpis = {
  rollingMill: {
    todayTons: string;
    mtdTons: string;
    todayShifts: number;
    todayBilletsTaken: number;
    mtdBilletsTaken: number;
    todayBilletsRolled: number;
    mtdBilletsRolled: number;
    todayMissRoll: number;
    mtdMissRoll: number;
    todayCobleCut: number;
    mtdCobleCut: number;
    todayHotOut: number;
    mtdHotOut: number;
    todayBreakdownMin: number;
    mtdBreakdownMin: number;
    lastReport: RollingMillReport | null;
  };
  sms: {
    todayHeats: number;
    mtdHeats: number;
    todayKwh: string;
    mtdKwh: string;
    lastReport: SmsReport | null;
  };
  ccm: {
    todayBillets: number;
    mtdBillets: number;
    todaySequences: number;
    lastReport: CcmReport | null;
  };
};

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({
  label, value, unit, subLabel, subValue, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  subLabel?: string;
  subValue?: string | number;
  icon: React.ElementType;
  color: string;
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

type TrendEntry = { date: string } & Record<string, number>;

function buildTrendData(
  reports: RollingMillReport[] | SmsReport[] | CcmReport[],
  dateKey: keyof (RollingMillReport & SmsReport & CcmReport),
  valueKey: keyof (RollingMillReport & SmsReport & CcmReport),
  label: string,
): TrendEntry[] {
  const byDate: Record<string, number> = {};
  for (const r of reports) {
    const d = r[dateKey] as string | undefined;
    if (!d) continue;
    const raw = r[valueKey];
    const v = typeof raw === "number" ? raw : parseFloat((raw as string) || "0") || 0;
    byDate[d] = (byDate[d] || 0) + v;
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductionDashboard() {
  const { t } = useLanguage();
  const prod = t.production;

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

  // Only use non-total records for trend charts (avoid double-counting daily totals)
  const rmShiftReports = rmReports.filter(r => !r.isDailyTotal);
  const rmTrendData = buildTrendData(rmShiftReports, "reportDate", "tonsProduced", "Tons");
  const smsTrendData = buildTrendData(smsReports, "reportDate", "totalKwh", "kWh");
  const ccmTrendData = buildTrendData(ccmReports, "reportDate", "noBillets", "Billets");

  return (
    <div className="space-y-6">
      <PageHeader
        title={prod.dashboardTitle}
        description={prod.dashboardSubtitle}
      />

      {/* Rolling Mill KPI Row */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4" /> {prod.rollingMill}
        </h2>
        {kpisLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-5 h-24 animate-pulse bg-muted/40" /></Card>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <KpiCard
              label={prod.rmTodayTons}
              value={kpis.rollingMill.todayTons}
              unit="t"
              subLabel={prod.mtd}
              subValue={`${kpis.rollingMill.mtdTons} t`}
              icon={Layers}
              color="text-blue-600"
            />
            <KpiCard
              label={prod.billetsTaken}
              value={kpis.rollingMill.todayBilletsTaken}
              subLabel={prod.mtd}
              subValue={kpis.rollingMill.mtdBilletsTaken}
              icon={Package}
              color="text-indigo-600"
            />
            <KpiCard
              label={prod.billetsRolled}
              value={kpis.rollingMill.todayBilletsRolled}
              subLabel={prod.mtd}
              subValue={kpis.rollingMill.mtdBilletsRolled}
              icon={TrendingUp}
              color="text-violet-600"
            />
            <KpiCard
              label={prod.missRoll}
              value={kpis.rollingMill.todayMissRoll}
              subLabel={prod.mtd}
              subValue={kpis.rollingMill.mtdMissRoll}
              icon={Flame}
              color="text-orange-500"
            />
            <KpiCard
              label={prod.cobleCut}
              value={kpis.rollingMill.todayCobleCut}
              subLabel={prod.mtd}
              subValue={kpis.rollingMill.mtdCobleCut}
              icon={Package}
              color="text-pink-500"
            />
            <KpiCard
              label={prod.hotOut}
              value={kpis.rollingMill.todayHotOut}
              subLabel={prod.mtd}
              subValue={kpis.rollingMill.mtdHotOut}
              icon={Wrench}
              color="text-red-500"
            />
            <KpiCard
              label={prod.breakdownMinutes}
              value={kpis.rollingMill.todayBreakdownMin}
              unit="min"
              subLabel={prod.mtd}
              subValue={`${kpis.rollingMill.mtdBreakdownMin} min`}
              icon={BarChart3}
              color="text-yellow-600"
            />
          </div>
        ) : null}
      </div>

      {/* SMS + CCM KPI Row */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" /> {prod.sms} / <Factory className="w-4 h-4 ml-1" /> {prod.ccm}
        </h2>
        {kpisLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-5 h-24 animate-pulse bg-muted/40" /></Card>
            ))}
          </div>
        ) : kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              label={prod.smsTodayHeats}
              value={kpis.sms.todayHeats}
              subLabel={prod.mtd}
              subValue={kpis.sms.mtdHeats}
              icon={Flame}
              color="text-orange-500"
            />
            <KpiCard
              label={prod.smsTodayKwh}
              value={parseInt(kpis.sms.todayKwh).toLocaleString()}
              unit="kWh"
              subLabel={prod.mtd}
              subValue={`${parseInt(kpis.sms.mtdKwh).toLocaleString()} kWh`}
              icon={Zap}
              color="text-yellow-600"
            />
            <KpiCard
              label={prod.ccmTodayBillets}
              value={kpis.ccm.todayBillets}
              subLabel={prod.mtd}
              subValue={kpis.ccm.mtdBillets}
              icon={Package}
              color="text-green-600"
            />
            <KpiCard
              label={prod.ccmSequences}
              value={kpis.ccm.todaySequences}
              subLabel={prod.section}
              subValue={prod.ccm}
              icon={Factory}
              color="text-teal-600"
            />
          </div>
        ) : null}
      </div>

      {/* Trend Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" />
              {prod.rollingMill} — {prod.trendTons}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rmTrendData.length === 0 ? <EmptyState message={prod.noData} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={rmTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} t`, "Tons"]} />
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
              {prod.sms} — {prod.trendKwh}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {smsTrendData.length === 0 ? <EmptyState message={prod.noData} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={smsTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v} kWh`, "kWh"]} />
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
              {prod.ccm} — {prod.trendBillets}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ccmTrendData.length === 0 ? <EmptyState message={prod.noData} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ccmTrendData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => [`${v}`, "Billets"]} />
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
            {prod.rollingMill}
          </TabsTrigger>
          <TabsTrigger value="sms" data-testid="tab-sms">
            <Zap className="w-3.5 h-3.5 mr-1.5" />
            {prod.sms}
          </TabsTrigger>
          <TabsTrigger value="ccm" data-testid="tab-ccm">
            <Factory className="w-3.5 h-3.5 mr-1.5" />
            {prod.ccm}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rolling-mill">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{prod.recentReports} — {prod.rollingMill}</CardTitle>
              <CardDescription className="text-xs">{prod.last50}</CardDescription>
            </CardHeader>
            <CardContent>
              {rmReports.length === 0 ? (
                <EmptyState message={prod.noReports} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{prod.reportDate}</TableHead>
                        <TableHead className="text-xs">{prod.shift}</TableHead>
                        <TableHead className="text-xs text-right">{prod.tonsProduced}</TableHead>
                        <TableHead className="text-xs text-right">{prod.billetsTaken}</TableHead>
                        <TableHead className="text-xs text-right">{prod.billetsRolled}</TableHead>
                        <TableHead className="text-xs text-right">{prod.missRoll}</TableHead>
                        <TableHead className="text-xs text-right">{prod.cobleCut}</TableHead>
                        <TableHead className="text-xs text-right">{prod.hotOut}</TableHead>
                        <TableHead className="text-xs text-right">{prod.breakdownMinutes}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rmReports.slice(0, 50).map(r => (
                        <TableRow key={r.id} data-testid={`row-rm-${r.id}`} className={r.isDailyTotal ? "bg-blue-50 dark:bg-blue-950/30 font-semibold" : ""}>
                          <TableCell className="text-xs font-medium">{formatDate(r.reportDate)}</TableCell>
                          <TableCell className="text-xs">
                            {r.isDailyTotal
                              ? <Badge className="text-[10px] px-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">{prod.isDailyTotal}</Badge>
                              : <Badge variant="outline" className="text-[10px] px-1">{r.shift || "—"}</Badge>
                            }
                          </TableCell>
                          <TableCell className="text-xs text-right">{r.tonsProduced ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.billetsTaken ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.billetsRolled ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.missRoll ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.cobleCut ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.hotOut ?? "—"}</TableCell>
                          <TableCell className="text-xs text-right">{r.breakdownMinutes ?? "—"}</TableCell>
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
              <CardTitle className="text-sm">{prod.recentReports} — {prod.sms}</CardTitle>
              <CardDescription className="text-xs">{prod.last50}</CardDescription>
            </CardHeader>
            <CardContent>
              {smsReports.length === 0 ? (
                <EmptyState message={prod.noReports} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{prod.reportDate}</TableHead>
                        <TableHead className="text-xs">{prod.shift}</TableHead>
                        <TableHead className="text-xs">{prod.heatNo}</TableHead>
                        <TableHead className="text-xs">{prod.startTime}</TableHead>
                        <TableHead className="text-xs">{prod.tapingTime}</TableHead>
                        <TableHead className="text-xs text-right">{prod.tapToTapMinutes}</TableHead>
                        <TableHead className="text-xs text-right">{prod.tapingTempC}</TableHead>
                        <TableHead className="text-xs text-right">{prod.ladleTempC}</TableHead>
                        <TableHead className="text-xs text-right">{prod.totalKwh}</TableHead>
                        <TableHead className="text-xs text-right">{prod.fcTons}</TableHead>
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
              <CardTitle className="text-sm">{prod.recentReports} — {prod.ccm}</CardTitle>
              <CardDescription className="text-xs">{prod.last50}</CardDescription>
            </CardHeader>
            <CardContent>
              {ccmReports.length === 0 ? (
                <EmptyState message={prod.noReports} />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{prod.reportDate}</TableHead>
                        <TableHead className="text-xs">{prod.shift}</TableHead>
                        <TableHead className="text-xs">{prod.incharge}</TableHead>
                        <TableHead className="text-xs">{prod.heatNo}</TableHead>
                        <TableHead className="text-xs text-right">{prod.noBillets}</TableHead>
                        <TableHead className="text-xs text-right">{prod.strandsRun}</TableHead>
                        <TableHead className="text-xs">{prod.ladleNo}</TableHead>
                        <TableHead className="text-xs">{prod.tundishNo}</TableHead>
                        <TableHead className="text-xs text-right">{prod.sequence}</TableHead>
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
                          <TableCell className="text-xs">{r.tundishNo || "—"}</TableCell>
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
