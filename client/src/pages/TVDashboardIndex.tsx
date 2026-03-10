import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { Monitor, ArrowRight, Layout } from "lucide-react";

export default function TVDashboardIndex() {
  const { t } = useLanguage();
  const { data: dashboards = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tv-dashboards"],
  });

  const activeDashboards = dashboards.filter((d: any) => d.isActive);

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col items-center justify-center p-8">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
          <Layout className="w-8 h-8 text-blue-400" />
        </div>
        <h1 className="text-3xl font-bold text-gray-100 mb-2" data-testid="text-page-title">{t.tvDashboard.allDashboards}</h1>
        <p className="text-gray-500">{t.tvDashboard.selectDashboard}</p>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-lg animate-pulse">{t.tvDashboard.refreshing}</div>
      ) : activeDashboards.length === 0 ? (
        <div className="text-gray-500 text-lg" data-testid="text-no-dashboards">{t.tvDashboard.noDashboardsAvailable}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl w-full">
          {activeDashboards.map((dash: any) => (
            <Link key={dash.id} href={`/tv-dashboard/${dash.id}`}>
              <div
                className="bg-[#111827] rounded-xl border border-gray-800 p-6 hover:border-blue-500/40 hover:bg-[#1a2235] transition-all cursor-pointer group"
                data-testid={`card-dashboard-${dash.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-100 mb-1 group-hover:text-blue-400 transition-colors">{dash.name}</h2>
                    <p className="text-sm text-gray-500">{dash.labelEn || dash.labelPt || ""}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center group-hover:bg-blue-500/15 group-hover:border-blue-500/20 transition-colors">
                    <ArrowRight className="w-5 h-5 text-gray-500 group-hover:text-blue-400 transition-colors" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
