import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { ItHostWithStatus, ItKpi, ItKpiValue, ItHostType, FortigateBandwidth } from "@shared/schema";
import {
  Wifi, WifiOff, Camera, Globe, Monitor, Network, ArrowLeft,
  Maximize, Minimize, TrendingUp, Target, Zap, Activity, Gauge,
  BarChart3, Flame, Droplets, Box, Layers, Settings2, GitMerge, Printer,
  AlertTriangle, Server, HardDrive, Cpu, Smartphone, Tv, Shield,
  Cctv, Webcam, ScanEye, Eye, Video, Router, Database, DatabaseBackup,
  ShieldCheck, ShieldAlert, Lock, KeyRound, Fingerprint,
  BellRing, Siren, AlarmSmoke, RadioTower, Antenna, Signal, MonitorPlay, Scan
} from "lucide-react";

// Dynamic icon registry — must match ITMonitorConfig.tsx ICON_OPTIONS
const ICON_MAP: Record<string, React.ElementType> = {
  // Surveillance & Cameras
  "cctv":            Cctv,
  "webcam":          Webcam,
  "scan-eye":        ScanEye,
  "eye":             Eye,
  "video":           Video,
  "camera":          Camera,
  "scan":            Scan,
  // Storage & Recording
  "database":        Database,
  "database-backup": DatabaseBackup,
  "hard-drive":      HardDrive,
  "server":          Server,
  "cpu":             Cpu,
  // Network
  "router":          Router,
  "wifi":            Wifi,
  "git-merge":       GitMerge,
  "antenna":         Antenna,
  "radio-tower":     RadioTower,
  "signal":          Signal,
  "network":         Network,
  "globe":           Globe,
  // Security & Access Control
  "shield-check":    ShieldCheck,
  "shield-alert":    ShieldAlert,
  "shield":          Shield,
  "lock":            Lock,
  "key-round":       KeyRound,
  "fingerprint":     Fingerprint,
  // Alarms & Alerts
  "siren":           Siren,
  "bell-ring":       BellRing,
  "alarm-smoke":     AlarmSmoke,
  // Displays & Output
  "monitor-play":    MonitorPlay,
  "monitor":         Monitor,
  "tv":              Tv,
  "printer":         Printer,
  "smartphone":      Smartphone,
  // General
  "zap":             Zap,
  "activity":        Activity,
  "layers":          Layers,
};

// Color name → Tailwind classes
const COLOR_MAP: Record<string, { text: string; badge: string; glow: string }> = {
  blue:   { text: "text-blue-400",   badge: "bg-blue-500/15",   glow: "rgba(59,130,246,0.6)"   },
  cyan:   { text: "text-cyan-400",   badge: "bg-cyan-500/15",   glow: "rgba(34,211,238,0.6)"   },
  green:  { text: "text-green-400",  badge: "bg-green-500/15",  glow: "rgba(34,197,94,0.6)"    },
  violet: { text: "text-violet-400", badge: "bg-violet-500/15", glow: "rgba(139,92,246,0.6)"   },
  rose:   { text: "text-rose-400",   badge: "bg-rose-500/15",   glow: "rgba(244,63,94,0.6)"    },
  amber:  { text: "text-amber-400",  badge: "bg-amber-500/15",  glow: "rgba(245,158,11,0.6)"   },
  orange: { text: "text-orange-400", badge: "bg-orange-500/15", glow: "rgba(249,115,22,0.6)"   },
  teal:   { text: "text-teal-400",   badge: "bg-teal-500/15",   glow: "rgba(20,184,166,0.6)"   },
  gray:   { text: "text-gray-400",   badge: "bg-gray-500/15",   glow: "rgba(156,163,175,0.6)"  },
  purple: { text: "text-purple-400", badge: "bg-purple-500/15", glow: "rgba(168,85,247,0.6)"   },
};

function getIcon(iconName: string): React.ElementType {
  return ICON_MAP[iconName] || Monitor;
}

function getColor(colorName: string) {
  return COLOR_MAP[colorName] || COLOR_MAP.gray;
}

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
  position: fixed; left: 0; right: 0; top: 0; height: 2px; z-index: 1; pointer-events: none;
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
  50%      { box-shadow: 0 0 28px 6px rgba(34,197,94,0.18); border-color: rgba(34,197,94,0.55); }
}
@keyframes itGlowAmber {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); border-color: rgba(245,158,11,0.2); }
  50%      { box-shadow: 0 0 22px 5px rgba(245,158,11,0.16); border-color: rgba(245,158,11,0.5); }
}
@keyframes itGlowRed {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); border-color: rgba(239,68,68,0.3); }
  50%      { box-shadow: 0 0 28px 8px rgba(239,68,68,0.28); border-color: rgba(239,68,68,0.7); }
}
.it-glow-green { border: 1px solid transparent; animation: itGlowGreen 3s ease-in-out infinite; }
.it-glow-amber { border: 1px solid transparent; animation: itGlowAmber 2.2s ease-in-out infinite; }
.it-glow-red   { border: 1px solid transparent; animation: itGlowRed   1.4s ease-in-out infinite; }

/* === Pill glow (internet links) === */
@keyframes itPillGlowGreen {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); border-color: rgba(34,197,94,0.3); }
  50%      { box-shadow: 0 0 20px 5px rgba(34,197,94,0.25); border-color: rgba(34,197,94,0.65); }
}
@keyframes itPillGlowRed {
  0%, 85%, 100% { box-shadow: 0 0 6px 2px rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.45); }
  92%            { box-shadow: 0 0 22px 6px rgba(239,68,68,0.45); border-color: rgba(239,68,68,0.9); }
}
.it-pill-up   { animation: itPillGlowGreen 2.4s ease-in-out infinite; }
.it-pill-down { animation: itPillGlowRed   1.1s ease-in-out infinite; }

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

/* === WiFi icon blink for online === */
@keyframes itWifiBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
.it-wifi-blink { animation: itWifiBlink 2s ease-in-out infinite; }

/* === Offline alert pulse === */
@keyframes itOfflinePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.55; }
}
.it-offline-pulse { animation: itOfflinePulse 1.2s ease-in-out infinite; }

/* === Status badge large glow === */
@keyframes itStatusBadgeGlowGreen {
  0%, 100% { text-shadow: 0 0 8px rgba(34,197,94,0.4), 0 0 24px rgba(34,197,94,0.15); }
  50%      { text-shadow: 0 0 16px rgba(34,197,94,0.75), 0 0 40px rgba(34,197,94,0.3); }
}
@keyframes itStatusBadgeGlowRed {
  0%, 100% { text-shadow: 0 0 8px rgba(239,68,68,0.4), 0 0 24px rgba(239,68,68,0.15); }
  50%      { text-shadow: 0 0 18px rgba(239,68,68,0.8), 0 0 44px rgba(239,68,68,0.35); }
}
.it-status-glow-green { animation: itStatusBadgeGlowGreen 2.4s ease-in-out infinite; }
.it-status-glow-red   { animation: itStatusBadgeGlowRed   1.4s ease-in-out infinite; }
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
    <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className={`h-full ${barColor} rounded-full relative overflow-hidden`}
        style={{ width: `${barWidth}%`, transition: "width 1.1s cubic-bezier(0.4,0,0.2,1)" }}
      >
        {pct > 0 && <div className="it-bar-shimmer" />}
      </div>
    </div>
  );
}

/* ─── Internet link card — large and glowing ─── */
function HostStatusCard({ host, idx }: { host: ItHostWithStatus; idx: number }) {
  const isOnline = host.status?.isOnline;
  const neverChecked = !host.status;

  const cardGlow = isOnline ? "it-pill-up bg-green-900/20 border-green-700/40"
    : neverChecked ? "bg-gray-800/40 border-gray-700/40"
    : "it-pill-down bg-red-900/20 border-red-700/40";

  return (
    <div
      className={`flex flex-col gap-2 px-5 py-4 rounded-xl border it-card-enter ${cardGlow}`}
      style={{ animationDelay: `${idx * 60}ms` }}
      data-testid={`pill-host-${host.id}`}
    >
      {/* Top row: icon + name + status badge */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {isOnline ? (
            <Wifi className="w-5 h-5 text-green-400 it-wifi-blink shrink-0" />
          ) : (
            <WifiOff className={`w-5 h-5 shrink-0 ${neverChecked ? "text-gray-600" : "text-red-400 it-offline-pulse"}`} />
          )}
          <span className="text-base font-bold text-gray-100 truncate">{host.name}</span>
        </div>

        {/* Large UP / DOWN badge */}
        <span
          className={`text-xl font-black tracking-widest shrink-0 ${
            neverChecked ? "text-gray-600"
            : isOnline ? "text-green-400 it-status-glow-green"
            : "text-red-400 it-status-glow-red"
          }`}
          data-testid={`text-status-${host.id}`}
        >
          {neverChecked ? "—" : isOnline ? "UP" : "DOWN"}
        </span>
      </div>

      {/* Bottom row: IP + response time */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-gray-500">{host.ipAddress}</span>
        {isOnline && host.status?.responseTimeMs != null && (
          <span className="text-green-500 font-semibold">{host.status.responseTimeMs} ms</span>
        )}
        {!isOnline && !neverChecked && (
          <span className="text-red-500 font-semibold it-offline-pulse">OFFLINE</span>
        )}
      </div>
    </div>
  );
}

/* ─── Device type summary card ─── */
function DeviceTypeSummaryCard({
  hosts, hostType, lang, idx,
}: {
  hosts: ItHostWithStatus[];
  hostType: ItHostType;
  lang: string;
  idx: number;
}) {
  const total = hosts.length;
  const online = hosts.filter(h => h.status?.isOnline).length;
  const offlineHosts = hosts.filter(h => h.status && !h.status.isOnline);
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  const animatedOnline = useCountUp(online, 1200);
  const allOnline = online === total && total > 0;
  const allOffline = online === 0 && total > 0;
  const statusColor = allOnline ? "text-green-400" : allOffline ? "text-red-400" : "text-amber-400";
  const glowClass = allOnline ? "it-glow-green" : allOffline ? "it-glow-red" : "it-glow-amber";
  const Icon = getIcon(hostType.icon);
  const colorInfo = getColor(hostType.color);
  const label = lang === "pt" ? hostType.labelPt : hostType.labelEn;

  const haloShadow = allOnline
    ? "0 0 32px rgba(34,197,94,0.65), 0 0 60px rgba(34,197,94,0.25)"
    : allOffline
    ? "0 0 32px rgba(239,68,68,0.65), 0 0 60px rgba(239,68,68,0.25)"
    : "0 0 32px rgba(245,158,11,0.65), 0 0 60px rgba(245,158,11,0.25)";

  return (
    <div
      className={`bg-[#111827] rounded-xl p-5 flex flex-col gap-3 it-card-enter ${glowClass}`}
      style={{ animationDelay: `${idx * 90}ms` }}
      data-testid={`card-device-type-${hostType.slug}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-lg ${colorInfo.badge} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colorInfo.text} it-icon-pulse`} />
          </div>
          <span className="text-sm font-bold uppercase tracking-wider text-gray-300">{label}</span>
        </div>
        <span className={`text-sm font-black px-3 py-1 rounded-full ${
          allOnline ? "bg-green-900/50 text-green-300" : allOffline ? "bg-red-900/50 text-red-300" : "bg-amber-900/50 text-amber-300"
        }`}>
          {pct}%
        </span>
      </div>

      {/* Big count */}
      <div className="flex items-baseline gap-2">
        <span
          className={`text-6xl font-black leading-none ${statusColor} ${allOffline ? "it-status-glow-red" : ""}`}
          style={{ textShadow: haloShadow }}
          data-testid={`text-online-count-${hostType.slug}`}
        >
          {animatedOnline}
        </span>
        <div className="flex flex-col">
          <span className="text-lg text-gray-500 leading-none font-bold">/ {total}</span>
          <span className="text-xs text-gray-500 mt-1 uppercase tracking-wide">online</span>
        </div>
      </div>

      {/* Progress bar */}
      <AnimatedBar pct={pct} allOnline={allOnline} allOffline={allOffline} />

      {/* ── Offline device list ── */}
      {offlineHosts.length > 0 && (
        <div className="border border-red-900/40 bg-red-950/30 rounded-lg px-3 py-2 space-y-1.5"
          data-testid={`offline-list-${hostType.slug}`}>
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wide it-offline-pulse">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {offlineHosts.length} offline
          </div>
          <div className="space-y-1 max-h-28 overflow-y-auto">
            {offlineHosts.map(h => (
              <div key={h.id} className="flex items-center justify-between gap-2 text-xs" data-testid={`offline-device-${h.id}`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <WifiOff className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="text-red-300 font-semibold truncate">{h.name}</span>
                </div>
                <span className="font-mono text-red-500/70 shrink-0">{h.ipAddress}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All good message */}
      {allOnline && total > 0 && (
        <div className="text-xs text-green-500 font-semibold flex items-center gap-1.5">
          <span className="it-dot it-dot-blink bg-green-400" />
          All {label.toLowerCase()} online
        </div>
      )}
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
      className={`h-full bg-[#111827] rounded-xl border ${color.border} p-3 flex flex-col justify-between it-kpi-glow it-card-enter`}
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

// Colors for up to 8 interfaces in the chart
const CHART_COLORS = ["#22d3ee", "#4ade80", "#f59e0b", "#a78bfa", "#f87171", "#34d399", "#fb923c", "#818cf8"];

function formatTime(ts: string | Date): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildChartData(rows: FortigateBandwidth[]): { time: string; [key: string]: string | number }[] {
  // Group by time-bucket label for the chart
  const byTime: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const time = formatTime(row.sampledAt);
    if (!byTime[time]) byTime[time] = {};
    // Convert stored Kbps → Mbps for display; keep latest reading per interface per minute
    byTime[time][`${row.interfaceName}_tx`] = parseFloat(row.txKbps) / 1000;
    byTime[time][`${row.interfaceName}_rx`] = parseFloat(row.rxKbps) / 1000;
  }
  return Object.entries(byTime).map(([time, vals]) => ({ time, ...vals }));
}

const BandwidthChart = memo(function BandwidthChart({ rows }: { rows: FortigateBandwidth[] }) {
  if (rows.length === 0) return null;

  const interfaces = Array.from(new Set(rows.map(r => r.interfaceName)));
  const chartData = buildChartData(rows);

  return (
    <div className="bg-[#111827] rounded-xl border border-gray-800/60 p-4 it-card-enter" data-testid="section-bandwidth-chart">
      <div className="flex items-center gap-2 mb-3">
        <span className="it-dot it-dot-blink bg-cyan-400" />
        <Activity className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">FortiGate Bandwidth (Mbps)</span>
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 2, right: 8, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="time"
            tick={{ fill: "#6b7280", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, fontSize: 11 }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, color: "#9ca3af", paddingTop: 4 }}
            iconSize={8}
          />
          {interfaces.flatMap((iface, i) => [
            <Line
              key={`${iface}_tx`}
              type="monotone"
              dataKey={`${iface}_tx`}
              name={`${iface} TX`}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3 }}
            />,
            <Line
              key={`${iface}_rx`}
              type="monotone"
              dataKey={`${iface}_rx`}
              name={`${iface} RX`}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
              activeDot={{ r: 3 }}
            />,
          ])}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default function ITDashboard() {
  const { t, language } = useLanguage();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (hosts !== prevHostsRef.current && hosts.length > 0) {
      prevHostsRef.current = hosts;
      setHostsVersion(v => v + 1);
    }
  }, [hosts]);

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

  const { data: hostTypes = [] } = useQuery<ItHostType[]>({
    queryKey: ["/api/it/host-types"],
    queryFn: async () => {
      const res = await fetch("/api/it/host-types");
      return res.json();
    },
    refetchInterval: 300000,
  });

  const { data: fortigateEnabled } = useQuery<boolean>({
    queryKey: ["/api/it/fortigate/enabled"],
    queryFn: async () => {
      const res = await fetch("/api/it/fortigate/enabled");
      if (!res.ok) return false;
      const data = await res.json();
      return !!data.enabled;
    },
    refetchInterval: 120000,
  });

  const { data: bandwidthRows = [] } = useQuery<FortigateBandwidth[]>({
    queryKey: ["/api/it/fortigate/bandwidth"],
    queryFn: async () => {
      const res = await fetch("/api/it/fortigate/bandwidth?hours=1");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
    enabled: !!fortigateEnabled,
  });

  const activeHosts = hosts.filter(h => h.isActive);
  const activeKpis = kpis.filter(k => k.isActive);

  // Determine internet link slugs dynamically from configured types
  const internetLinkSlugs = new Set(
    hostTypes.filter(t => t.isInternetLink && t.isActive).map(t => t.slug)
  );

  const internetLinks = activeHosts.filter(h => internetLinkSlugs.has(h.hostType));

  // Build device groups from all active non-internet-link host types that have hosts
  const deviceTypeGroups = hostTypes
    .filter(ht => ht.isActive && !ht.isInternetLink)
    .map(ht => ({
      hostType: ht,
      hosts: activeHosts.filter(h => h.hostType === ht.slug),
    }))
    .filter(g => g.hosts.length > 0);

  // Catch hosts whose type doesn't match any configured type (safety net)
  const knownSlugs = new Set(hostTypes.map(t => t.slug));
  const unknownTypeHosts = activeHosts.filter(
    h => !knownSlugs.has(h.hostType) && !internetLinkSlugs.has(h.hostType)
  );

  const totalDevices = activeHosts.filter(h => !internetLinkSlugs.has(h.hostType)).length;
  const totalOnline = activeHosts.filter(h => !internetLinkSlugs.has(h.hostType) && h.status?.isOnline).length;
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
            {deviceTypeGroups.map(({ hostType: ht, hosts: g }) => {
              const on = g.filter(h => h.status?.isOnline).length;
              const Icon = getIcon(ht.icon);
              return (
                <div key={ht.slug} className="flex items-center gap-1.5" data-testid={`text-summary-${ht.slug}`}>
                  <Icon className="w-3.5 h-3.5" />
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

        {/* Internet Links — large cards */}
        {internetLinks.length > 0 && (
          <div data-testid="section-internet-links">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
              <LiveDot allGood={allLinksUp} anyBad={anyLinkDown} />
              <Globe className="w-3.5 h-3.5" />
              {it.sectionInternetLinks || "Internet Links"}
            </div>
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${Math.min(internetLinks.length, 4)}, minmax(0, 1fr))` }}
            >
              {internetLinks.map((host, i) => (
                <HostStatusCard key={`${host.id}-v${hostsVersion}`} host={host} idx={i} />
              ))}
            </div>
          </div>
        )}

        {/* FortiGate bandwidth chart — only shown when enabled and data exists */}
        {fortigateEnabled && bandwidthRows.length > 0 && (
          <BandwidthChart rows={bandwidthRows} />
        )}

        {/* Device summary cards + KPIs */}
        <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

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
                  gridTemplateColumns: `repeat(${Math.min(deviceTypeGroups.length, 3)}, minmax(0, 1fr))`,
                }}
              >
                {deviceTypeGroups.map((g, i) => (
                  <DeviceTypeSummaryCard
                    key={`${g.hostType.slug}-v${hostsVersion}`}
                    hosts={g.hosts}
                    hostType={g.hostType}
                    lang={language}
                    idx={i}
                  />
                ))}
              </div>
            </div>
          )}

          {activeKpis.length > 0 && (
            <div
              className={`shrink-0 flex flex-col ${activeKpis.length > 4 ? "w-[36rem]" : "w-72"}`}
              data-testid="section-kpis"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <span className="it-dot it-dot-blink bg-blue-400" />
                <BarChart3 className="w-3.5 h-3.5" />
                {it.sectionKpis || "KPIs"}
              </div>
              {(() => {
                const cols = activeKpis.length > 4 ? 2 : 1;
                const rows = Math.ceil(activeKpis.length / cols);
                return (
                  <div
                    className="flex-1 grid gap-3 overflow-hidden"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    }}
                  >
                    {activeKpis.map((kpi, i) => (
                      <KpiCard key={`${kpi.id}-v${kpisVersion}`} kpi={kpi} values={allKpiValues} idx={i} />
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
