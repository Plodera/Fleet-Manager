import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import {
  Monitor, ArrowLeft, Maximize, Minimize, SkipForward, SkipBack,
  TrendingUp, Target, Zap, BarChart3, Activity,
  Gauge, Flame, Droplets, Box, Layers, Settings2
} from "lucide-react";

const KPI_PAGE_SIZE = 6;

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const KPI_ICONS = [TrendingUp, Target, Zap, Activity, Gauge, Flame, Droplets, Box, Layers, Settings2, BarChart3];

const KPI_COLORS = [
  {
    bg: "rgba(6,182,212,0.12)", icon: "text-cyan-300", border: "border-cyan-400/30",
    topBar: "#06b6d4", glow: "0 0 24px rgba(6,182,212,0.25)", iconBg: "rgba(6,182,212,0.15)", text: "#67e8f9"
  },
  {
    bg: "rgba(16,185,129,0.12)", icon: "text-emerald-300", border: "border-emerald-400/30",
    topBar: "#10b981", glow: "0 0 24px rgba(16,185,129,0.25)", iconBg: "rgba(16,185,129,0.15)", text: "#6ee7b7"
  },
  {
    bg: "rgba(245,158,11,0.12)", icon: "text-amber-300", border: "border-amber-400/30",
    topBar: "#f59e0b", glow: "0 0 24px rgba(245,158,11,0.25)", iconBg: "rgba(245,158,11,0.15)", text: "#fcd34d"
  },
  {
    bg: "rgba(249,115,22,0.12)", icon: "text-orange-300", border: "border-orange-400/30",
    topBar: "#f97316", glow: "0 0 24px rgba(249,115,22,0.25)", iconBg: "rgba(249,115,22,0.15)", text: "#fdba74"
  },
  {
    bg: "rgba(168,85,247,0.12)", icon: "text-purple-300", border: "border-purple-400/30",
    topBar: "#a855f7", glow: "0 0 24px rgba(168,85,247,0.25)", iconBg: "rgba(168,85,247,0.15)", text: "#d8b4fe"
  },
  {
    bg: "rgba(59,130,246,0.12)", icon: "text-blue-300", border: "border-blue-400/30",
    topBar: "#3b82f6", glow: "0 0 24px rgba(59,130,246,0.25)", iconBg: "rgba(59,130,246,0.15)", text: "#93c5fd"
  },
  {
    bg: "rgba(244,63,94,0.12)", icon: "text-rose-300", border: "border-rose-400/30",
    topBar: "#f43f5e", glow: "0 0 24px rgba(244,63,94,0.25)", iconBg: "rgba(244,63,94,0.15)", text: "#fda4af"
  },
  {
    bg: "rgba(20,184,166,0.12)", icon: "text-teal-300", border: "border-teal-400/30",
    topBar: "#14b8a6", glow: "0 0 24px rgba(20,184,166,0.25)", iconBg: "rgba(20,184,166,0.15)", text: "#5eead4"
  },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const hm = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const secs = time.toLocaleTimeString([], { second: "2-digit" }).replace(/.*:/, "");
  const dateStr = time.toLocaleDateString([], { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  return (
    <div className="text-right" data-testid="text-clock">
      <div className="flex items-baseline justify-end gap-0.5">
        <span className="text-2xl font-mono font-bold tracking-wider text-white">{hm}</span>
        <span className="text-lg font-mono font-semibold text-white/40 w-7 text-left">:{secs}</span>
      </div>
      <div className="text-[11px] text-white/40 tracking-wide uppercase mt-0.5">{dateStr}</div>
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

function AnimatedValue({ value, unit, testId }: { value: string | number; unit?: string | null; testId: string }) {
  const display = useCountUp(value);
  return (
    <div className="flex items-baseline gap-3 leading-none">
      <span className="font-black text-white leading-none tracking-tight" style={{ fontSize: "clamp(3rem, 5.5vw, 6rem)" }} data-testid={testId}>
        {display}
      </span>
      {unit && <span className="font-bold text-white/50 uppercase tracking-wider" style={{ fontSize: "clamp(1rem, 1.6vw, 1.5rem)" }}>{unit}</span>}
    </div>
  );
}

const ENTER_CLASSES: Record<string, string> = {
  "fade": "kpi-fade-in",
  "slide-left": "kpi-slide-left-in",
  "slide-up": "kpi-slide-up-in",
  "zoom": "kpi-zoom-in",
};

const EXIT_CLASSES: Record<string, string> = {
  "fade": "kpi-fade-out",
  "slide-left": "kpi-slide-left-out",
  "slide-up": "kpi-slide-up-out",
  "zoom": "kpi-zoom-out",
};

const TRANSITION_DURATION = 400;

const VideoPanel = memo(function VideoPanel({
  currentVideo,
  videos,
  videoFading,
  currentVideoIndex,
  switchVideo,
  className = "",
  style,
}: {
  currentVideo: any;
  videos: any[];
  videoFading: boolean;
  currentVideoIndex: number;
  switchVideo: (idx: number) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col min-h-0 ${className}`}
      style={{ background: "#000", boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.6)", ...style }}
      data-testid="section-videos"
    >
      <div className="relative flex-1 min-h-0">
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: videoFading ? 0 : 1 }}
        >
          {currentVideo && currentVideo.videoType === "youtube" && extractYouTubeId(currentVideo.url) ? (
            <iframe
              key={currentVideo.id}
              src={`https://www.youtube.com/embed/${extractYouTubeId(currentVideo.url)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(currentVideo.url)}`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
              allowFullScreen
              data-testid="video-player-youtube"
            />
          ) : currentVideo ? (
            <video
              key={currentVideo.id}
              src={currentVideo.url}
              className="w-full h-full object-contain"
              autoPlay
              muted
              loop
              data-testid="video-player-upload"
            />
          ) : null}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 py-3 z-10 flex items-end justify-between">
          <p className="text-white/90 font-medium text-sm">{currentVideo?.title}</p>
          {videos.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => switchVideo((currentVideoIndex - 1 + videos.length) % videos.length)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                data-testid="button-prev-video"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <div className="flex gap-1.5 items-center">
                {videos.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => switchVideo(idx)}
                    className={`rounded-full transition-all duration-300 ${idx === currentVideoIndex ? "bg-white w-5 h-1.5" : "bg-white/30 hover:bg-white/60 w-1.5 h-1.5"}`}
                    data-testid={`button-video-dot-${idx}`}
                  />
                ))}
              </div>
              <button
                onClick={() => switchVideo((currentVideoIndex + 1) % videos.length)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
                data-testid="button-next-video"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function KpiCardContent({
  kpi,
  allKpis,
  getDailyValue,
  getMonthlyValue,
  monthlyLabel,
}: {
  kpi: any;
  allKpis: any[];
  getDailyValue: (kpiId: number) => string;
  getMonthlyValue: (kpiId: number) => string;
  monthlyLabel: string;
}) {
  const globalIdx = allKpis.indexOf(kpi);
  const color = KPI_COLORS[globalIdx % KPI_COLORS.length];
  const IconComp = KPI_ICONS[globalIdx % KPI_ICONS.length];
  const dailyVal = getDailyValue(kpi.id);
  const monthlyVal = getMonthlyValue(kpi.id);

  const dailyNum = parseFloat(String(dailyVal));
  const monthlyNum = parseFloat(String(monthlyVal));
  const progress = (!isNaN(dailyNum) && !isNaN(monthlyNum) && monthlyNum > 0)
    ? Math.min(100, Math.round((dailyNum / monthlyNum) * 100))
    : null;

  return (
    <div
      className="rounded-2xl flex flex-col justify-between kpi-card-glow overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color.bg} 0%, rgba(255,255,255,0.03) 100%)`,
        border: "1px solid rgba(255,255,255,0.07)",
        borderTop: `2px solid ${color.topBar}`,
        boxShadow: color.glow,
        padding: "clamp(10px, 1.5vw, 18px)",
      }}
      data-testid={`card-kpi-${kpi.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-bold uppercase tracking-widest leading-tight" style={{ color: "rgba(255,255,255,0.5)", fontSize: "clamp(0.7rem, 1.1vw, 1rem)" }}>
          {kpi.labelEn || kpi.name}
        </span>
        <div
          className="flex-shrink-0 rounded-xl flex items-center justify-center kpi-icon-pulse"
          style={{ width: "clamp(2rem, 3vw, 3rem)", height: "clamp(2rem, 3vw, 3rem)", background: color.iconBg, boxShadow: `0 0 14px ${color.topBar}55` }}
        >
          <IconComp className={`${color.icon}`} style={{ width: "clamp(1rem, 1.5vw, 1.5rem)", height: "clamp(1rem, 1.5vw, 1.5rem)" }} />
        </div>
      </div>

      {/* "TODAY" badge + big daily value */}
      <div className="flex flex-col gap-0.5">
        <span className="font-bold uppercase tracking-widest" style={{ color: color.topBar, fontSize: "clamp(0.6rem, 0.85vw, 0.8rem)" }}>
          Today
        </span>
        <AnimatedValue value={dailyVal} unit={kpi.unit} testId={`text-daily-value-${kpi.id}`} />
      </div>

      {/* Monthly total */}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)", fontSize: "clamp(0.65rem, 0.9vw, 0.85rem)" }}>
            {monthlyLabel}
          </span>
          <span className="font-bold truncate text-right" style={{ color: color.text, fontSize: "clamp(0.65rem, 0.9vw, 0.85rem)" }}>
            {monthlyVal !== "-" ? `${monthlyVal}${kpi.unit ? " " + kpi.unit : ""}` : "—"}
          </span>
        </div>
        {/* Animated status bar */}
        <div
          className="rounded-full overflow-hidden"
          style={{ height: "clamp(5px, 0.6vw, 8px)", background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="h-full rounded-full kpi-bar-shimmer"
            style={{
              width: progress !== null ? `${progress}%` : "0%",
              background: `linear-gradient(90deg, ${color.topBar}88, ${color.topBar}, ${color.topBar}cc)`,
              boxShadow: `0 0 8px ${color.topBar}88`,
              transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface KpiGridProps {
  allKpis: any[];
  kpiPages: number;
  currentKpiPage: number;
  switchKpiPage: (page: number) => void;
  getDailyValue: (kpiId: number) => string;
  getMonthlyValue: (kpiId: number) => string;
  monthlyLabel: string;
  cols?: number;
  transitionStyle: string;
  splitSide?: "left" | "right";
  showPagination?: boolean;
}

const KpiGrid = memo(function KpiGrid({
  allKpis,
  kpiPages,
  currentKpiPage,
  switchKpiPage,
  getDailyValue,
  getMonthlyValue,
  monthlyLabel,
  cols = 3,
  transitionStyle,
  splitSide,
  showPagination = true,
}: KpiGridProps) {
  const pageSize = cols === 3 ? KPI_PAGE_SIZE : cols * 2;
  const [displayPage, setDisplayPage] = useState(currentKpiPage);
  const [exitPage, setExitPage] = useState<number | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (currentKpiPage === displayPage) return;
    setExitPage(displayPage);
    setDisplayPage(currentKpiPage);
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    exitTimerRef.current = setTimeout(() => {
      setExitPage(null);
    }, TRANSITION_DURATION);
    return () => { if (exitTimerRef.current) clearTimeout(exitTimerRef.current); };
  }, [currentKpiPage]);

  const enterClass = ENTER_CLASSES[transitionStyle] || ENTER_CLASSES.fade;
  const exitClass = EXIT_CLASSES[transitionStyle] || EXIT_CLASSES.fade;

  const getPageKpis = (pageIdx: number) => {
    const pageKpis = allKpis.slice(pageIdx * KPI_PAGE_SIZE, (pageIdx + 1) * KPI_PAGE_SIZE);
    if (!splitSide) return pageKpis;
    const half = Math.ceil(pageKpis.length / 2);
    return splitSide === "left" ? pageKpis.slice(0, half) : pageKpis.slice(half);
  };

  const renderPage = (pageIdx: number, animClass: string) => {
    const pageKpis = getPageKpis(pageIdx);
    const fillCount = splitSide ? 0 : Math.max(0, pageSize - pageKpis.length);
    return (
      <div
        className={`grid gap-3 ${animClass}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(2, 1fr)`,
          position: "absolute",
          inset: 0,
        }}
        data-testid={splitSide ? `section-kpis-${splitSide}` : "section-kpis"}
      >
        {pageKpis.map((kpi: any) => (
          <KpiCardContent
            key={kpi.id}
            kpi={kpi}
            allKpis={allKpis}
            getDailyValue={getDailyValue}
            getMonthlyValue={getMonthlyValue}
            monthlyLabel={monthlyLabel}
          />
        ))}
        {Array.from({ length: fillCount }).map((_, i) => (
          <div key={`empty-${i}`} className="rounded-2xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {exitPage !== null && renderPage(exitPage, exitClass)}
        {renderPage(displayPage, exitPage !== null ? enterClass : "")}
      </div>

      {showPagination && kpiPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          {Array.from({ length: kpiPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => switchKpiPage(i)}
              className={`rounded-full transition-all duration-300 ${i === currentKpiPage ? "w-6 h-1.5" : "w-1.5 h-1.5 hover:opacity-70"}`}
              style={{ background: i === currentKpiPage ? "#60a5fa" : "rgba(255,255,255,0.2)" }}
              data-testid={`button-kpi-page-${i}`}
            />
          ))}
          <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.25)" }}>{currentKpiPage + 1}/{kpiPages}</span>
        </div>
      )}
    </div>
  );
});

const transitionCSS = `
@keyframes kpiFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes kpiFadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes kpiSlideLeftIn {
  from { opacity: 0; transform: translateX(60px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes kpiSlideLeftOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-60px); }
}
@keyframes kpiSlideUpIn {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes kpiSlideUpOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-30px); }
}
@keyframes kpiZoomIn {
  from { opacity: 0; transform: scale(0.94); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes kpiZoomOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.04); }
}
.kpi-fade-in { animation: kpiFadeIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-fade-out { animation: kpiFadeOut 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-slide-left-in { animation: kpiSlideLeftIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-slide-left-out { animation: kpiSlideLeftOut 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-slide-up-in { animation: kpiSlideUpIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-slide-up-out { animation: kpiSlideUpOut 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-zoom-in { animation: kpiZoomIn 0.4s cubic-bezier(0.16,1,0.3,1) both; }
.kpi-zoom-out { animation: kpiZoomOut 0.4s cubic-bezier(0.16,1,0.3,1) both; }

@keyframes cardGlow {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.05); }
}
.kpi-card-glow { animation: cardGlow 5s ease-in-out infinite; }

@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.12); opacity: 0.8; }
}
.kpi-icon-pulse { animation: iconPulse 3.5s ease-in-out infinite; }

@keyframes livePulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}
.live-dot { animation: livePulse 1.5s ease-in-out infinite; }

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

@keyframes barShimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.kpi-bar-shimmer {
  background-size: 200% auto !important;
  animation: barShimmer 2.5s linear infinite;
}
`;

export default function TVDashboard() {
  const [, params] = useRoute("/tv-dashboard/:id");
  const id = params?.id;
  const { t } = useLanguage();

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoFading, setVideoFading] = useState(false);
  const [currentKpiPage, setCurrentKpiPage] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kpiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/tv-dashboards", id, "display"],
    queryFn: async () => {
      const res = await fetch(`/api/tv-dashboards/${id}/display`);
      if (!res.ok) throw new Error("Failed to load dashboard");
      return res.json();
    },
    enabled: !!id,
    refetchInterval: 60000,
  });

  const videos = useMemo(() => (data?.videos || []).filter((v: any) => v.isActive), [data?.videos]);
  const kpis = data?.kpis || [];
  const kpiValues = data?.kpiValues || [];
  const kpiPages = Math.ceil(kpis.length / KPI_PAGE_SIZE);

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7);

  const getDailyValue = useCallback((kpiId: number) => {
    const val = kpiValues.find((v: any) => v.kpiId === kpiId && v.periodType === "daily" && v.periodDate === today);
    return val ? val.value : "-";
  }, [kpiValues, today]);

  const getMonthlyValue = useCallback((kpiId: number) => {
    const dailyThisMonth = kpiValues.filter((v: any) =>
      v.kpiId === kpiId &&
      v.periodType === "daily" &&
      v.periodDate?.startsWith(currentMonth)
    );
    if (dailyThisMonth.length === 0) return "-";
    const sum = dailyThisMonth.reduce((acc: number, v: any) => {
      const num = parseFloat(v.value);
      return isNaN(num) ? acc : acc + num;
    }, 0);
    const hasDecimals = dailyThisMonth.some((v: any) => String(v.value).includes("."));
    return hasDecimals ? sum.toFixed(2) : String(Math.round(sum));
  }, [kpiValues, currentMonth]);

  const switchVideo = useCallback((newIndex: number) => {
    if (newIndex === currentVideoIndex) return;
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    setVideoFading(true);
    setTimeout(() => {
      setCurrentVideoIndex(newIndex);
      setVideoFading(false);
    }, 400);
  }, [currentVideoIndex]);

  const switchKpiPage = useCallback((newPage: number) => {
    if (newPage === currentKpiPage) return;
    setCurrentKpiPage(newPage);
  }, [currentKpiPage]);

  useEffect(() => {
    if (videos.length <= 1) return;
    videoTimerRef.current = setInterval(() => {
      setVideoFading(true);
      setTimeout(() => {
        setCurrentVideoIndex(prev => (prev + 1) % videos.length);
        setVideoFading(false);
      }, 500);
    }, 45000);
    return () => { if (videoTimerRef.current) clearInterval(videoTimerRef.current); };
  }, [videos.length]);

  const kpiRotationMs = (Math.max(1, data?.kpiRotationSeconds ?? 8) * 1000);

  useEffect(() => {
    if (kpiPages <= 1) return;
    kpiTimerRef.current = setInterval(() => {
      setCurrentKpiPage(prev => (prev + 1) % kpiPages);
    }, kpiRotationMs);
    return () => { if (kpiTimerRef.current) clearInterval(kpiTimerRef.current); };
  }, [kpiPages, kpiRotationMs]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070910" }}>
        <div className="text-lg font-medium animate-pulse" style={{ color: "rgba(255,255,255,0.3)" }}>{t.tvDashboard.refreshing}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#070910" }}>
        <Monitor className="w-16 h-16" style={{ color: "rgba(255,255,255,0.1)" }} />
        <div className="text-xl font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>{t.tvDashboard.noData}</div>
        <Link href="/tv-dashboard">
          <span className="text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-2 text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t.tvDashboard.allDashboards}
          </span>
        </Link>
      </div>
    );
  }

  const currentVideo = videos[currentVideoIndex];
  const showVideo = data.showVideo !== false;
  const hasVideo = showVideo && videos.length > 0;
  const hasKpis = kpis.length > 0;
  const validPositions = ["bottom", "top", "left", "right", "center", "top-right", "top-left"];
  const videoPosition = validPositions.includes(data?.videoPosition) ? data.videoPosition : "bottom";
  const isCornerPosition = videoPosition === "top-right" || videoPosition === "top-left";
  const isSidePosition = videoPosition === "left" || videoPosition === "right";
  const isCenterPosition = videoPosition === "center";
  const transitionStyle = data?.kpiTransitionStyle || "fade";
  const videoSizePct = Math.max(20, Math.min(80, data?.videoSizePercent ?? 55));

  const videoPanelProps = {
    currentVideo,
    videos,
    videoFading,
    currentVideoIndex,
    switchVideo,
  };

  const kpiGridProps = {
    allKpis: kpis,
    kpiPages,
    currentKpiPage,
    switchKpiPage,
    getDailyValue,
    getMonthlyValue,
    monthlyLabel: t.tvDashboard.monthly,
    transitionStyle,
  };

  const renderLayout = () => {
    if (!hasKpis && !hasVideo) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ color: "rgba(255,255,255,0.15)" }}>
          <BarChart3 className="w-16 h-16" />
          <p className="text-lg font-medium">{t.tvDashboard.noData}</p>
          <p className="text-sm">{t.tvDashboard.noDataMessage}</p>
        </div>
      );
    }

    if (!hasVideo) return <KpiGrid {...kpiGridProps} />;
    if (!hasKpis) return <VideoPanel {...videoPanelProps} className="flex-1" />;

    const kpiPct = 100 - videoSizePct;

    if (isCornerPosition) {
      const cornerWidth = videoSizePct / 2;
      return (
        <div className="flex-1 flex flex-col min-h-0 relative">
          <KpiGrid {...kpiGridProps} />
          <div
            className={`absolute top-2 ${videoPosition === "top-right" ? "right-2" : "left-2"} z-20`}
            style={{ width: `${cornerWidth}%`, aspectRatio: "16/9", borderRadius: "16px", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.7)" }}
          >
            <VideoPanel {...videoPanelProps} />
          </div>
        </div>
      );
    }

    if (isCenterPosition) {
      return (
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          <div style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <KpiGrid {...kpiGridProps} cols={1} splitSide="left" showPagination={false} />
          </div>
          <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minWidth: 0, minHeight: 0 }}>
            <VideoPanel {...videoPanelProps} className="h-full" />
          </div>
          <div style={{ flex: "1 1 0", minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <KpiGrid {...kpiGridProps} cols={1} splitSide="right" />
          </div>
        </div>
      );
    }

    if (isSidePosition) {
      const kpiSection = (
        <div style={{ flex: `${kpiPct} ${kpiPct} 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <KpiGrid {...kpiGridProps} cols={2} />
        </div>
      );
      const videoSection = (
        <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minWidth: 0, minHeight: 0 }}>
          <VideoPanel {...videoPanelProps} className="h-full" />
        </div>
      );
      return (
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          {videoPosition === "left" ? <>{videoSection}{kpiSection}</> : <>{kpiSection}{videoSection}</>}
        </div>
      );
    }

    const kpiSection = (
      <div style={{ flex: `${kpiPct} ${kpiPct} 0`, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <KpiGrid {...kpiGridProps} />
      </div>
    );
    const videoSection = (
      <VideoPanel {...videoPanelProps} className="" style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minHeight: 0 }} />
    );

    if (videoPosition === "top") return <>{videoSection}{kpiSection}</>;
    return <>{kpiSection}{videoSection}</>;
  };

  return (
    <div
      ref={containerRef}
      className="text-white flex flex-col h-screen overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 20% 50%, #0d1525 0%, #070910 60%)" }}
      data-testid="tv-dashboard-container"
    >
      <style>{transitionCSS}</style>

      {/* Subtle dot grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 flex items-center justify-between px-5 py-2.5 shrink-0"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/tv-dashboard">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
              data-testid="link-back-dashboards"
            >
              <ArrowLeft className="w-4 h-4" />
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-white leading-tight tracking-tight" data-testid="text-dashboard-name">
                {data.name}
              </h1>
              {data.department && (
                <span
                  className="text-xs font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(96,165,250,0.1)", color: "rgba(96,165,250,0.7)" }}
                >
                  {data.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full live-dot" style={{ background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(34,197,94,0.7)" }}>Live</span>
          </div>

          <button
            onClick={toggleFullScreen}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}
            data-testid="button-fullscreen"
          >
            {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <LiveClock />
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col min-h-0 p-3 gap-3">
        {renderLayout()}
      </main>
    </div>
  );
}
