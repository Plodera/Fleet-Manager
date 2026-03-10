import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import {
  Monitor, ArrowLeft, Maximize, Minimize, Play, SkipForward, SkipBack,
  TrendingUp, Target, Clock as ClockIcon, Zap, BarChart3, Activity,
  Gauge, Flame, Droplets, Box, Layers, Settings2
} from "lucide-react";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

const KPI_ICONS = [TrendingUp, Target, Zap, Activity, Gauge, Flame, Droplets, Box, Layers, Settings2, BarChart3];
const KPI_COLORS = [
  { bg: "bg-cyan-50", icon: "text-cyan-500", border: "border-cyan-100", accent: "text-cyan-600" },
  { bg: "bg-emerald-50", icon: "text-emerald-500", border: "border-emerald-100", accent: "text-emerald-600" },
  { bg: "bg-amber-50", icon: "text-amber-500", border: "border-amber-100", accent: "text-amber-600" },
  { bg: "bg-orange-50", icon: "text-orange-500", border: "border-orange-100", accent: "text-orange-600" },
  { bg: "bg-purple-50", icon: "text-purple-500", border: "border-purple-100", accent: "text-purple-600" },
  { bg: "bg-blue-50", icon: "text-blue-500", border: "border-blue-100", accent: "text-blue-600" },
  { bg: "bg-rose-50", icon: "text-rose-500", border: "border-rose-100", accent: "text-rose-600" },
  { bg: "bg-teal-50", icon: "text-teal-500", border: "border-teal-100", accent: "text-teal-600" },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-right" data-testid="text-clock">
      <div className="text-2xl font-mono font-bold tracking-wider text-gray-800">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
    if (videos.length <= 1) return;
    videoTimerRef.current = setInterval(() => {
      setVideoFading(true);
      setTimeout(() => {
        setCurrentVideoIndex(prev => (prev + 1) % videos.length);
        setVideoFading(false);
      }, 600);
    }, 45000);
    return () => {
      if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    };
  }, [videos.length]);

  const switchVideo = useCallback((newIndex: number) => {
    if (newIndex === currentVideoIndex) return;
    if (videoTimerRef.current) clearInterval(videoTimerRef.current);
    setVideoFading(true);
    setTimeout(() => {
      setCurrentVideoIndex(newIndex);
      setVideoFading(false);
    }, 400);
  }, [currentVideoIndex]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
        <div className="text-xl text-gray-400 animate-pulse">{t.tvDashboard.refreshing}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col items-center justify-center gap-4">
        <Monitor className="w-16 h-16 text-gray-300" />
        <div className="text-xl text-gray-500">{t.tvDashboard.noData}</div>
        <Link href="/tv-dashboard">
          <span className="text-blue-500 hover:text-blue-600 cursor-pointer flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            {t.tvDashboard.allDashboards}
          </span>
        </Link>
      </div>
    );
  }

  const kpis = data.kpis || [];
  const kpiValues = data.kpiValues || [];

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

  const currentVideo = videos[currentVideoIndex];

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col" data-testid="tv-dashboard-container">
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/tv-dashboard">
            <span className="text-gray-400 hover:text-gray-700 cursor-pointer transition-colors" data-testid="link-back-dashboards">
              <ArrowLeft className="w-5 h-5" />
            </span>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900" data-testid="text-dashboard-name">{data.name}</h1>
            {data.department && (
              <span className="text-xs text-gray-500">{data.department.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button onClick={toggleFullScreen} className="text-gray-400 hover:text-gray-700 transition-colors" data-testid="button-fullscreen">
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
          <LiveClock />
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {kpis.length === 0 && videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400">
            <BarChart3 className="w-16 h-16 mb-4" />
            <p className="text-lg font-medium">{t.tvDashboard.noData}</p>
            <p className="text-sm mt-1">{t.tvDashboard.noDataMessage}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {kpis.length > 0 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length, 6)}, minmax(0, 1fr))` }} data-testid="section-kpis">
                {kpis.map((kpi: any, idx: number) => {
                  const color = KPI_COLORS[idx % KPI_COLORS.length];
                  const IconComp = KPI_ICONS[idx % KPI_ICONS.length];
                  const dailyVal = getDailyValue(kpi.id);
                  const monthlyVal = getMonthlyValue(kpi.id);

                  return (
                    <div
                      key={kpi.id}
                      className={`bg-white rounded-xl border ${color.border} p-5 shadow-sm hover:shadow-md transition-shadow`}
                      data-testid={`card-kpi-${kpi.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {kpi.labelEn || kpi.name}
                        </span>
                        <div className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center`}>
                          <IconComp className={`w-4 h-4 ${color.icon}`} />
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-gray-900" data-testid={`text-daily-value-${kpi.id}`}>
                          {dailyVal}
                        </span>
                        {kpi.unit && (
                          <span className="text-sm text-gray-400 font-medium">{kpi.unit}</span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${color.accent}`}>
                          {t.tvDashboard.monthly}: {monthlyVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {kpis.length > 6 && (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(kpis.length - 6, 6)}, minmax(0, 1fr))` }}>
                {kpis.slice(6).map((kpi: any, idx: number) => {
                  const color = KPI_COLORS[(idx + 6) % KPI_COLORS.length];
                  const IconComp = KPI_ICONS[(idx + 6) % KPI_ICONS.length];
                  const dailyVal = getDailyValue(kpi.id);
                  const monthlyVal = getMonthlyValue(kpi.id);

                  return (
                    <div
                      key={kpi.id}
                      className={`bg-white rounded-xl border ${color.border} p-5 shadow-sm hover:shadow-md transition-shadow`}
                      data-testid={`card-kpi-${kpi.id}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {kpi.labelEn || kpi.name}
                        </span>
                        <div className={`w-8 h-8 rounded-lg ${color.bg} flex items-center justify-center`}>
                          <IconComp className={`w-4 h-4 ${color.icon}`} />
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold text-gray-900" data-testid={`text-daily-value-${kpi.id}`}>
                          {dailyVal}
                        </span>
                        {kpi.unit && <span className="text-sm text-gray-400 font-medium">{kpi.unit}</span>}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-xs font-medium ${color.accent}`}>
                          {t.tvDashboard.monthly}: {monthlyVal}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {videos.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" data-testid="section-videos">
                <div className="relative">
                  <div
                    className="transition-opacity duration-500 ease-in-out"
                    style={{ opacity: videoFading ? 0 : 1 }}
                  >
                    {currentVideo && currentVideo.videoType === "youtube" && extractYouTubeId(currentVideo.url) ? (
                      <div className="aspect-video">
                        <iframe
                          key={currentVideo.id}
                          src={`https://www.youtube.com/embed/${extractYouTubeId(currentVideo.url)}?autoplay=1&mute=1&loop=1&playlist=${extractYouTubeId(currentVideo.url)}`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                          data-testid="video-player-youtube"
                        />
                      </div>
                    ) : currentVideo ? (
                      <div className="aspect-video">
                        <video
                          key={currentVideo.id}
                          src={currentVideo.url}
                          className="w-full h-full object-cover"
                          autoPlay
                          muted
                          loop
                          data-testid="video-player-upload"
                        />
                      </div>
                    ) : null}
                  </div>

                  {currentVideo && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-6 py-4">
                      <p className="text-white font-medium text-sm">{currentVideo.title}</p>
                    </div>
                  )}
                </div>

                {videos.length > 1 && (
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {videos.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => switchVideo(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentVideoIndex ? "bg-blue-500 scale-110" : "bg-gray-300 hover:bg-gray-400"}`}
                          data-testid={`button-video-dot-${idx}`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => switchVideo((currentVideoIndex - 1 + videos.length) % videos.length)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                        data-testid="button-prev-video"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-500 font-medium">
                        {currentVideoIndex + 1} / {videos.length}
                      </span>
                      <button
                        onClick={() => switchVideo((currentVideoIndex + 1) % videos.length)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors"
                        data-testid="button-next-video"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
