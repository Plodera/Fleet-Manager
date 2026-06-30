import { useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Wrench, Clock, CalendarDays, MapPin, Building2, Tag, Cpu, ExternalLink, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
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

type ReportFormState = {
  recordType: "maintenance" | "breakdown" | "scheduled";
  description: string;
  performedBy: string;
};

export default function MachineStatus() {
  const [, params] = useRoute("/machine/:slug");
  const slug = params?.slug ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<ReportFormState>({
    recordType: "maintenance",
    description: "",
    performedBy: "",
  });
  const [formError, setFormError] = useState<string | null>(null);

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

  const reportMutation = useMutation({
    mutationFn: async (payload: ReportFormState) => {
      const res = await fetch(`/api/machine-status/${slug}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordType: payload.recordType,
          description: payload.description,
          performedBy: payload.performedBy.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to submit report");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machine-status", slug] });
      setSubmitted(true);
      setShowForm(false);
      setForm({ recordType: "maintenance", description: "", performedBy: "" });
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.description.trim()) {
      setFormError("Please enter a description.");
      return;
    }
    reportMutation.mutate(form);
  }

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

        {/* Report Issue Section */}
        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3" data-testid="report-success">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-green-800">Report submitted!</p>
              <p className="text-xs text-green-700 mt-0.5">Your record has been logged and will appear in the machine history.</p>
              <button
                className="mt-2 text-xs text-green-700 underline"
                onClick={() => setSubmitted(false)}
                data-testid="button-report-another"
              >
                Submit another report
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setShowForm(v => !v)}
              data-testid="button-toggle-report-form"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <ClipboardList className="w-4 h-4 text-orange-500" />
                Log Maintenance / Report Issue
              </span>
              {showForm ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {showForm && (
              <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t" data-testid="form-report-issue">
                <div className="pt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Record Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["maintenance", "breakdown", "scheduled"] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, recordType: type }))}
                        data-testid={`button-record-type-${type}`}
                        className={`py-2 rounded-lg text-xs font-medium border transition-colors ${
                          form.recordType === type
                            ? type === "maintenance" ? "bg-green-100 border-green-300 text-green-700"
                              : type === "breakdown" ? "bg-red-100 border-red-300 text-red-700"
                              : "bg-blue-100 border-blue-300 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                        }`}
                      >
                        {RECORD_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="report-description" className="block text-xs font-medium text-slate-600 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="report-description"
                    rows={3}
                    placeholder="Describe what was done or the issue observed…"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    data-testid="input-report-description"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  />
                </div>

                <div>
                  <label htmlFor="report-performed-by" className="block text-xs font-medium text-slate-600 mb-1">
                    Performed by <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="report-performed-by"
                    type="text"
                    placeholder="Your name or team"
                    value={form.performedBy}
                    onChange={e => setForm(f => ({ ...f, performedBy: e.target.value }))}
                    data-testid="input-report-performed-by"
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-600" data-testid="text-form-error">{formError}</p>
                )}

                <button
                  type="submit"
                  disabled={reportMutation.isPending}
                  data-testid="button-submit-report"
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {reportMutation.isPending ? "Submitting…" : "Submit Report"}
                </button>
              </form>
            )}
          </div>
        )}

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
