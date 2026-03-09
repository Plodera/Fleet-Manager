import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { Link } from "wouter";
import { Monitor, ArrowRight } from "lucide-react";

export default function TVDashboardIndex() {
  const { t } = useLanguage();
  const { data: dashboards = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tv-dashboards"],
  });

  const activeDashboards = dashboards.filter((d: any) => d.isActive);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <Monitor className="w-16 h-16 mx-auto mb-4 text-blue-400" />
        <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">{t.tvDashboard.allDashboards}</h1>
        <p className="text-gray-400 text-lg">{t.tvDashboard.selectDashboard}</p>
      </div>

      {isLoading ? (
        <div className="text-gray-400 text-xl">{t.tvDashboard.refreshing}</div>
      ) : activeDashboards.length === 0 ? (
        <div className="text-gray-500 text-xl" data-testid="text-no-dashboards">{t.tvDashboard.noDashboardsAvailable}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl w-full">
          {activeDashboards.map((dash: any) => (
            <Link key={dash.id} href={`/tv-dashboard/${dash.id}`}>
              <div
                className="bg-gray-900 border border-gray-800 rounded-xl p-8 hover:border-blue-500 hover:bg-gray-800 transition-all cursor-pointer group"
                data-testid={`card-dashboard-${dash.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">{dash.name}</h2>
                    <p className="text-gray-400">{dash.labelEn || dash.labelPt || ""}</p>
                  </div>
                  <ArrowRight className="w-6 h-6 text-gray-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
