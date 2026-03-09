import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useLanguage } from "@/lib/i18n";
import { Monitor, ArrowLeft, Maximize, Minimize, Play, SkipForward, SkipBack, List, BarChart3, Video } from "lucide-react";

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-right" data-testid="text-clock">
      <div className="text-3xl font-mono font-bold tracking-wider">
        {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-sm text-gray-400 mt-1">
        {time.toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

type ViewMode = "kpis" | "videos";

export default function TVDashboard() {
  const [, params] = useRoute("/tv-dashboard/:id");
  const id = params?.id;
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>("kpis");
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-2xl text-gray-400 animate-pulse">{t.tvDashboard.refreshing}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <Monitor className="w-16 h-16 text-gray-600" />
        <div className="text-2xl text-gray-400">{t.tvDashboard.noData}</div>
        <Link href="/tv-dashboard">
          <span className="text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            {t.tvDashboard.allDashboards}
          </span>
        </Link>
      </div>
    );
  }

  const kpis = data.kpis || [];
  const kpiValues = data.kpiValues || [];
  const videos = (data.videos || []).filter((v: any) => v.isActive);

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
    <div ref={containerRef} className="min-h-screen bg-gray-950 text-white flex flex-col" data-testid="tv-dashboard-container">
      <header className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link href="/tv-dashboard">
            <span className="text-gray-400 hover:text-white cursor-pointer" data-testid="link-back-dashboards">
              <ArrowLeft className="w-6 h-6" />
            </span>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-dashboard-name">{data.name}</h1>
            {data.department && (
              <span className="text-sm text-gray-400">{data.department.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex bg-gray-800 rounded-lg overflow-hidden" data-testid="toggle-view-mode">
            <button
              onClick={() => setViewMode("kpis")}
              className={`px-4 py-2 flex items-center gap-2 transition-colors ${viewMode === "kpis" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              data-testid="button-view-kpis"
            >
              <BarChart3 className="w-4 h-4" />
              {t.tvDashboard.kpiHeaders}
            </button>
            {videos.length > 0 && (
              <button
                onClick={() => setViewMode("videos")}
                className={`px-4 py-2 flex items-center gap-2 transition-colors ${viewMode === "videos" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
                data-testid="button-view-videos"
              >
                <Video className="w-4 h-4" />
                {t.tvDashboard.videoPlayer}
              </button>
            )}
          </div>

          <button onClick={toggleFullScreen} className="text-gray-400 hover:text-white" data-testid="button-fullscreen">
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <Clock />
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {viewMode === "kpis" && (
          <div className="max-w-full overflow-x-auto" data-testid="section-kpis">
            {kpis.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-96 text-gray-500">
                <BarChart3 className="w-16 h-16 mb-4" />
                <p className="text-xl">{t.tvDashboard.noData}</p>
                <p className="text-sm mt-2">{t.tvDashboard.noDataMessage}</p>
              </div>
            ) : (
              <table className="w-full border-collapse" data-testid="table-kpi-data">
                <thead>
                  <tr>
                    <th className="border border-gray-700 bg-gray-800 px-6 py-4 text-left text-base font-semibold text-gray-300 w-40">
                      {t.tvDashboard.periodType}
                    </th>
                    {kpis.map((kpi: any) => (
                      <th key={kpi.id} className="border border-gray-700 bg-gray-800 px-6 py-4 text-center text-base font-semibold text-gray-200 min-w-[140px]">
                        <div>{kpi.labelEn || kpi.name}</div>
                        {kpi.unit && <div className="text-xs text-gray-400 mt-1">({kpi.unit})</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-emerald-900/30">
                    <td className="border border-gray-700 px-6 py-5 font-semibold text-emerald-400 text-lg">
                      {t.tvDashboard.daily}
                    </td>
                    {kpis.map((kpi: any) => (
                      <td key={kpi.id} className="border border-gray-700 px-6 py-5 text-center text-2xl font-bold text-white" data-testid={`text-daily-value-${kpi.id}`}>
                        {getDailyValue(kpi.id)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-blue-900/20">
                    <td className="border border-gray-700 px-6 py-5 font-semibold text-blue-400 text-lg">
                      {t.tvDashboard.monthly}
                    </td>
                    {kpis.map((kpi: any) => (
                      <td key={kpi.id} className="border border-gray-700 px-6 py-5 text-center text-2xl font-bold text-white" data-testid={`text-monthly-value-${kpi.id}`}>
                        {getMonthlyValue(kpi.id)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}

        {viewMode === "videos" && (
          <div className="flex gap-6 h-full" data-testid="section-videos">
            <div className="flex-1">
              {currentVideo ? (
                <div className="aspect-video bg-black rounded-xl overflow-hidden">
                  {currentVideo.videoType === "youtube" && extractYouTubeId(currentVideo.url) ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${extractYouTubeId(currentVideo.url)}?autoplay=1&loop=1&playlist=${extractYouTubeId(currentVideo.url)}`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      data-testid="video-player-youtube"
                    />
                  ) : (
                    <video
                      src={currentVideo.url}
                      className="w-full h-full"
                      autoPlay
                      loop
                      controls
                      data-testid="video-player-upload"
                    />
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center text-gray-500">
                  <Video className="w-16 h-16" />
                </div>
              )}

              {videos.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={() => setCurrentVideoIndex(i => (i - 1 + videos.length) % videos.length)}
                    className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
                    data-testid="button-prev-video"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>
                  <span className="text-gray-400 text-sm">
                    {currentVideoIndex + 1} / {videos.length}
                  </span>
                  <button
                    onClick={() => setCurrentVideoIndex(i => (i + 1) % videos.length)}
                    className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-white"
                    data-testid="button-next-video"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {videos.length > 1 && (
              <div className="w-72 bg-gray-900 rounded-xl p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <List className="w-4 h-4" />
                  {t.tvDashboard.videoPlaylist}
                </h3>
                <div className="space-y-2">
                  {videos.map((video: any, idx: number) => (
                    <button
                      key={video.id}
                      onClick={() => setCurrentVideoIndex(idx)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${idx === currentVideoIndex ? "bg-blue-600/30 border border-blue-500" : "bg-gray-800 hover:bg-gray-700 border border-transparent"}`}
                      data-testid={`button-video-${video.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {idx === currentVideoIndex && <Play className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                        <span className="text-sm truncate">{video.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
