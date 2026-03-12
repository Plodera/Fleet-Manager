import { useState, useEffect, useRef, useCallback } from "react";
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
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
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

export default function TVDashboard() {
  const [, params] = useRoute("/tv-dashboard/:id");
  const id = params?.id;
  const { t } = useLanguage();

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [videoFading, setVideoFading] = useState(false);
  const [currentKpiPage, setCurrentKpiPage] = useState(0);
  const [kpiFading, setKpiFading] = useState(false);
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

  const videos = (data?.videos || []).filter((v: any) => v.isActive);
  const kpis = data?.kpis || [];
  const kpiValues = data?.kpiValues || [];
  const kpiPages = Math.ceil(kpis.length / KPI_PAGE_SIZE);

  const today = new Date().toISOString().split("T")[0];
  const currentMonth = today.substring(0, 7);

  const getDailyValue = (kpiId: number) => {
    const val = kpiValues.find((v: any) => v.kpiId === kpiId && v.periodType === "daily" && v.periodDate === today);
    return val ? val.value : "-";
  };

  const getMonthlyValue = (kpiId: number) => {
    const val = kpiValues.find((v: any) => v.kpiId === kpiId && v.periodType === "monthly" && v.periodDate?.startsWith(currentMonth));
    return val ? val.value : "-";
  };

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
    setKpiFading(true);
    setTimeout(() => {
      setCurrentKpiPage(newPage);
      setKpiFading(false);
    }, 400);
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

  useEffect(() => {
    if (kpiPages <= 1) return;
    kpiTimerRef.current = setInterval(() => {
      setKpiFading(true);
      setTimeout(() => {
        setCurrentKpiPage(prev => (prev + 1) % kpiPages);
        setKpiFading(false);
      }, 400);
    }, 8000);
    return () => { if (kpiTimerRef.current) clearInterval(kpiTimerRef.current); };
  }, [kpiPages]);

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
  const currentPageKpis = kpis.slice(currentKpiPage * KPI_PAGE_SIZE, (currentKpiPage + 1) * KPI_PAGE_SIZE);
  const hasVideo = videos.length > 0;
  const hasKpis = kpis.length > 0;

  return (
    <div
      ref={containerRef}
      className={`bg-[#0a0e1a] text-white flex flex-col ${isFullScreen ? "h-screen" : "min-h-screen"}`}
      data-testid="tv-dashboard-container"
    >
      {/* Header */}
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

      {/* Main — split vertically: KPIs top, Video bottom */}
      <main className="flex-1 flex flex-col min-h-0 p-3 gap-3">

        {/* KPI Section */}
        {hasKpis && (
          <div className="flex flex-col" style={{ flex: hasVideo ? "0 0 42%" : "1 1 auto" }}>
            {/* KPI grid — always 2 rows × 3 cols */}
            <div
              className="grid grid-cols-3 gap-3 flex-1 transition-opacity duration-400"
              style={{ opacity: kpiFading ? 0 : 1 }}
              data-testid="section-kpis"
            >
              {currentPageKpis.map((kpi: any) => {
                const globalIdx = kpis.indexOf(kpi);
                const color = KPI_COLORS[globalIdx % KPI_COLORS.length];
                const IconComp = KPI_ICONS[globalIdx % KPI_ICONS.length];
                const dailyVal = getDailyValue(kpi.id);
                const monthlyVal = getMonthlyValue(kpi.id);
                return (
                  <div
                    key={kpi.id}
                    className={`bg-[#111827] rounded-xl border ${color.border} p-4 flex flex-col justify-between`}
                    data-testid={`card-kpi-${kpi.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 leading-tight">
                        {kpi.labelEn || kpi.name}
                      </span>
                      <div className={`w-7 h-7 rounded-lg ${color.bg} flex items-center justify-center shrink-0`}>
                        <IconComp className={`w-3.5 h-3.5 ${color.icon}`} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-bold text-white leading-none" data-testid={`text-daily-value-${kpi.id}`}>
                        {dailyVal}
                      </span>
                      {kpi.unit && <span className="text-sm text-gray-500 font-medium">{kpi.unit}</span>}
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium ${color.accent}`}>
                        {t.tvDashboard.monthly}: {monthlyVal}
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Fill empty slots in last page so grid stays consistent */}
              {Array.from({ length: KPI_PAGE_SIZE - currentPageKpis.length }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-xl border border-transparent" />
              ))}
            </div>

            {/* KPI page dots */}
            {kpiPages > 1 && (
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
        )}

        {/* Video Section */}
        {hasVideo && (
          <div
            className="bg-black rounded-xl overflow-hidden flex flex-col min-h-0"
            style={{ flex: hasKpis ? "1 1 58%" : "1 1 auto" }}
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

              {/* Video title + controls overlay */}
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
        )}

        {/* Empty state */}
        {!hasKpis && !hasVideo && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <BarChart3 className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">{t.tvDashboard.noData}</p>
            <p className="text-sm mt-1">{t.tvDashboard.noDataMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
}
