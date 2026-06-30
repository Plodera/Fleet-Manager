import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Wrench, Clock, CalendarDays, MapPin, Building2, Tag, Cpu, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

type MachineType = { id: number; name: string };
type Machine = { id: number; name: string; manufacturer: string | null; model: string | null; serialNumber: string | null; location: string | null; department: string | null; description: string | null; isActive: boolean; qrSlug: string; machineType?: MachineType };
type MachineRecord = { id: number; machineId: number; recordType: string; date: string; description: string; performedBy: string | null; nextMaintenanceDate: string | null };
type MachineStatusData = {
  machine: Machine;
  lastMaintenance: MachineRecord | null;
  recentBreakdown: MachineRecord | null;
  nextScheduled: MachineRecord | null;
  status: "operational" | "breakdown";
  history: MachineRecord[];
};

const RECORD_ICONS: Record<string, any> = {
  maintenance: Wrench,
  breakdown: AlertTriangle,
  scheduled: Clock,
};

const RECORD_LABELS: Record<string, string> = {
  maintenance: "Maintenance",
  breakdown: "Breakdown",
  scheduled: "Scheduled",
};

const RECORD_COLORS: Record<string, string> = {
  maintenance: "text-green-600",
  breakdown: "text-red-500",
  scheduled: "text-blue-500",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function MachineStatus() {
  const [, params] = useRoute("/machine/:slug");
  const slug = params?.slug ?? "";
  const { user } = useAuth();

  const { data, isLoading, isError } = useQuery<MachineStatusData>({
    queryKey: ["/api/machine-status", slug],
    queryFn: async () => {
      const res = await fetch(`/api/machine-status/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Cpu className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h1 className="text-lg font-semibold text-slate-600">Machine not found</h1>
          <p className="text-sm text-slate-400 mt-1">This QR code does not match any registered machine.</p>
        </div>
      </div>
    );
  }

  const { machine, lastMaintenance, recentBreakdown, nextScheduled, status, history } = data;
  const isOperational = status === "operational";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight" data-testid="text-machine-name">
                {machine.name}
              </h1>
              {(machine.machineType || machine.manufacturer || machine.model) && (
                <p className="text-sm text-slate-500 mt-1" data-testid="text-machine-subtitle">
                  {[machine.machineType?.name, machine.manufacturer, machine.model].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <div className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${isOperational ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`} data-testid="badge-machine-status">
              {isOperational
                ? <><CheckCircle2 className="w-4 h-4" /> Operational</>
                : <><AlertTriangle className="w-4 h-4" /> Breakdown</>
              }
            </div>
          </div>

          {/* Info chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {machine.location && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full" data-testid="text-location">
                <MapPin className="w-3 h-3" />
                {machine.location}
              </span>
            )}
            {machine.department && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full" data-testid="text-department">
                <Building2 className="w-3 h-3" />
                {machine.department}
              </span>
            )}
            {machine.serialNumber && (
              <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full" data-testid="text-serial">
                <Tag className="w-3 h-3" />
                S/N: {machine.serialNumber}
              </span>
            )}
          </div>

          {machine.description && (
            <p className="mt-3 text-sm text-slate-500">{machine.description}</p>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 gap-3">

          {/* Last Maintenance */}
          <div className="bg-white rounded-xl shadow-sm border p-4" data-testid="card-last-maintenance">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-green-600" />
              <span className="text-sm font-semibold text-slate-700">Last Maintenance</span>
            </div>
            {lastMaintenance ? (
              <>
                <p className="text-sm text-slate-600" data-testid="text-last-maintenance-desc">{lastMaintenance.description}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span data-testid="text-last-maintenance-date">{formatDate(lastMaintenance.date)}</span>
                  {lastMaintenance.performedBy && (
                    <span data-testid="text-last-maintenance-by">by {lastMaintenance.performedBy}</span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">No maintenance records yet.</p>
            )}
          </div>

          {/* Recent Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border p-4" data-testid="card-recent-breakdown">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-slate-700">Recent Breakdown</span>
              <span className="text-xs text-slate-400">(last 90 days)</span>
            </div>
            {recentBreakdown ? (
              <>
                <p className="text-sm text-slate-600" data-testid="text-breakdown-desc">{recentBreakdown.description}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                  <span data-testid="text-breakdown-date">{formatDate(recentBreakdown.date)}</span>
                  {recentBreakdown.performedBy && <span>by {recentBreakdown.performedBy}</span>}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">None reported in last 90 days.</p>
            )}
          </div>

          {/* Next Scheduled */}
          <div className="bg-white rounded-xl shadow-sm border p-4" data-testid="card-next-scheduled">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-semibold text-slate-700">Next Scheduled Maintenance</span>
            </div>
            {nextScheduled?.nextMaintenanceDate ? (
              <>
                <p className="text-lg font-semibold text-blue-600" data-testid="text-next-date">
                  {formatDate(nextScheduled.nextMaintenanceDate)}
                </p>
                {nextScheduled.description && (
                  <p className="text-xs text-slate-400 mt-1">{nextScheduled.description}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Not scheduled.</p>
            )}
          </div>

        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-4" data-testid="card-history">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent History</h3>
            <div className="space-y-3">
              {history.map(r => {
                const Icon = RECORD_ICONS[r.recordType] ?? Wrench;
                return (
                  <div key={r.id} className="flex items-start gap-3" data-testid={`history-item-${r.id}`}>
                    <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${RECORD_COLORS[r.recordType] ?? "text-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">{r.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>{formatDate(r.date)}</span>
                        <span className="capitalize">{RECORD_LABELS[r.recordType] ?? r.recordType}</span>
                        {r.performedBy && <span>· {r.performedBy}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pb-4 space-y-2">
          {user && (
            <Link href="/factory-machines" data-testid="link-manage-machines">
              <a className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium">
                <ExternalLink className="w-3 h-3" />
                Manage in AAMS →
              </a>
            </Link>
          )}
          <p className="text-xs text-slate-400">AAMS · Factory Machine Maintenance</p>
        </div>

      </div>
    </div>
  );
}
