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
  { bg: "bg-cyan-500/15", icon: "text-cyan-400", border: "border-cyan-500/20", accent: "text-cyan-400" },
  { bg: "bg-emerald-500/15", icon: "text-emerald-400", border: "border-emerald-500/20", accent: "text-emerald-400" },
  { bg: "bg-amber-500/15", icon: "text-amber-400", border: "border-amber-500/20", accent: "text-amber-400" },
  { bg: "bg-orange-500/15", icon: "text-orange-400", border: "border-orange-500/20", accent: "text-orange-400" },
  { bg: "bg-purple-500/15", icon: "text-purple-400", border: "border-purple-500/20", accent: "text-purple-400" },
  { bg: "bg-blue-500/15", icon: "text-blue-400", border: "border-blue-500/20", accent: "text-blue-400" },
  { bg: "bg-rose-500/15", icon: "text-rose-400", border: "border-rose-500/20", accent: "text-rose-400" },
  { bg: "bg-teal-500/15", icon: "text-teal-400", border: "border-teal-500/20", accent: "text-teal-400" },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
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

function AnimatedValue({ value, unit, testId }: { value: string | number; unit?: string | null; testId: string }) {
  const display = useCountUp(value);
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-bold text-white leading-none" data-testid={testId}>
        {display}
      </span>
      {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
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
      className={`bg-black rounded-xl overflow-hidden flex flex-col min-h-0 ${className}`}
      style={style}
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
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 z-10 flex items-end justify-between">
          <p className="text-white font-medium text-sm">{currentVideo?.title}</p>
          {videos.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => switchVideo((currentVideoIndex - 1 + videos.length) % videos.length)}
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                data-testid="button-prev-video"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <div className="flex gap-1.5">
                {videos.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => switchVideo(idx)}
                    className={`rounded-full transition-all ${idx === currentVideoIndex ? "bg-white w-4 h-1.5" : "bg-white/40 hover:bg-white/60 w-1.5 h-1.5"}`}
                    data-testid={`button-video-dot-${idx}`}
                  />
                ))}
              </div>
              <button
                onClick={() => switchVideo((currentVideoIndex + 1) % videos.length)}
                className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                data-testid="button-next-video"
              >
                <SkipForward className="w-4 h-4" />
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
  return (
    <div
      key={kpi.id}
      className={`bg-[#111827] rounded-xl border ${color.border} p-3 flex flex-col justify-between kpi-card-glow`}
      data-testid={`card-kpi-${kpi.id}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 leading-tight">
          {kpi.labelEn || kpi.name}
        </span>
        <div className={`w-6 h-6 rounded-lg ${color.bg} flex items-center justify-center shrink-0 kpi-icon-pulse`}>
          <IconComp className={`w-3 h-3 ${color.icon}`} />
        </div>
      </div>
      <AnimatedValue value={dailyVal} unit={kpi.unit} testId={`text-daily-value-${kpi.id}`} />
      <div className="mt-1">
        <span className={`text-xs font-medium ${color.accent}`}>
          {monthlyLabel}: {monthlyVal}
        </span>
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
          position: 'absolute',
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
          <div key={`empty-${i}`} className="rounded-xl border border-transparent" />
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
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: kpiPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => switchKpiPage(i)}
              className={`rounded-full transition-all ${i === currentKpiPage ? "bg-blue-400 w-5 h-2" : "bg-gray-700 hover:bg-gray-500 w-2 h-2"}`}
              data-testid={`button-kpi-page-${i}`}
            />
          ))}
          <span className="text-xs text-gray-600 ml-2">{currentKpiPage + 1}/{kpiPages}</span>
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
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes kpiSlideLeftOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-100%); }
}
@keyframes kpiSlideUpIn {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes kpiSlideUpOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-40px); }
}
@keyframes kpiZoomIn {
  from { opacity: 0; transform: scale(0.92); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes kpiZoomOut {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.92); }
}
.kpi-fade-in { animation: kpiFadeIn 0.4s ease both; }
.kpi-fade-out { animation: kpiFadeOut 0.4s ease both; }
.kpi-slide-left-in { animation: kpiSlideLeftIn 0.35s ease both; }
.kpi-slide-left-out { animation: kpiSlideLeftOut 0.35s ease both; }
.kpi-slide-up-in { animation: kpiSlideUpIn 0.35s ease both; }
.kpi-slide-up-out { animation: kpiSlideUpOut 0.35s ease both; }
.kpi-zoom-in { animation: kpiZoomIn 0.35s ease both; }
.kpi-zoom-out { animation: kpiZoomOut 0.35s ease both; }

@keyframes cardGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  50% { box-shadow: 0 0 8px 1px rgba(59, 130, 246, 0.08); }
}
.kpi-card-glow { animation: cardGlow 4s ease-in-out infinite; }

@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.85; }
}
.kpi-icon-pulse { animation: iconPulse 3s ease-in-out infinite; }
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
    const val = kpiValues.find((v: any) => v.kpiId === kpiId && v.periodType === "monthly" && v.periodDate?.startsWith(currentMonth));
    return val ? val.value : "-";
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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-xl text-gray-500 animate-pulse">{t.tvDashboard.refreshing}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center gap-4">
        <Monitor className="w-16 h-16 text-gray-700" />
        <div className="text-xl text-gray-500">{t.tvDashboard.noData}</div>
        <Link href="/tv-dashboard">
          <span className="text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-2 text-sm">
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
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
          <BarChart3 className="w-16 h-16 mb-4" />
          <p className="text-lg font-medium">{t.tvDashboard.noData}</p>
          <p className="text-sm mt-1">{t.tvDashboard.noDataMessage}</p>
        </div>
      );
    }

    if (!hasVideo) {
      return <KpiGrid {...kpiGridProps} />;
    }

    if (!hasKpis) {
      return <VideoPanel {...videoPanelProps} className="flex-1" />;
    }

    const kpiPct = 100 - videoSizePct;

    if (isCornerPosition) {
      const cornerWidth = videoSizePct / 2;
      return (
        <div className="flex-1 flex flex-col min-h-0 relative">
          <KpiGrid {...kpiGridProps} />
          <div
            className={`absolute top-2 ${videoPosition === "top-right" ? "right-2" : "left-2"} z-20 shadow-2xl rounded-xl overflow-hidden`}
            style={{ width: `${cornerWidth}%`, aspectRatio: "16/9" }}
          >
            <VideoPanel {...videoPanelProps} />
          </div>
        </div>
      );
    }

    if (isCenterPosition) {
      return (
        <div className="flex-1 flex flex-row gap-3 min-h-0">
          <div style={{ flex: `1 1 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <KpiGrid {...kpiGridProps} cols={1} splitSide="left" showPagination={false} />
          </div>
          <div style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minWidth: 0, minHeight: 0 }}>
            <VideoPanel {...videoPanelProps} className="h-full" />
          </div>
          <div style={{ flex: `1 1 0`, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
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

    // top / bottom layouts — flex column, proportional grow so height works
    // with both h-screen and min-h-screen containers
    const kpiSection = (
      <div style={{ flex: `${kpiPct} ${kpiPct} 0`, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <KpiGrid {...kpiGridProps} />
      </div>
    );
    const videoSection = (
      <VideoPanel {...videoPanelProps} className="" style={{ flex: `${videoSizePct} ${videoSizePct} 0`, minHeight: 0 }} />
    );

    if (videoPosition === "top") {
      return <>{videoSection}{kpiSection}</>;
    }

    return <>{kpiSection}{videoSection}</>;
  };

  return (
    <div
      ref={containerRef}
      className="bg-[#0a0e1a] text-white flex flex-col h-screen"
      data-testid="tv-dashboard-container"
    >
      <style>{transitionCSS}</style>
      <header className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/tv-dashboard">
            <span className="text-gray-500 hover:text-gray-300 cursor-pointer transition-colors" data-testid="link-back-dashboards">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-100 leading-tight" data-testid="text-dashboard-name">{data.name}</h1>
            {data.department && <span className="text-xs text-gray-500">{data.department.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <button onClick={toggleFullScreen} className="text-gray-500 hover:text-gray-300 transition-colors" data-testid="button-fullscreen">
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <LiveClock />
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        {renderLayout()}
      </main>
    </div>
  );
}
