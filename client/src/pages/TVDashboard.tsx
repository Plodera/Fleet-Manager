import { useState, useEffect, useRef, useCallback, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import {
  Monitor, ArrowLeft, Maximize, Minimize, SkipForward, SkipBack,
  TrendingUp, Target, Zap, BarChart3, Activity,
  Gauge, Flame, Droplets, Box, Layers, Settings2
} from "lucide-react";

function getGridDims(pageSize: number): { cols: number; rows: number } {
  if (pageSize <= 1) return { cols: 1, rows: 1 };
  if (pageSize <= 2) return { cols: 2, rows: 1 };
  if (pageSize <= 3) return { cols: 3, rows: 1 };
  if (pageSize <= 4) return { cols: 2, rows: 2 };
  return { cols: 3, rows: 2 };
}

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

function AnimatedValue({ value, unit, testId, fontScale = 1 }: { value: string | number; unit?: string | null; testId: string; fontScale?: number }) {
  const display = useCountUp(value);
  const s = fontScale;
  return (
    <div className="flex items-baseline gap-3 leading-none">
      <span className="font-black text-white leading-none tracking-tight" style={{ fontSize: `calc(${s} * clamp(2.5rem, 4.5vw, 5rem))` }} data-testid={testId}>
        {display}
      </span>
      {unit && <span className="font-bold text-white/50 uppercase tracking-wider" style={{ fontSize: `calc(${s} * clamp(0.85rem, 1.3vw, 1.2rem))` }}>{unit}</span>}
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
          ) : currentVideo && currentVideo.videoType === "image" ? (
            <img
              key={currentVideo.id}
              src={currentVideo.url}
              className="w-full h-full object-cover"
              alt={currentVideo.title}
              data-testid="video-player-image"
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
  shimmerDuration,
  fontScale = 1,
}: {
  kpi: any;
  allKpis: any[];
  getDailyValue: (kpiId: number) => string;
  getMonthlyValue: (kpiId: number) => string;
  monthlyLabel: string;
  shimmerDuration: number;
  fontScale?: number;
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

  const s = fontScale;
  return (
    <div
      className="rounded-2xl flex flex-col justify-between kpi-card-glow overflow-hidden"
      style={{
        background: "rgba(10,14,20,0.95)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderTop: `2px solid ${color.topBar}`,
        boxShadow: color.glow,
        padding: `calc(${s} * clamp(8px, 1.2vw, 16px))`,
      }}
      data-testid={`card-kpi-${kpi.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-bold uppercase tracking-widest leading-tight" style={{ color: "rgba(255,255,255,0.85)", fontSize: `calc(${s} * clamp(0.75rem, 1.2vw, 1.1rem))` }}>
          {kpi.labelEn || kpi.name}
        </span>
        <div
          className="flex-shrink-0 rounded-xl flex items-center justify-center kpi-icon-pulse"
          style={{ width: `calc(${s} * clamp(2rem, 2.8vw, 3rem))`, height: `calc(${s} * clamp(2rem, 2.8vw, 3rem))`, background: color.iconBg, boxShadow: `0 0 6px ${color.topBar}33` }}
        >
          <IconComp className={`${color.icon}`} style={{ width: `calc(${s} * clamp(1rem, 1.5vw, 1.5rem))`, height: `calc(${s} * clamp(1rem, 1.5vw, 1.5rem))` }} />
        </div>
      </div>

      {/* "TODAY" badge + big daily value */}
      <div className="flex flex-col gap-0.5">
        <span className="font-black uppercase tracking-widest" style={{ color: color.topBar, fontSize: `calc(${s} * clamp(0.65rem, 0.95vw, 0.85rem))` }}>
          TODAY
        </span>
        <AnimatedValue value={dailyVal} unit={kpi.unit} testId={`text-daily-value-${kpi.id}`} fontScale={s} />
      </div>

      {/* Monthly total */}
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.55)", fontSize: `calc(${s} * clamp(0.65rem, 0.95vw, 0.85rem))` }}>
            {monthlyLabel}
          </span>
          <span className="font-bold truncate text-right" style={{ color: color.text, fontSize: `calc(${s} * clamp(0.65rem, 0.95vw, 0.85rem))` }}>
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
              background: `linear-gradient(90deg, ${color.topBar}88, ${color.topBar}ff, ${color.topBar}cc, ${color.topBar}ff, ${color.topBar}88)`,
              boxShadow: `0 0 8px ${color.topBar}88`,
              transition: "width 1.2s cubic-bezier(0.16,1,0.3,1)",
              animationName: "barShimmer",
              animationDuration: `${shimmerDuration}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
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
  shimmerDuration: number;
  pageSize?: number;
  fontScale?: number;
}

const KpiGrid = memo(function KpiGrid({
  allKpis,
  kpiPages,
  currentKpiPage,
  switchKpiPage,
  getDailyValue,
  getMonthlyValue,
  monthlyLabel,
  cols: colsProp,
  transitionStyle,
  splitSide,
  showPagination = true,
  shimmerDuration,
  pageSize: pageSizeProp = 6,
  fontScale = 1,
}: KpiGridProps) {
  const pageSize = colsProp !== undefined ? colsProp * 2 : pageSizeProp;
  const { cols, rows } = colsProp !== undefined
    ? { cols: colsProp, rows: 2 }
    : getGridDims(pageSizeProp);
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
    const pageKpis = allKpis.slice(pageIdx * pageSize, (pageIdx + 1) * pageSize);
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
          gridTemplateRows: `repeat(${rows}, 1fr)`,
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
            shimmerDuration={shimmerDuration}
            fontScale={fontScale}
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

.kpi-card-glow {}

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
}

@keyframes tickerScroll {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
.ticker-scroll {
  display: inline-block;
  white-space: nowrap;
  animation: tickerScroll var(--ticker-duration, 28s) linear infinite;
}

@keyframes bannerSlideFadeIn {
  0% { opacity: 0; transform: translateY(30px); }
  8% { opacity: 1; transform: translateY(0); }
  88% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
.banner-slide-fade {
  animation: bannerSlideFadeIn 12s ease-in-out infinite;
}

@keyframes bannerMarquee {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}
.banner-marquee {
  display: inline-block;
  white-space: nowrap;
  animation: bannerMarquee var(--banner-marquee-duration, 20s) linear infinite;
}

@keyframes bannerPulse {
  0%, 100% { opacity: 1; text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; }
  50% { opacity: 0.6; text-shadow: 0 0 5px currentColor; }
}
.banner-pulse {
  animation: bannerPulse 2.5s ease-in-out infinite;
}
`;

function TickerBar({ text, speed = 5 }: { text: string; speed?: number }) {
  // speed 1–10: factor = 0.6/speed → at speed 5 = 0.12s/char (same as before); min 5s
  const factor = 0.6 / Math.max(1, Math.min(10, speed));
  const duration = Math.max(5, Math.round(text.length * factor)) + "s";
  return (
    <div
      className="shrink-0 overflow-hidden"
      style={{
        background: "rgba(0,0,0,0.7)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        height: "36px",
        display: "flex",
        alignItems: "center",
      }}
      data-testid="ticker-bar"
    >
      <span
        className="ticker-scroll text-white/80 font-semibold tracking-wide"
        style={{ fontSize: "0.95rem", letterSpacing: "0.04em", ["--ticker-duration" as string]: duration }}
      >
        {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
      </span>
    </div>
  );
}

function BannerPanel({ text, style, fontSize, speed = 5 }: { text: string; style: string; fontSize: number; speed?: number }) {
  const [twState, setTwState] = useState({ displayed: "", charIndex: 0, phase: "typing" as "typing" | "holding" | "erasing" });
  const [cursorOn, setCursorOn] = useState(true);

  useEffect(() => {
    if (style !== "typewriter") return;
    let timeout: ReturnType<typeof setTimeout>;
    const { charIndex, phase } = twState;
    if (phase === "typing") {
      if (charIndex < text.length) {
        timeout = setTimeout(() => setTwState(s => ({ ...s, charIndex: s.charIndex + 1, displayed: text.slice(0, s.charIndex + 1) })), 80);
      } else {
        timeout = setTimeout(() => setTwState(s => ({ ...s, phase: "holding" })), 2000);
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setTwState(s => ({ ...s, phase: "erasing" })), 1500);
    } else {
      if (charIndex > 0) {
        timeout = setTimeout(() => setTwState(s => ({ ...s, charIndex: s.charIndex - 1, displayed: text.slice(0, s.charIndex - 1) })), 40);
      } else {
        timeout = setTimeout(() => setTwState({ displayed: "", charIndex: 0, phase: "typing" }), 500);
      }
    }
    return () => clearTimeout(timeout);
  }, [twState, text, style]);

  useEffect(() => {
    if (style !== "typewriter") return;
    const iv = setInterval(() => setCursorOn(v => !v), 500);
    return () => clearInterval(iv);
  }, [style]);

  const containerBase: React.CSSProperties = {
    background: "rgba(0,0,0,0.6)",
    borderRadius: "12px",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  const textBase: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "0.02em",
    wordBreak: "break-word",
    overflowWrap: "break-word",
  };

  if (style === "marquee") {
    // speed 1–10: factor = 0.75/speed → at speed 5 = 0.15s/char; min 5s
    const marqueeFactor = 0.75 / Math.max(1, Math.min(10, speed));
    const marqueeDuration = Math.max(5, Math.round(text.length * marqueeFactor)) + "s";
    return (
      <div className="flex-1 flex items-center" style={{ ...containerBase, padding: "8px 0", minHeight: 0, flexShrink: 0 }} data-testid="banner-panel">
        <span className="banner-marquee" style={{ ...textBase, color: "#fff", whiteSpace: "nowrap", display: "inline-block", ["--banner-marquee-duration" as string]: marqueeDuration }}>
          {text}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{text}
        </span>
      </div>
    );
  }

  if (style === "pulse") {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ ...containerBase, padding: "16px", minHeight: 0, flexShrink: 0, textAlign: "center" }} data-testid="banner-panel">
        <span className="banner-pulse" style={{ ...textBase, color: "#00e5ff", display: "block", width: "100%" }}>
          {text}
        </span>
      </div>
    );
  }

  if (style === "typewriter") {
    return (
      <div className="flex-1 flex items-start" style={{ ...containerBase, padding: "16px", minHeight: 0, flexShrink: 0 }} data-testid="banner-panel">
        <span style={{ ...textBase, color: "#fff", display: "block", width: "100%" }}>
          {twState.displayed}
          <span style={{ opacity: cursorOn ? 1 : 0, color: "#00e5ff" }}>|</span>
        </span>
      </div>
    );
  }

  /* slide-fade */
  return (
    <div className="flex-1 flex items-center justify-center" style={{ ...containerBase, padding: "16px", minHeight: 0, flexShrink: 0, textAlign: "center" }} data-testid="banner-panel">
      <span className="banner-slide-fade" style={{ ...textBase, color: "#fff", display: "block", width: "100%" }}>
        {text}
      </span>
    </div>
  );
}

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
  const kpisPerPage = data?.kpisPerPage ?? 6;
  const fontScale = data?.kpiFontScale ?? 1.0;
  const kpiPages = Math.ceil(kpis.length / kpisPerPage);

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
  const tickerText = data?.tickerText || "";
  const tickerPosition = data?.tickerPosition || "off";
  const showTicker = tickerPosition !== "off" && tickerText.trim().length > 0;
  const bannerText = data?.bannerText || "";
  const bannerStyle = data?.bannerStyle || "off";
  const bannerFontSize = data?.bannerFontSize ?? 36;
  const bannerScrollSpeed = data?.bannerScrollSpeed ?? 5;
  const showBanner = bannerStyle !== "off" && bannerText.trim().length > 0;
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

  const shimmerDuration = Math.max(1, data?.shimmerDurationSeconds ?? 6);

  const kpiGridProps = {
    allKpis: kpis,
    kpiPages,
    currentKpiPage,
    switchKpiPage,
    getDailyValue,
    getMonthlyValue,
    monthlyLabel: t.tvDashboard.monthly,
    transitionStyle,
    shimmerDuration,
    pageSize: kpisPerPage,
    fontScale,
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
    if (!hasKpis) {
      const ticker = showTicker && tickerPosition !== "bottom-bar";
      return (
        <div className="flex-1 flex flex-col min-h-0">
          {ticker && tickerPosition === "above" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
          <VideoPanel {...videoPanelProps} className="flex-1 min-h-0" />
          {ticker && tickerPosition === "below" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
        </div>
      );
    }

    const kpiPct = 100 - videoSizePct;

    if (isCornerPosition) {
      const inlineTicker = showTicker && tickerPosition !== "bottom-bar";
      const kpiSection = (
        <div style={{ flex: `${kpiPct} ${kpiPct} 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <KpiGrid {...kpiGridProps} cols={2} />
        </div>
      );
      const videoColumn = (
        <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
          {inlineTicker && tickerPosition === "above" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
          <div style={{ width: "100%", aspectRatio: "16/9", flexShrink: 0 }}>
            <VideoPanel {...videoPanelProps} className="h-full" />
          </div>
          {inlineTicker && tickerPosition === "below" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
          {showBanner && <BannerPanel text={bannerText} style={bannerStyle} fontSize={bannerFontSize} speed={bannerScrollSpeed} />}
        </div>
      );
      return (
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          {videoPosition === "top-left" ? <>{videoColumn}{kpiSection}</> : <>{kpiSection}{videoColumn}</>}
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
      const inlineTicker = showTicker && tickerPosition !== "bottom-bar";
      const videoSection = (
        <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {inlineTicker && tickerPosition === "above" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
          <div style={{ flex: 1, minHeight: 0 }}>
            <VideoPanel {...videoPanelProps} className="h-full" />
          </div>
          {inlineTicker && tickerPosition === "below" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
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
    const videoPanel = (
      <VideoPanel {...videoPanelProps} className="" style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minHeight: 0 }} />
    );
    const inlineTicker = showTicker && tickerPosition !== "bottom-bar";
    const videoSection = inlineTicker ? (
      <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {tickerPosition === "above" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
        <div style={{ flex: 1, minHeight: 0 }}>
          <VideoPanel {...videoPanelProps} className="h-full" />
        </div>
        {tickerPosition === "below" && <TickerBar text={tickerText} speed={bannerScrollSpeed} />}
      </div>
    ) : videoPanel;

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
        className="relative z-10 flex items-center justify-between px-10 py-3 shrink-0"
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
      <main className="relative z-10 flex-1 flex flex-col min-h-0 px-10 pt-3 pb-12 gap-3">
        {renderLayout()}
      </main>

      {/* Full-width bottom bar ticker */}
      {showTicker && tickerPosition === "bottom-bar" && <div className="pb-12"><TickerBar text={tickerText} speed={bannerScrollSpeed} /></div>}
    </div>
  );
}
