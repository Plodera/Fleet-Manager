import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import {
  ArrowLeft, Maximize, Minimize, Factory, Layers, Zap, Flame,
  Package, TrendingUp, Wrench, BarChart3, Activity, Timer, Sigma,
  ThermometerSun, Gauge
} from "lucide-react";

// ─── CSS animations (mirrors ITDashboard.tsx pattern) ─────────────────────────

const PAGE_CSS = `
/* === Scan line === */
@keyframes spScanLine {
  0%   { transform: translateY(0vh); opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}
.sp-scan-line {
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(251,146,60,0.04) 15%, rgba(251,146,60,0.18) 50%, rgba(251,146,60,0.04) 85%, transparent 100%);
  animation: spScanLine 12s linear infinite;
}

/* === Card entrance === */
@keyframes spFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.sp-card-enter { animation: spFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }

/* === KPI card glow – blue === */
@keyframes spGlowBlue {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); border-color: rgba(59,130,246,0.15); }
  50%      { box-shadow: 0 0 14px 3px rgba(59,130,246,0.14); border-color: rgba(59,130,246,0.5); }
}
.sp-glow-blue { border: 1px solid transparent; animation: spGlowBlue 3.5s ease-in-out infinite; }

/* === KPI card glow – amber === */
@keyframes spGlowAmber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: rgba(245,158,11,0.15); }
  50%      { box-shadow: 0 0 14px 3px rgba(245,158,11,0.14); border-color: rgba(245,158,11,0.5); }
}
.sp-glow-amber { border: 1px solid transparent; animation: spGlowAmber 3s ease-in-out infinite; }

/* === KPI card glow – green === */
@keyframes spGlowGreen {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: rgba(34,197,94,0.15); }
  50%      { box-shadow: 0 0 14px 3px rgba(34,197,94,0.14); border-color: rgba(34,197,94,0.5); }
}
.sp-glow-green { border: 1px solid transparent; animation: spGlowGreen 4s ease-in-out infinite; }

/* === Icon pulse === */
@keyframes spIconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.12); opacity: 0.8; }
}
.sp-icon-pulse { animation: spIconPulse 3s ease-in-out infinite; }

/* === Live dot blink === */
@keyframes spDotBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.2; transform: scale(0.65); }
}
.sp-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.sp-dot-blink { animation: spDotBlink 1.6s ease-in-out infinite; }
`;

// ─── Types ─────────────────────────────────────────────────────────────────────

type RollingMillReport = {
  id: number; reportDate: string; shift: string; isDailyTotal: boolean;
  tonsProduced: string | null; billetsTaken: number | null; billetsRolled: number | null;
  missRoll: number | null; cobleCut: number | null; hotOut: number | null;
  breakdownMinutes: number | null; source: string;
};
type SmsReport = {
  id: number; reportDate: string; shift: string; heatNo: string | null;
  totalKwh: string | null; fcTons: string | null; tapToTapMinutes: number | null; source: string;
};
type CcmReport = {
  id: number; reportDate: string; shift: string; heatNo: string | null;
  noBillets: number | null; strandsRun: number | null; sequence: number | null; source: string;
};
type Kpis = {
  rollingMill: {
    todayTons: string; mtdTons: string; todayShifts: number;
    todayBilletsTaken: number; mtdBilletsTaken: number;
    todayBilletsRolled: number; mtdBilletsRolled: number;
    todayMissRoll: number; mtdMissRoll: number;
    todayCobleCut: number; mtdCobleCut: number;
    todayHotOut: number; mtdHotOut: number;
    todayBreakdownMin: number; mtdBreakdownMin: number;
  };
  sms: { todayHeats: number; mtdHeats: number; todayKwh: string; mtdKwh: string; };
  ccm: { todayBillets: number; mtdBillets: number; todaySequences: number; };
};

// ─── Shared hooks ──────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef<number>(-1);
  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    const startTime = performance.now();
    const startVal = display;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(startVal + (target - startVal) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return display;
}

function useCountUpFloat(target: number, decimals = 2, duration = 900) {
  const [display, setDisplay] = useState(0);
  const prevTarget = useRef<number>(-1);
  useEffect(() => {
    if (prevTarget.current === target) return;
    prevTarget.current = target;
    const startTime = performance.now();
    const startVal = display;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(parseFloat((startVal + (target - startVal) * eased).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return display.toFixed(decimals);
}

// ─── Shared components ─────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="text-right" data-testid="text-clock">
      <div className="text-xl font-mono font-bold tracking-wider text-gray-100">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
        {time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

function LiveDot({ color = "bg-orange-400" }: { color?: string }) {
  return <span className={`sp-dot sp-dot-blink ${color}`} aria-hidden="true" />;
}

function SectionLabel({ label, dot, icon: Icon }: { label: string; dot: string; icon: React.ElementType }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
      <LiveDot color={dot} />
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}

// ─── KPI card variants ──────────────────────────────────────────────────────────

type KpiCardConfig = {
  label: string;
  value: number | string;
  mtd?: number | string;
  unit?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  glowClass: string;
  idx: number;
};

function KpiCard({ label, value, mtd, unit, icon: Icon, iconBg, iconColor, glowClass, idx }: KpiCardConfig) {
  const isTextOnly = typeof value === "string" && isNaN(parseFloat(value));
  const numericValue = isTextOnly ? 0 : (typeof value === "number" ? value : parseFloat(value as string) || 0);
  const isFloat = !isTextOnly && typeof value === "string" && value.includes(".");
  const countedInt = useCountUp(isFloat ? 0 : numericValue);
  const countedFloat = useCountUpFloat(isFloat ? numericValue : 0, 2);
  const displayValue = isTextOnly ? value : (isFloat ? countedFloat : countedInt);

  return (
    <div
      className={`bg-[#111827] rounded-xl p-4 flex flex-col justify-between sp-card-enter ${glowClass}`}
      style={{ animationDelay: `${idx * 60}ms` }}
      data-testid={`kpi-card-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 leading-tight">{label}</span>
        <div className={`w-7 h-7 rounded-lg ${iconBg} flex items-center justify-center shrink-0 sp-icon-pulse`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black leading-none ${iconColor}`}>{displayValue}</span>
        {unit && <span className="text-xs text-gray-500 font-medium">{unit}</span>}
      </div>
      {mtd !== undefined && (
        <div className="mt-1.5">
          <span className="text-xs text-gray-600">
            MTD: <span className={`font-semibold ${iconColor} opacity-80`}>{mtd}{unit ? ` ${unit}` : ""}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Trend chart (dark-styled) ─────────────────────────────────────────────────

type TrendEntry = { date: string } & Record<string, number>;

function buildTrendData(
  reports: (RollingMillReport | SmsReport | CcmReport)[],
  dateKey: string,
  valueKey: string,
  label: string,
): TrendEntry[] {
  const byDate: Record<string, number> = {};
  for (const r of reports) {
    const d = (r as Record<string, unknown>)[dateKey] as string | undefined;
    if (!d) continue;
    const raw = (r as Record<string, unknown>)[valueKey];
    const v = typeof raw === "number" ? raw : parseFloat((raw as string) || "0") || 0;
    byDate[d] = (byDate[d] || 0) + v;
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, val]) => ({ date: date.slice(5), [label]: parseFloat(val.toFixed(2)) }));
}

function DarkBarChart({
  data, dataKey, color, unit, emptyMsg,
}: {
  data: TrendEntry[]; dataKey: string; color: string; unit: string; emptyMsg: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[110px] text-gray-700 text-xs">{emptyMsg}</div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart data={data} margin={{ top: 4, right: 2, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11, color: "#f9fafb" }}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          formatter={(v: number) => [`${v} ${unit}`, dataKey]}
        />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function SteelProductionTVDashboard() {
  const { t } = useLanguage();
  const prod = t.production;
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { data: kpis } = useQuery<Kpis>({
    queryKey: ["/api/production/kpis"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: rmReports = [] } = useQuery<RollingMillReport[]>({
    queryKey: ["/api/production/rolling-mill"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: smsReports = [] } = useQuery<SmsReport[]>({
    queryKey: ["/api/production/sms"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const { data: ccmReports = [] } = useQuery<CcmReport[]>({
    queryKey: ["/api/production/ccm"],
    refetchInterval: 30000,
    staleTime: 0,
  });

  const rmShiftReports = rmReports.filter(r => !r.isDailyTotal);
  const rmTrend = buildTrendData(rmShiftReports, "reportDate", "tonsProduced", "Tons");
  const smsTrend = buildTrendData(smsReports, "reportDate", "totalKwh", "kWh");
  const ccmTrend = buildTrendData(ccmReports, "reportDate", "noBillets", "Billets");

  const rm = kpis?.rollingMill;
  const sms = kpis?.sms;
  const ccm = kpis?.ccm;

  return (
    <div
      ref={containerRef}
      className="bg-[#0a0e1a] text-white flex flex-col h-screen overflow-hidden relative"
      data-testid="sp-dashboard-container"
    >
      <style>{PAGE_CSS}</style>
      <div className="sp-scan-line" aria-hidden="true" />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-gray-800 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/production-config">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" data-testid="link-back">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-orange-400 sp-icon-pulse" />
            <div>
              <h1 className="text-lg font-bold text-gray-100 leading-tight" data-testid="text-dashboard-title">
                {prod.dashboardTitle || "Steel Production"}
              </h1>
              <span className="text-xs text-gray-500">{prod.dashboardSubtitle || "Live KPI Dashboard"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {rm && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5" data-testid="text-rm-today-tons">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-400 font-bold">{rm.todayTons} t</span>
                <span>today</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="text-sms-today-heats">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-bold">{sms?.todayHeats ?? 0}</span>
                <span>heats</span>
              </div>
              <div className="flex items-center gap-1.5" data-testid="text-ccm-today-billets">
                <Package className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-bold">{ccm?.todayBillets ?? 0}</span>
                <span>billets</span>
              </div>
            </div>
          )}
          <button onClick={toggleFullScreen} className="text-gray-500 hover:text-gray-300 transition-colors" data-testid="button-fullscreen">
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <LiveClock />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-hidden relative z-10">

        {/* Rolling Mill — blue */}
        <div data-testid="section-rolling-mill">
          <SectionLabel label={prod.rollingMill || "Rolling Mill"} dot="bg-blue-400" icon={Layers} />
          <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
            <KpiCard label={prod.rmTodayTons || "Tons Today"} value={parseFloat(rm?.todayTons ?? "0")} mtd={rm ? `${rm.mtdTons}` : "—"} unit="t"
              icon={Layers} iconBg="bg-blue-500/15" iconColor="text-blue-400" glowClass="sp-glow-blue" idx={0} />
            <KpiCard label={prod.billetsTaken || "Billets Taken"} value={rm?.todayBilletsTaken ?? 0} mtd={rm?.mtdBilletsTaken}
              icon={Package} iconBg="bg-indigo-500/15" iconColor="text-indigo-400" glowClass="sp-glow-blue" idx={1} />
            <KpiCard label={prod.billetsRolled || "Billets Rolled"} value={rm?.todayBilletsRolled ?? 0} mtd={rm?.mtdBilletsRolled}
              icon={TrendingUp} iconBg="bg-violet-500/15" iconColor="text-violet-400" glowClass="sp-glow-blue" idx={2} />
            <KpiCard label={prod.missRoll || "Miss Roll"} value={rm?.todayMissRoll ?? 0} mtd={rm?.mtdMissRoll}
              icon={Activity} iconBg="bg-sky-500/15" iconColor="text-sky-400" glowClass="sp-glow-blue" idx={3} />
            <KpiCard label={prod.cobleCut || "Coble Cut"} value={rm?.todayCobleCut ?? 0} mtd={rm?.mtdCobleCut}
              icon={Flame} iconBg="bg-blue-500/15" iconColor="text-blue-300" glowClass="sp-glow-blue" idx={4} />
            <KpiCard label={prod.hotOut || "Hot Out"} value={rm?.todayHotOut ?? 0} mtd={rm?.mtdHotOut}
              icon={ThermometerSun} iconBg="bg-cyan-500/15" iconColor="text-cyan-400" glowClass="sp-glow-blue" idx={5} />
            <KpiCard label={prod.breakdownMinutes || "Breakdown"} value={rm?.todayBreakdownMin ?? 0} mtd={rm?.mtdBreakdownMin} unit="min"
              icon={Wrench} iconBg="bg-slate-500/15" iconColor="text-slate-400" glowClass="sp-glow-blue" idx={6} />
            <KpiCard label={prod.rmShifts || "Shifts"} value={rm?.todayShifts ?? 0}
              icon={Timer} iconBg="bg-blue-500/15" iconColor="text-blue-400" glowClass="sp-glow-blue" idx={7} />
          </div>
        </div>

        {/* SMS + CCM — amber / green */}
        <div className="flex gap-4 min-h-0" data-testid="section-sms-ccm">
          {/* SMS */}
          <div className="flex-1 min-w-0">
            <SectionLabel label={prod.sms || "SMS / Steel Melting"} dot="bg-amber-400" icon={Zap} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label={prod.smsTodayHeats || "Heats Today"} value={sms?.todayHeats ?? 0} mtd={sms?.mtdHeats}
                icon={Flame} iconBg="bg-amber-500/15" iconColor="text-amber-400" glowClass="sp-glow-amber" idx={0} />
              <KpiCard label={prod.smsTodayKwh || "kWh Today"} value={parseInt(sms?.todayKwh ?? "0")} mtd={parseInt(sms?.mtdKwh ?? "0")} unit="kWh"
                icon={Zap} iconBg="bg-yellow-500/15" iconColor="text-yellow-400" glowClass="sp-glow-amber" idx={1} />
              <KpiCard label={prod.fcTons || "F/C Tons"} value={0} mtd={undefined}
                icon={Sigma} iconBg="bg-orange-500/15" iconColor="text-orange-400" glowClass="sp-glow-amber" idx={2} />
              <KpiCard label={prod.section || "Section"} value={prod.sms || "SMS"} mtd={undefined}
                icon={Gauge} iconBg="bg-amber-500/15" iconColor="text-amber-300" glowClass="sp-glow-amber" idx={3} />
            </div>
          </div>

          {/* CCM */}
          <div className="flex-1 min-w-0">
            <SectionLabel label={prod.ccm || "CCM / Casting"} dot="bg-green-400" icon={Factory} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KpiCard label={prod.ccmTodayBillets || "Billets Today"} value={ccm?.todayBillets ?? 0} mtd={ccm?.mtdBillets}
                icon={Package} iconBg="bg-green-500/15" iconColor="text-green-400" glowClass="sp-glow-green" idx={0} />
              <KpiCard label={prod.ccmSequences || "Sequences"} value={ccm?.todaySequences ?? 0}
                icon={BarChart3} iconBg="bg-teal-500/15" iconColor="text-teal-400" glowClass="sp-glow-green" idx={1} />
              <KpiCard label={prod.section || "Section"} value={prod.ccm || "CCM"}
                icon={Factory} iconBg="bg-emerald-500/15" iconColor="text-emerald-400" glowClass="sp-glow-green" idx={2} />
            </div>
          </div>
        </div>

        {/* Trend charts — bottom panel */}
        <div className="flex gap-4 min-h-0 flex-1" data-testid="section-charts">
          {/* Rolling Mill trend */}
          <div className="flex-1 min-w-0 bg-[#111827] rounded-xl border border-gray-800/60 p-4 sp-card-enter" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="sp-dot sp-dot-blink bg-blue-400" />
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {prod.rollingMill || "Rolling Mill"} — {prod.trendTons || "Tons (30d)"}
              </span>
            </div>
            <DarkBarChart data={rmTrend} dataKey="Tons" color="#3b82f6" unit="t" emptyMsg={prod.noData || "No data yet"} />
          </div>

          {/* SMS trend */}
          <div className="flex-1 min-w-0 bg-[#111827] rounded-xl border border-gray-800/60 p-4 sp-card-enter" style={{ animationDelay: "280ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="sp-dot sp-dot-blink bg-amber-400" />
              <Zap className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {prod.sms || "SMS"} — {prod.trendKwh || "kWh (30d)"}
              </span>
            </div>
            <DarkBarChart data={smsTrend} dataKey="kWh" color="#f59e0b" unit="kWh" emptyMsg={prod.noData || "No data yet"} />
          </div>

          {/* CCM trend */}
          <div className="flex-1 min-w-0 bg-[#111827] rounded-xl border border-gray-800/60 p-4 sp-card-enter" style={{ animationDelay: "360ms" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="sp-dot sp-dot-blink bg-green-400" />
              <Factory className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {prod.ccm || "CCM"} — {prod.trendBillets || "Billets (30d)"}
              </span>
            </div>
            <DarkBarChart data={ccmTrend} dataKey="Billets" color="#10b981" unit="" emptyMsg={prod.noData || "No data yet"} />
          </div>
        </div>
      </main>
    </div>
  );
}
