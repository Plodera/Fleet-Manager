import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import {
  Wifi, WifiOff, Camera, Globe, Monitor, Network, ArrowLeft,
  Maximize, Minimize, TrendingUp, Target, Zap, Activity, Gauge,
  BarChart3, Flame, Droplets, Box, Layers, Settings2
} from "lucide-react";

const KPI_ICONS = [TrendingUp, Target, Zap, Activity, Gauge, Flame, Droplets, Box, Layers, Settings2, BarChart3];
const KPI_COLORS = [
  { bg: "bg-cyan-500/15", icon: "text-cyan-400", border: "border-cyan-500/20", accent: "text-cyan-400" },
  { bg: "bg-emerald-500/15", icon: "text-emerald-400", border: "border-emerald-500/20", accent: "text-emerald-400" },
  { bg: "bg-amber-500/15", icon: "text-amber-400", border: "border-amber-500/20", accent: "text-amber-400" },
  { bg: "bg-purple-500/15", icon: "text-purple-400", border: "border-purple-500/20", accent: "text-purple-400" },
  { bg: "bg-blue-500/15", icon: "text-blue-400", border: "border-blue-500/20", accent: "text-blue-400" },
  { bg: "bg-rose-500/15", icon: "text-rose-400", border: "border-rose-500/20", accent: "text-rose-400" },
  { bg: "bg-orange-500/15", icon: "text-orange-400", border: "border-orange-500/20", accent: "text-orange-400" },
  { bg: "bg-teal-500/15", icon: "text-teal-400", border: "border-teal-500/20", accent: "text-teal-400" },
];

const PAGE_CSS = `
@keyframes cardGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); } 50% { box-shadow: 0 0 8px 1px rgba(59, 130, 246, 0.08); } }
.it-kpi-glow { animation: cardGlow 4s ease-in-out infinite; }
@keyframes iconPulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.85; } }
.it-icon-pulse { animation: iconPulse 3s ease-in-out infinite; }
@keyframes statusPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
.it-online-pulse { animation: statusPulse 2s ease-in-out infinite; }
`;

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="text-right" data-testid="text-clock">
      <div className="text-2xl font-mono font-bold tracking-wider text-gray-100">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-xs text-gray-400 mt-0.5">
        {time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

function useCountUp(target: number | string, duration: number = 1200) {
  const [display, setDisplay] = useState("0");
  const prevTarget = useRef<string>("");

  useEffect(() => {
    const numVal = typeof target === "string" ? parseFloat(target) : target;
    const targetStr = String(target);
    if (isNaN(numVal) || targetStr === "-" || targetStr === "") {
      setDisplay(targetStr);
      prevTarget.current = targetStr;
      return;
    }
    if (prevTarget.current === targetStr) return;
    prevTarget.current = targetStr;
    const isDecimal = targetStr.includes(".");
    const decimalPlaces = isDecimal ? (targetStr.split(".")[1]?.length || 0) : 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentVal = numVal * eased;
      if (progress < 1) {
        setDisplay(isDecimal ? currentVal.toFixed(decimalPlaces) : Math.round(currentVal).toString());
        requestAnimationFrame(animate);
      } else {
        setDisplay(targetStr);
      }
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return display;
}

function AnimatedKpiValue({ value, unit }: { value: string; unit?: string | null }) {
  const display = useCountUp(value);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-bold text-white leading-none">{display}</span>
      {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
    </div>
  );
}

function KpiCard({ kpi, values, idx }: { kpi: any; values: any[]; idx: number }) {
  const color = KPI_COLORS[idx % KPI_COLORS.length];
  const IconComp = KPI_ICONS[idx % KPI_ICONS.length];
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7);
  const dailyVal = values.find(v => v.kpiId === kpi.id && v.periodType === "daily" && v.periodDate === today);
  const monthlyVal = values.find(v => v.kpiId === kpi.id && v.periodType === "monthly" && v.periodDate?.startsWith(currentMonth));

  return (
    <div className={`bg-[#111827] rounded-xl border ${color.border} p-3 flex flex-col justify-between it-kpi-glow`} data-testid={`card-kpi-${kpi.id}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 leading-tight">
          {kpi.labelEn || kpi.name}
        </span>
        <div className={`w-6 h-6 rounded-lg ${color.bg} flex items-center justify-center shrink-0 it-icon-pulse`}>
          <IconComp className={`w-3 h-3 ${color.icon}`} />
        </div>
      </div>
      <AnimatedKpiValue value={dailyVal ? dailyVal.value : "-"} unit={kpi.unit} />
      <div className="mt-1">
        <span className={`text-xs font-medium ${color.accent}`}>
          MTD: {monthlyVal ? monthlyVal.value : "-"}{kpi.unit ? ` ${kpi.unit}` : ""}
        </span>
      </div>
    </div>
  );
}

function HostStatusPill({ host }: { host: any }) {
  const isOnline = host.status?.isOnline;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
        isOnline
          ? "bg-green-900/30 border-green-700/40 text-green-300"
          : host.status
          ? "bg-red-900/30 border-red-700/40 text-red-300"
          : "bg-gray-800/40 border-gray-700/40 text-gray-500"
      }`}
      data-testid={`pill-host-${host.id}`}
    >
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5 it-online-pulse shrink-0" />
      ) : (
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
      )}
      <div className="min-w-0">
        <div className="font-semibold truncate">{host.name}</div>
        <div className="text-xs opacity-70">
          {host.ipAddress}
          {isOnline && host.status?.responseTimeMs != null && ` · ${host.status.responseTimeMs}ms`}
          {!host.status && " · never checked"}
        </div>
      </div>
      <div className={`ml-auto shrink-0 text-xs font-bold ${isOnline ? "text-green-400" : host.status ? "text-red-400" : "text-gray-600"}`}>
        {!host.status ? "—" : isOnline ? "UP" : "DOWN"}
      </div>
    </div>
  );
}

function CameraCard({ host }: { host: any }) {
  const isOnline = host.status?.isOnline;
  const checkedAt = host.status?.checkedAt ? new Date(host.status.checkedAt) : null;
  const timeStr = checkedAt ? checkedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-1.5 ${
        isOnline
          ? "bg-green-900/20 border-green-700/30"
          : host.status
          ? "bg-red-900/20 border-red-700/30"
          : "bg-gray-800/30 border-gray-700/30"
      }`}
      data-testid={`card-camera-${host.id}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? "bg-green-400 it-online-pulse" : host.status ? "bg-red-500" : "bg-gray-600"}`} />
        <span className="text-sm font-semibold text-gray-100 truncate">{host.name}</span>
      </div>
      <div className="text-xs text-gray-500 font-mono">{host.ipAddress}</div>
      <div className="text-xs text-gray-600">{timeStr}</div>
    </div>
  );
}

export default function ITDashboard() {
  const { t } = useLanguage();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: hosts = [] } = useQuery<any[]>({
    queryKey: ["/api/it/hosts"],
    queryFn: async () => {
      const res = await fetch("/api/it/hosts");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: kpis = [] } = useQuery<any[]>({
    queryKey: ["/api/it/kpis"],
    queryFn: async () => {
      const res = await fetch("/api/it/kpis");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7) + "-01";

  const { data: dailyValues = [] } = useQuery<any[]>({
    queryKey: ["/api/it/kpi-values", "daily", today],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=daily&periodDate=${today}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: monthlyValues = [] } = useQuery<any[]>({
    queryKey: ["/api/it/kpi-values", "monthly", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=monthly&periodDate=${currentMonth}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const allKpiValues = [...dailyValues, ...monthlyValues];

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

  const internetLinks = hosts.filter(h => h.hostType === "internet_link" && h.isActive);
  const cameras = hosts.filter(h => h.hostType === "camera" && h.isActive);
  const otherHosts = hosts.filter(h => h.hostType === "other" && h.isActive);
  const activeKpis = kpis.filter(k => k.isActive);

  const linksOnline = internetLinks.filter(h => h.status?.isOnline).length;
  const camerasOnline = cameras.filter(h => h.status?.isOnline).length;
  const otherOnline = otherHosts.filter(h => h.status?.isOnline).length;

  const it = t.itMonitor || ({} as any);

  return (
    <div
      ref={containerRef}
      className="bg-[#0a0e1a] text-white flex flex-col h-screen overflow-hidden"
      data-testid="it-dashboard-container"
    >
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/it-monitor-config">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" data-testid="link-back">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400" />
            <div>
              <h1 className="text-lg font-bold text-gray-100 leading-tight" data-testid="text-dashboard-title">
                {it.dashboardTitle || "IT Operations"}
              </h1>
              <span className="text-xs text-gray-500">{it.dashboardSubtitle || "Network Monitor"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* Summary counters */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {internetLinks.length > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-links-summary">
                <Globe className="w-3.5 h-3.5" />
                <span className="text-green-400 font-bold">{linksOnline}</span>
                <span>/</span>
                <span>{internetLinks.length}</span>
                <span>{it.linksUp || "links"}</span>
              </div>
            )}
            {cameras.length > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-cameras-summary">
                <Camera className="w-3.5 h-3.5" />
                <span className="text-green-400 font-bold">{camerasOnline}</span>
                <span>/</span>
                <span>{cameras.length}</span>
                <span>{it.camerasOnline || "cams"}</span>
              </div>
            )}
            {otherHosts.length > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-other-summary">
                <Monitor className="w-3.5 h-3.5" />
                <span className="text-green-400 font-bold">{otherOnline}</span>
                <span>/</span>
                <span>{otherHosts.length}</span>
              </div>
            )}
          </div>
          <button onClick={toggleFullScreen} className="text-gray-500 hover:text-gray-300 transition-colors" data-testid="button-fullscreen">
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <LiveClock />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-hidden">

        {/* Internet Links row */}
        {internetLinks.length > 0 && (
          <div data-testid="section-internet-links">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
              <Globe className="w-3.5 h-3.5" />
              {it.sectionInternetLinks || "Internet Links"}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(internetLinks.length, 4)}, minmax(0, 1fr))` }}>
              {internetLinks.map(host => (
                <HostStatusPill key={host.id} host={host} />
              ))}
            </div>
          </div>
        )}

        {/* Camera grid + KPIs */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
          {/* Camera grid */}
          {cameras.length > 0 && (
            <div className="flex-1 min-w-0 flex flex-col" data-testid="section-cameras">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" />
                {it.sectionCameras || "IP Cameras"}
                <span className="text-green-400 font-bold">{camerasOnline}/{cameras.length}</span>
              </div>
              <div
                className="flex-1 overflow-y-auto grid gap-2 content-start"
                style={{ gridTemplateColumns: `repeat(${Math.min(Math.ceil(cameras.length / 3) <= 2 ? 3 : 4, cameras.length, 6)}, minmax(120px, 1fr))` }}
              >
                {cameras.map(host => (
                  <CameraCard key={host.id} host={host} />
                ))}
              </div>
            </div>
          )}

          {/* Other hosts */}
          {otherHosts.length > 0 && (
            <div className="flex-1 min-w-0 flex flex-col" data-testid="section-other">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <Network className="w-3.5 h-3.5" />
                {it.sectionOther || "Other Hosts"}
              </div>
              <div className="flex flex-col gap-2">
                {otherHosts.map(host => (
                  <HostStatusPill key={host.id} host={host} />
                ))}
              </div>
            </div>
          )}

          {/* KPI cards */}
          {activeKpis.length > 0 && (
            <div className="w-72 shrink-0 flex flex-col" data-testid="section-kpis">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" />
                {it.sectionKpis || "KPIs"}
              </div>
              <div className="flex-1 grid gap-2 content-start" style={{ gridTemplateColumns: "1fr", gridAutoRows: "minmax(80px, auto)" }}>
                {activeKpis.map((kpi, idx) => (
                  <KpiCard key={kpi.id} kpi={kpi} values={allKpiValues} idx={idx} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty state */}
        {hosts.length === 0 && kpis.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <Network className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">{it.noData || "No hosts configured"}</p>
            <p className="text-sm mt-1">{it.noDataMessage || "Add hosts in IT Monitor Configuration."}</p>
            <Link href="/it-monitor-config">
              <span className="text-blue-400 hover:text-blue-300 cursor-pointer text-sm mt-4 flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                {it.goToConfig || "Go to Configuration"}
              </span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
