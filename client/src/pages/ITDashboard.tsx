import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import type { ItHostWithStatus, ItKpi, ItKpiValue } from "@shared/schema";
import {
  Wifi, WifiOff, Camera, Globe, Monitor, Network, ArrowLeft,
  Maximize, Minimize, TrendingUp, Target, Zap, Activity, Gauge,
  BarChart3, Flame, Droplets, Box, Layers, Settings2, GitMerge, Printer
} from "lucide-react";

type HostType = "internet_link" | "camera" | "switch" | "wireless_ap" | "printer" | "other";

const DEVICE_TYPES: { type: HostType; icon: React.ElementType; label: string; labelPt: string }[] = [
  { type: "camera",      icon: Camera,    label: "Cameras",        labelPt: "Câmeras" },
  { type: "switch",      icon: GitMerge,  label: "Switches",       labelPt: "Switches" },
  { type: "wireless_ap", icon: Wifi,      label: "Access Points",  labelPt: "Pontos de Acesso" },
  { type: "printer",     icon: Printer,   label: "Printers",       labelPt: "Impressoras" },
  { type: "other",       icon: Monitor,   label: "Other",          labelPt: "Outros" },
];

const DEVICE_COLORS = [
  { text: "text-blue-400",   badge: "bg-blue-500/15" },
  { text: "text-cyan-400",   badge: "bg-cyan-500/15" },
  { text: "text-violet-400", badge: "bg-violet-500/15" },
  { text: "text-rose-400",   badge: "bg-rose-500/15" },
  { text: "text-gray-400",   badge: "bg-gray-500/15" },
];

const KPI_ICONS = [TrendingUp, Target, Zap, Activity, Gauge, Flame, Droplets, Box, Layers, Settings2, BarChart3];
const KPI_COLORS = [
  { bg: "bg-cyan-500/15",    icon: "text-cyan-400",    border: "border-cyan-500/20",    accent: "text-cyan-400" },
  { bg: "bg-emerald-500/15", icon: "text-emerald-400", border: "border-emerald-500/20", accent: "text-emerald-400" },
  { bg: "bg-amber-500/15",   icon: "text-amber-400",   border: "border-amber-500/20",   accent: "text-amber-400" },
  { bg: "bg-purple-500/15",  icon: "text-purple-400",  border: "border-purple-500/20",  accent: "text-purple-400" },
  { bg: "bg-blue-500/15",    icon: "text-blue-400",    border: "border-blue-500/20",    accent: "text-blue-400" },
  { bg: "bg-rose-500/15",    icon: "text-rose-400",    border: "border-rose-500/20",    accent: "text-rose-400" },
  { bg: "bg-orange-500/15",  icon: "text-orange-400",  border: "border-orange-500/20",  accent: "text-orange-400" },
  { bg: "bg-teal-500/15",    icon: "text-teal-400",    border: "border-teal-500/20",    accent: "text-teal-400" },
];

const PAGE_CSS = `
/* === Scan line === */
@keyframes itScanLine {
  0%   { transform: translateY(0vh); opacity: 0; }
  5%   { opacity: 1; }
  95%  { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}
.it-scan-line {
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: 50; pointer-events: none;
  background: linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.04) 15%, rgba(99,179,237,0.18) 50%, rgba(59,130,246,0.04) 85%, transparent 100%);
  animation: itScanLine 12s linear infinite;
}

/* === Card entrance === */
@keyframes itFadeUp {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
.it-card-enter { animation: itFadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }

/* === Progress bar shimmer === */
@keyframes itShimmer {
  0%   { transform: translateX(-200%); }
  100% { transform: translateX(500%); }
}
.it-bar-shimmer {
  position: absolute; inset-y: 0; top: 0; bottom: 0; width: 30%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent);
  animation: itShimmer 2.2s ease-in-out infinite;
}

/* === Status-reactive card glows === */
@keyframes itGlowGreen {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: rgba(34,197,94,0.2); }
  50%      { box-shadow: 0 0 20px 4px rgba(34,197,94,0.13); border-color: rgba(34,197,94,0.45); }
}
@keyframes itGlowAmber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: rgba(245,158,11,0.2); }
  50%      { box-shadow: 0 0 16px 3px rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.4); }
}
@keyframes itGlowRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); border-color: rgba(239,68,68,0.2); }
  50%      { box-shadow: 0 0 18px 4px rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.5); }
}
.it-glow-green { border: 1px solid transparent; animation: itGlowGreen 3s ease-in-out infinite; }
.it-glow-amber { border: 1px solid transparent; animation: itGlowAmber 2.2s ease-in-out infinite; }
.it-glow-red   { border: 1px solid transparent; animation: itGlowRed   1.4s ease-in-out infinite; }

/* === Icon pulse === */
@keyframes itIconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50%       { transform: scale(1.1); opacity: 0.8; }
}
.it-icon-pulse { animation: itIconPulse 3s ease-in-out infinite; }

/* === KPI card glow === */
@keyframes itKpiGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
  50%      { box-shadow: 0 0 10px 2px rgba(59,130,246,0.08); }
}
.it-kpi-glow { animation: itKpiGlow 4s ease-in-out infinite; }

/* === Live indicator dot === */
@keyframes itDotBlink {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.25; transform: scale(0.7); }
}
.it-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.it-dot-blink { animation: itDotBlink 1.6s ease-in-out infinite; }

/* === Internet link pill pulses === */
@keyframes itPillUp {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
  50%      { box-shadow: 0 0 8px 2px rgba(34,197,94,0.14); }
}
@keyframes itPillDown {
  0%, 85%, 100% { border-color: rgba(239,68,68,0.35); box-shadow: none; }
  92%            { border-color: rgba(239,68,68,0.9); box-shadow: 0 0 8px 1px rgba(239,68,68,0.3); }
}
.it-pill-up   { animation: itPillUp   2.4s ease-in-out infinite; }
.it-pill-down { animation: itPillDown 1.1s ease-in-out infinite; }

/* === WiFi icon blink for online === */
@keyframes itWifiBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.it-wifi-blink { animation: itWifiBlink 2s ease-in-out infinite; }
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

function useCountUp(target: number, duration: number = 1000) {
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
      const cur = Math.round(startVal + (target - startVal) * eased);
      setDisplay(cur);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return display;
}

function LiveDot({ allGood, anyBad }: { allGood: boolean; anyBad: boolean }) {
  const color = allGood ? "bg-green-400" : anyBad ? "bg-red-400" : "bg-amber-400";
  return <span className={`it-dot it-dot-blink ${color}`} aria-hidden="true" />;
}

function AnimatedBar({ pct, allOnline, allOffline }: { pct: number; allOnline: boolean; allOffline: boolean }) {
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  const barColor = allOnline ? "bg-green-500" : allOffline ? "bg-red-500" : "bg-amber-500";
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${barColor} rounded-full relative overflow-hidden`}
        style={{ width: `${barWidth}%`, transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {pct > 0 && <div className="it-bar-shimmer" />}
      </div>
    </div>
  );
}

function DeviceTypeSummaryCard({
  hosts, typeInfo, colorInfo, lang, idx,
}: {
  hosts: ItHostWithStatus[];
  typeInfo: typeof DEVICE_TYPES[0];
  colorInfo: typeof DEVICE_COLORS[0];
  lang: string;
  idx: number;
}) {
  const total = hosts.length;
  const online = hosts.filter(h => h.status?.isOnline).length;
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  const animatedOnline = useCountUp(online, 1200);
  const allOnline = online === total && total > 0;
  const allOffline = online === 0 && total > 0;
  const statusColor = allOnline ? "text-green-400" : allOffline ? "text-red-400" : "text-amber-400";
  const glowClass = allOnline ? "it-glow-green" : allOffline ? "it-glow-red" : "it-glow-amber";
  const Icon = typeInfo.icon;
  const label = lang === "pt" ? typeInfo.labelPt : typeInfo.label;

  const haloShadow = allOnline
    ? "0 0 24px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.2)"
    : allOffline
    ? "0 0 24px rgba(239,68,68,0.55), 0 0 48px rgba(239,68,68,0.2)"
    : "0 0 24px rgba(245,158,11,0.55), 0 0 48px rgba(245,158,11,0.2)";

  return (
    <div
      className={`bg-[#111827] rounded-xl p-5 flex flex-col gap-3 it-card-enter ${glowClass}`}
      style={{ animationDelay: `${idx * 90}ms` }}
      data-testid={`card-device-type-${typeInfo.type}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg ${colorInfo.badge} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${colorInfo.text} it-icon-pulse`} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          allOnline ? "bg-green-900/40 text-green-400" : allOffline ? "bg-red-900/40 text-red-400" : "bg-amber-900/40 text-amber-400"
        }`}>
          {pct}%
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`text-5xl font-black leading-none ${statusColor}`}
          style={{ textShadow: haloShadow }}
          data-testid={`text-online-count-${typeInfo.type}`}
        >
          {animatedOnline}
        </span>
        <div className="flex flex-col">
          <span className="text-sm text-gray-600 leading-none">/ {total}</span>
          <span className="text-xs text-gray-600 mt-1">online</span>
        </div>
      </div>

      <div className="space-y-1">
        <AnimatedBar pct={pct} allOnline={allOnline} allOffline={allOffline} />
        {!allOnline && total > 0 && (
          <div className="text-xs text-gray-600">
            {total - online} offline
          </div>
        )}
      </div>
    </div>
  );
}

function AnimatedKpiValue({ value, unit }: { value: string; unit?: string | null }) {
  const numVal = parseFloat(value);
  const animated = useCountUp(isNaN(numVal) ? 0 : numVal);
  const isDecimal = value.includes(".");
  const decimalPlaces = isDecimal ? (value.split(".")[1]?.length || 0) : 0;
  const display = isNaN(numVal) ? value : (isDecimal ? animated.toFixed(decimalPlaces) : animated.toString());
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-bold text-white leading-none">{display}</span>
      {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
    </div>
  );
}

function KpiCard({ kpi, values, idx }: { kpi: ItKpi; values: ItKpiValue[]; idx: number }) {
  const color = KPI_COLORS[idx % KPI_COLORS.length];
  const IconComp = KPI_ICONS[idx % KPI_ICONS.length];
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7);
  const dailyVal = values.find(v => v.kpiId === kpi.id && v.periodType === "daily" && v.periodDate === today);
  const monthlyVal = values.find(v => v.kpiId === kpi.id && v.periodType === "monthly" && v.periodDate?.startsWith(currentMonth));
  return (
    <div
      className={`bg-[#111827] rounded-xl border ${color.border} p-3 flex flex-col justify-between it-kpi-glow it-card-enter`}
      style={{ animationDelay: `${idx * 70 + 200}ms` }}
      data-testid={`card-kpi-${kpi.id}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 leading-tight">{kpi.labelEn || kpi.name}</span>
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

function HostStatusPill({ host, idx }: { host: ItHostWithStatus; idx: number }) {
  const isOnline = host.status?.isOnline;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm it-card-enter ${
        isOnline
          ? "bg-green-900/25 border-green-700/35 text-green-300 it-pill-up"
          : host.status
          ? "bg-red-900/25 border-red-700/35 text-red-300 it-pill-down"
          : "bg-gray-800/40 border-gray-700/40 text-gray-500"
      }`}
      style={{ animationDelay: `${idx * 60}ms` }}
      data-testid={`pill-host-${host.id}`}
    >
      {isOnline ? (
        <Wifi className="w-3.5 h-3.5 it-wifi-blink shrink-0" />
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

export default function ITDashboard() {
  const { t, language } = useLanguage();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Version counters force card remount (and replay entrance animation) on each data refresh
  const [hostsVersion, setHostsVersion] = useState(0);
  const [kpisVersion, setKpisVersion] = useState(0);
  const prevHostsRef = useRef<ItHostWithStatus[]>([]);
  const prevKpisRef = useRef<ItKpi[]>([]);

  const { data: hosts = [] } = useQuery<ItHostWithStatus[]>({
    queryKey: ["/api/it/hosts"],
    queryFn: async () => {
      const res = await fetch("/api/it/hosts");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: kpis = [] } = useQuery<ItKpi[]>({
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

  const { data: dailyValues = [] } = useQuery<ItKpiValue[]>({
    queryKey: ["/api/it/kpi-values", "daily", today],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=daily&periodDate=${today}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: monthlyValues = [] } = useQuery<ItKpiValue[]>({
    queryKey: ["/api/it/kpi-values", "monthly", currentMonth],
    queryFn: async () => {
      const res = await fetch(`/api/it/kpi-values?periodType=monthly&periodDate=${currentMonth}`);
      return res.json();
    },
    refetchInterval: 60000,
  });

  const allKpiValues = [...dailyValues, ...monthlyValues];

  // Detect when hosts data changes (new refetch cycle) and bump version to remount cards
  useEffect(() => {
    if (hosts !== prevHostsRef.current && hosts.length > 0) {
      prevHostsRef.current = hosts;
      setHostsVersion(v => v + 1);
    }
  }, [hosts]);

  // Detect when kpis data changes and bump version to remount KPI cards
  useEffect(() => {
    if (kpis !== prevKpisRef.current && kpis.length > 0) {
      prevKpisRef.current = kpis;
      setKpisVersion(v => v + 1);
    }
  }, [kpis]);

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

  const activeHosts = hosts.filter(h => h.isActive);
  const internetLinks = activeHosts.filter(h => h.hostType === "internet_link");
  const activeKpis = kpis.filter(k => k.isActive);

  const deviceTypeGroups = DEVICE_TYPES
    .map((typeInfo, i) => ({
      typeInfo,
      colorInfo: DEVICE_COLORS[i % DEVICE_COLORS.length],
      hosts: activeHosts.filter(h => h.hostType === typeInfo.type),
    }))
    .filter(g => g.hosts.length > 0);

  const totalDevices = activeHosts.filter(h => h.hostType !== "internet_link").length;
  const totalOnline = activeHosts.filter(h => h.hostType !== "internet_link" && h.status?.isOnline).length;
  const linksOnline = internetLinks.filter(h => h.status?.isOnline).length;
  const allLinksUp = linksOnline === internetLinks.length && internetLinks.length > 0;
  const anyLinkDown = linksOnline < internetLinks.length && internetLinks.length > 0;
  const allDevicesOnline = totalOnline === totalDevices && totalDevices > 0;
  const anyDeviceOffline = totalOnline < totalDevices && totalDevices > 0;

  const it = t.itMonitor;

  return (
    <div
      ref={containerRef}
      className="bg-[#0a0e1a] text-white flex flex-col h-screen overflow-hidden relative"
      data-testid="it-dashboard-container"
    >
      <style>{PAGE_CSS}</style>

      {/* Background scan line */}
      <div className="it-scan-line" aria-hidden="true" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-gray-800 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <Link href="/it-monitor-config">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" data-testid="link-back">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-blue-400 it-icon-pulse" />
            <div>
              <h1 className="text-lg font-bold text-gray-100 leading-tight" data-testid="text-dashboard-title">
                {it.dashboardTitle || "IT Operations"}
              </h1>
              <span className="text-xs text-gray-500">{it.dashboardSubtitle || "Network Monitor"}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            {internetLinks.length > 0 && (
              <div className="flex items-center gap-1.5" data-testid="text-links-summary">
                <Globe className="w-3.5 h-3.5" />
                <span className={linksOnline === internetLinks.length ? "text-green-400 font-bold" : "text-red-400 font-bold"}>{linksOnline}</span>
                <span>/</span>
                <span>{internetLinks.length}</span>
                <span>{it.linksUp || "links"}</span>
              </div>
            )}
            {deviceTypeGroups.map(({ typeInfo, hosts: g }) => {
              const on = g.filter(h => h.status?.isOnline).length;
              return (
                <div key={typeInfo.type} className="flex items-center gap-1.5" data-testid={`text-summary-${typeInfo.type}`}>
                  <typeInfo.icon className="w-3.5 h-3.5" />
                  <span className={on === g.length ? "text-green-400 font-bold" : on === 0 ? "text-red-400 font-bold" : "text-amber-400 font-bold"}>{on}</span>
                  <span>/</span>
                  <span>{g.length}</span>
                </div>
              );
            })}
            {totalDevices > 0 && (
              <div className="flex items-center gap-1 pl-2 border-l border-gray-700">
                <span className={totalOnline === totalDevices ? "text-green-400 font-bold" : "text-amber-400 font-bold"}>{totalOnline}</span>
                <span className="text-gray-600">/ {totalDevices}</span>
                <span className="text-gray-500">total</span>
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
      <main className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-hidden relative z-10">

        {/* Internet Links row */}
        {internetLinks.length > 0 && (
          <div data-testid="section-internet-links">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
              <LiveDot allGood={allLinksUp} anyBad={anyLinkDown} />
              <Globe className="w-3.5 h-3.5" />
              {it.sectionInternetLinks || "Internet Links"}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(internetLinks.length, 6)}, minmax(0, 1fr))` }}>
              {internetLinks.map((host, i) => (
                <HostStatusPill key={`${host.id}-v${hostsVersion}`} host={host} idx={i} />
              ))}
            </div>
          </div>
        )}

        {/* Device summary cards + KPIs */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

          {/* Device type summary cards */}
          {deviceTypeGroups.length > 0 && (
            <div className="flex-1 min-w-0 flex flex-col" data-testid="section-devices">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <LiveDot allGood={allDevicesOnline} anyBad={anyDeviceOffline} />
                <Monitor className="w-3.5 h-3.5" />
                {it.sectionDevices || "Network Devices"}
              </div>
              <div
                className="flex-1 grid gap-4 content-start"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(deviceTypeGroups.length, 4)}, minmax(0, 1fr))`,
                  gridAutoRows: "minmax(160px, auto)",
                }}
                data-testid="grid-device-types"
              >
                {deviceTypeGroups.map(({ typeInfo, colorInfo, hosts: g }, i) => (
                  <DeviceTypeSummaryCard
                    key={`${typeInfo.type}-v${hostsVersion}`}
                    hosts={g}
                    typeInfo={typeInfo}
                    colorInfo={colorInfo}
                    lang={language}
                    idx={i}
                  />
                ))}
              </div>
            </div>
          )}

          {/* KPI cards */}
          {activeKpis.length > 0 && (
            <div className="w-64 shrink-0 flex flex-col" data-testid="section-kpis">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <LiveDot allGood={true} anyBad={false} />
                <BarChart3 className="w-3.5 h-3.5" />
                {it.sectionKpis || "KPIs"}
              </div>
              <div className="flex-1 grid gap-2 content-start" style={{ gridTemplateColumns: "1fr", gridAutoRows: "minmax(80px, auto)" }}>
                {activeKpis.map((kpi, idx) => (
                  <KpiCard key={`${kpi.id}-v${kpisVersion}`} kpi={kpi} values={allKpiValues} idx={idx} />
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
