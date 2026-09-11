import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Check, ChevronDown, Download, Eye, FileSpreadsheet, Pencil, Plus, Search, ShieldCheck, Trash2, Upload, UserCheck, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseVehicleComplianceRows, VEHICLE_COMPLIANCE_HEADERS, type ParsedComplianceRow } from "@/lib/vehicleComplianceImport";

type Resource = {
  id: number;
  licenseExpiryDate: string | null;
  make?: string;
  model?: string;
  licensePlate?: string;
  fullName?: string;
  licenseNumber?: string;
  color?: string | null;
  vehicleTypeLabel?: string | null;
  ownershipDocumentType?: string | null;
  ownershipExpiryDate?: string | null;
  insuranceNumber?: string | null;
  insurancePolicyNumber?: string | null;
  insuranceExpiryDate?: string | null;
  insuranceImportedStatus?: string | null;
  ivmNumber?: string | null;
  ivmPaymentTerms?: string | null;
  ivmExpiryDate?: string | null;
  ivmImportedStatus?: string | null;
};
type ComplianceDocumentType = "ownership" | "insurance" | "ivm";
type VehicleComplianceDocument = { id: number; vehicleId: number; documentType: ComplianceDocumentType; originalFilename: string; mimeType: string; sizeBytes: number; uploadedAt: string };
type CompanyDocument = { id: number; name: string; documentType: string | null; expiryDate: string; notes: string | null; isActive: boolean; accessUserIds?: number[] };
type Recipient = { id?: number; userId: number | null; email: string | null };
type Rule = { id: number; entityType: string; triggerType: string; thresholdDays: number | null; sendEmail: boolean; sendInApp: boolean; isActive: boolean; recipients: Recipient[] };
type Alert = { id: number; entityType: string; entityName: string; expiryDate: string; status: string; createdAt: string };
type AppUser = { id: number; fullName: string; email: string | null };

const blankDocument = { name: "", documentType: "", expiryDate: "", notes: "", isActive: true, accessUserIds: [] as number[] };
const blankRule = { entityType: "vehicle_ownership", triggerType: "expiry_approaching", thresholdDays: "90", sendEmail: true, sendInApp: true, userIds: [] as number[], extraEmails: "", isActive: true };
const blankCompliance = {
  color: "", vehicleTypeLabel: "", licenseExpiryDate: "", ownershipDocumentType: "", ownershipExpiryDate: "",
  insuranceNumber: "", insurancePolicyNumber: "", insuranceExpiryDate: "", insuranceImportedStatus: "",
  ivmNumber: "", ivmPaymentTerms: "", ivmExpiryDate: "", ivmImportedStatus: "",
};
type ComplianceState = "expired" | "expiring" | "valid" | "missing";
type ImportPreview = {
  summary: { total: number; create: number; update: number; error: number };
  rows: Array<ParsedComplianceRow & { action: "create" | "update" | "error"; vehicleId?: number; messages: string[] }>;
};

function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${date}T00:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

function ExpiryStatus({ date, labels, warningDays = 30 }: { date: string; labels: any; warningDays?: number }) {
  const days = daysUntil(date);
  const classes = days < 0
    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    : days <= warningDays
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  const text = days < 0 ? `${labels.expired} · ${Math.abs(days)} ${labels.daysOverdue}` : days === 0 ? labels.expiresToday : days <= warningDays ? `${labels.expiringSoon} · ${days} ${labels.daysRemaining}` : `${labels.valid} · ${days} ${labels.daysRemaining}`;
  return <Badge className={classes}>{text}</Badge>;
}

function complianceState(date?: string | null): ComplianceState {
  if (!date) return "missing";
  const days = daysUntil(date);
  if (days < 0) return "expired";
  if (days <= 90) return "expiring";
  return "valid";
}

function ComplianceBadge({ date, labels }: { date?: string | null; labels: any }) {
  if (!date) return <Badge variant="outline">{labels.missing}</Badge>;
  return <ExpiryStatus date={date} labels={labels} warningDays={90} />;
}

export default function LicenseExpiry() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const le = t.licenseExpiry;
  const isAdmin = user?.role === "admin";
  const permissions = useMemo<string[]>(() => {
    if (!user?.permissions) return [];
    if (Array.isArray(user.permissions)) return user.permissions;
    try { return JSON.parse(user.permissions); } catch { return []; }
  }, [user]);
  const canLicenses = isAdmin || permissions.includes("view_license_expiry");
  const canDocuments = isAdmin || permissions.includes("view_company_documents");
  const [documentDialog, setDocumentDialog] = useState(false);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<CompanyDocument | null>(null);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [documentForm, setDocumentForm] = useState(blankDocument);
  const [ruleForm, setRuleForm] = useState(blankRule);
  const [complianceSearch, setComplianceSearch] = useState("");
  const [complianceFilter, setComplianceFilter] = useState<"all" | ComplianceState>("all");
  const [editingCompliance, setEditingCompliance] = useState<Resource | null>(null);
  const [documentVehicle, setDocumentVehicle] = useState<Resource | null>(null);
  const [selectedComplianceId, setSelectedComplianceId] = useState<number | null>(null);
  const [complianceForm, setComplianceForm] = useState(blankCompliance);
  const [importDialog, setImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ParsedComplianceRow[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [createUnmatched, setCreateUnmatched] = useState(true);
  const [replaceBlanks, setReplaceBlanks] = useState(false);
  const [importFilename, setImportFilename] = useState("");
  const [selectedImport, setSelectedImport] = useState<number | null>(null);
  const [selectedUndoFields, setSelectedUndoFields] = useState<Record<number, string[]>>({});
  const { data: importHistory = [] } = useQuery<any[]>({ queryKey: ["/api/vehicle-compliance/import-history"], enabled: isAdmin });
  const { data: importDetail } = useQuery<any>({ queryKey: ["/api/vehicle-compliance/import-history", selectedImport], enabled: isAdmin && selectedImport !== null });
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: overview } = useQuery<{ vehicles: Resource[]; drivers: Resource[] }>({ queryKey: ["/api/license-expiry/overview"], enabled: canLicenses });
  const { data: vehicleDocuments = [] } = useQuery<VehicleComplianceDocument[]>({
    queryKey: ["/api/vehicles", documentVehicle?.id, "compliance-documents"],
    enabled: Boolean(documentVehicle),
  });
  const { data: documents = [] } = useQuery<CompanyDocument[]>({ queryKey: ["/api/company-documents"], enabled: canDocuments });
  const { data: rules = [] } = useQuery<Rule[]>({ queryKey: ["/api/expiry-notification-rules"], enabled: isAdmin });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/users"], enabled: isAdmin });
  const { data: alerts = [] } = useQuery<Alert[]>({ queryKey: ["/api/expiry-notifications/mine"] });

  const refresh = () => {
    ["/api/company-documents", "/api/expiry-notification-rules", "/api/license-expiry/overview", "/api/expiry-notifications/mine", "/api/vehicle-compliance/import-history"].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
  };
  const documentMutation = useMutation({
    mutationFn: async () => {
      const data = { name: documentForm.name, documentType: documentForm.documentType || null, expiryDate: documentForm.expiryDate, notes: documentForm.notes || null, isActive: documentForm.isActive };
      const response = await apiRequest(editingDocument ? "PUT" : "POST", editingDocument ? `/api/company-documents/${editingDocument.id}` : "/api/company-documents", data);
      const document = await response.json();
      await apiRequest("PUT", `/api/company-documents/${document.id}/access`, { userIds: documentForm.accessUserIds });
      return document;
    },
    onSuccess: () => { refresh(); setDocumentDialog(false); toast({ title: le.documentSaved }); },
    onError: (error: Error) => toast({ title: le.saveFailed, description: error.message, variant: "destructive" }),
  });
  const ruleMutation = useMutation({
    mutationFn: async () => {
      const recipients = [
        ...ruleForm.userIds.map(userId => ({ userId })),
        ...ruleForm.extraEmails.split(",").map(email => email.trim()).filter(Boolean).map(email => ({ email })),
      ];
      return apiRequest(editingRule ? "PUT" : "POST", editingRule ? `/api/expiry-notification-rules/${editingRule.id}` : "/api/expiry-notification-rules", {
        entityType: ruleForm.entityType, triggerType: ruleForm.triggerType,
        thresholdDays: ruleForm.triggerType === "expired" ? null : Number(ruleForm.thresholdDays),
        sendEmail: ruleForm.sendEmail, sendInApp: ruleForm.sendInApp, isActive: ruleForm.isActive, recipients,
      });
    },
    onSuccess: () => { refresh(); setRuleDialog(false); toast({ title: le.ruleSaved }); },
    onError: (error: Error) => toast({ title: le.saveFailed, description: error.message, variant: "destructive" }),
  });
  const deleteDocument = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/company-documents/${id}`), onSuccess: refresh });
  const deleteRule = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/expiry-notification-rules/${id}`), onSuccess: refresh });
  const runCheck = useMutation({
    mutationFn: () => apiRequest("POST", "/api/license-expiry/run-check"),
    onSuccess: async response => { const result = await response.json(); refresh(); toast({ title: le.checkComplete, description: le.matches.replace("{count}", result.matchCount) }); },
  });
  const updateAlert = useMutation({ mutationFn: ({ id, action }: { id: number; action: "acknowledge" | "resolve" }) => apiRequest("POST", `/api/expiry-notifications/${id}/${action}`), onSuccess: refresh });
  const complianceMutation = useMutation({
    mutationFn: async () => {
      if (!editingCompliance) return;
      const payload = Object.fromEntries(Object.entries(complianceForm).map(([key, value]) => [key, value || null]));
      return apiRequest("PUT", `/api/vehicles/${editingCompliance.id}`, payload);
    },
    onSuccess: () => { refresh(); queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); setEditingCompliance(null); toast({ title: le.complianceSaved }); },
    onError: (error: Error) => toast({ title: le.saveFailed, description: error.message, variant: "destructive" }),
  });
  const uploadVehicleDocument = useMutation({
    mutationFn: async ({ type, file }: { type: ComplianceDocumentType; file: File }) => {
      if (!documentVehicle) return;
      const body = new FormData();
      body.append("file", file);
      const response = await fetch(`/api/vehicles/${documentVehicle.id}/compliance-documents/${type}`, { method: "PUT", body, credentials: "include" });
      if (!response.ok) throw new Error((await response.text()) || le.documentUploadFailed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", documentVehicle?.id, "compliance-documents"] });
      toast({ title: le.documentUploaded });
    },
    onError: (error: Error) => toast({ title: le.documentUploadFailed, description: error.message, variant: "destructive" }),
  });
  const removeVehicleDocument = useMutation({
    mutationFn: async (type: ComplianceDocumentType) => {
      if (!documentVehicle) return;
      return apiRequest("DELETE", `/api/vehicles/${documentVehicle.id}/compliance-documents/${type}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", documentVehicle?.id, "compliance-documents"] });
      toast({ title: le.documentRemoved });
    },
  });
  const importMutation = useMutation({
    mutationFn: async (mode: "preview" | "apply") => {
      const response = await apiRequest("POST", "/api/vehicle-compliance/import", { mode, rows: importRows, createUnmatched, replaceBlanks, sourceFilename: importFilename || "vehicle-compliance-import" });
      return response.json();
    },
    onSuccess: (data, mode) => {
      if (mode === "preview") setImportPreview(data);
      else {
        refresh();
        queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
        setImportPreview(null);
        setImportRows([]);
        setImportDialog(false);
        toast({ title: le.importComplete, description: le.importCompleteDescription.replace("{count}", String(data.summary.applied)) });
      }
    },
    onError: (error: Error) => toast({ title: le.importFailed, description: error.message, variant: "destructive" }),
  });
  const undoRetryMutation = useMutation({
    mutationFn: async ({ importId, rows }: { importId: number; rows: Array<{ rowId: number; fields: string[] }> }) => {
      const response = await apiRequest("POST", `/api/vehicle-compliance/import-history/${importId}/undo/retry`, { rows });
      return response.json();
    },
    onSuccess: (result, { importId }) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["/api/vehicle-compliance/import-history", importId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setSelectedUndoFields({});
      toast({
        title: le.undoRetryComplete,
        description: le.undoResult.replace("{restored}", String(result.restoredCount)).replace("{deleted}", String(result.deletedCount)).replace("{skipped}", String(result.skippedCount)),
      });
    },
    onError: (error: Error) => toast({ title: le.undoRetryFailed, description: error.message, variant: "destructive" }),
  });

  const openDocument = (document?: CompanyDocument) => {
    setEditingDocument(document || null);
    setDocumentForm(document ? { name: document.name, documentType: document.documentType || "", expiryDate: document.expiryDate, notes: document.notes || "", isActive: document.isActive, accessUserIds: document.accessUserIds || [] } : blankDocument);
    setDocumentDialog(true);
  };
  const openRule = (rule?: Rule) => {
    setEditingRule(rule || null);
    setRuleForm(rule ? {
      entityType: rule.entityType, triggerType: rule.triggerType, thresholdDays: String(rule.thresholdDays ?? 30),
      sendEmail: rule.sendEmail, sendInApp: rule.sendInApp,
      userIds: rule.recipients.filter(recipient => recipient.userId).map(recipient => recipient.userId!),
      extraEmails: rule.recipients.filter(recipient => recipient.email).map(recipient => recipient.email).join(", "),
      isActive: rule.isActive,
    } : blankRule);
    setRuleDialog(true);
  };
  const resourceName = (resource: Resource, type: "vehicle" | "driver") => type === "vehicle" ? `${resource.make} ${resource.model} (${resource.licensePlate})` : `${resource.fullName}${resource.licenseNumber ? ` (${resource.licenseNumber})` : ""}`;
  const complianceVehicles = overview?.vehicles || [];
  const overallState = (vehicle: Resource): ComplianceState => {
    const states = [vehicle.licenseExpiryDate, vehicle.ownershipExpiryDate, vehicle.insuranceExpiryDate, vehicle.ivmExpiryDate].map(complianceState);
    if (states.includes("expired")) return "expired";
    if (states.includes("expiring")) return "expiring";
    if (states.includes("valid")) return "valid";
    return "missing";
  };
  const nearestExpiry = (vehicle: Resource) => {
    const dates = [
      { date: vehicle.licenseExpiryDate, label: le.vehicleLicenseExpiry },
      { date: vehicle.ownershipExpiryDate, label: le.dateLimit },
      { date: vehicle.insuranceExpiryDate, label: le.insuranceExpiry },
      { date: vehicle.ivmExpiryDate, label: le.ivmExpiry },
    ].filter((item): item is { date: string; label: string } => Boolean(item.date));
    return dates.sort((a, b) => new Date(`${a.date}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime())[0] || null;
  };
  const filteredComplianceVehicles = complianceVehicles.filter(vehicle => {
    const query = complianceSearch.trim().toLowerCase();
    const matchesSearch = !query || [vehicle.licensePlate, vehicle.make, vehicle.model, vehicle.insuranceNumber, vehicle.ivmNumber]
      .some(value => value?.toLowerCase().includes(query));
    return matchesSearch && (complianceFilter === "all" || overallState(vehicle) === complianceFilter);
  });
  const complianceCounts = (["expired", "expiring", "valid", "missing"] as ComplianceState[]).reduce<Record<ComplianceState, number>>(
    (counts, state) => ({ ...counts, [state]: complianceVehicles.filter(vehicle => overallState(vehicle) === state).length }),
    { expired: 0, expiring: 0, valid: 0, missing: 0 },
  );
  const openCompliance = (vehicle: Resource) => {
    setEditingCompliance(vehicle);
    setComplianceForm({
      color: vehicle.color || "", vehicleTypeLabel: vehicle.vehicleTypeLabel || "",
      licenseExpiryDate: vehicle.licenseExpiryDate || "",
      ownershipDocumentType: vehicle.ownershipDocumentType || "", ownershipExpiryDate: vehicle.ownershipExpiryDate || "",
      insuranceNumber: vehicle.insuranceNumber || "", insurancePolicyNumber: vehicle.insurancePolicyNumber || "",
      insuranceExpiryDate: vehicle.insuranceExpiryDate || "", insuranceImportedStatus: vehicle.insuranceImportedStatus || "",
      ivmNumber: vehicle.ivmNumber || "", ivmPaymentTerms: vehicle.ivmPaymentTerms || "",
      ivmExpiryDate: vehicle.ivmExpiryDate || "", ivmImportedStatus: vehicle.ivmImportedStatus || "",
    });
  };
  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([Array.from(VEHICLE_COMPLIANCE_HEADERS)]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vehicle Compliance");
    XLSX.writeFile(workbook, "vehicle_compliance_template.xlsx");
  };
  const handleImportFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: true });
    const parsed = parseVehicleComplianceRows(records);
    setImportRows(parsed);
    setImportPreview(null);
    if (parsed.length === 0) toast({ title: le.importFailed, description: le.noImportRows, variant: "destructive" });
  };
  const complianceFieldRows: Array<Array<{ key: keyof typeof blankCompliance; label: string; type?: "date" }>> = [
    [{ key: "color", label: le.color }, { key: "vehicleTypeLabel", label: le.vehicleType }],
    [{ key: "licenseExpiryDate", label: le.vehicleLicenseExpiry, type: "date" }],
    [{ key: "ownershipDocumentType", label: le.ownership }, { key: "ownershipExpiryDate", label: le.dateLimit, type: "date" }],
    [{ key: "insuranceNumber", label: le.insuranceNumber }, { key: "insurancePolicyNumber", label: le.policyNumber }],
    [{ key: "insuranceExpiryDate", label: le.insuranceExpiry, type: "date" }, { key: "insuranceImportedStatus", label: le.importedInsuranceStatus }],
    [{ key: "ivmNumber", label: le.ivmNumber }, { key: "ivmPaymentTerms", label: le.ivmPaymentTerms }],
    [{ key: "ivmExpiryDate", label: le.ivmExpiry, type: "date" }, { key: "ivmImportedStatus", label: le.importedIvmStatus }],
  ];
  const complianceDocumentTypes: Array<{ type: ComplianceDocumentType; label: string }> = [
    { type: "ownership", label: le.ownershipDocument },
    { type: "insurance", label: le.insuranceDocument },
    { type: "ivm", label: le.ivmDocument },
  ];
  const retryableUndoFields = (row: any): string[] => {
    if (Array.isArray(row.undoSkippedFields)) return row.undoSkippedFields.filter((field: unknown): field is string => typeof field === "string");
    if (row.undoStatus === "skipped") return row.changedFields || [];
    const warningFields = typeof row.undoWarning === "string"
      ? row.undoWarning.match(/^Skipped conflicting fields:\s*(.+)$/)?.[1]?.split(",").map((field: string) => field.trim()).filter(Boolean)
      : undefined;
    return warningFields || [];
  };
  const openImportDetails = (importId: number) => {
    setSelectedUndoFields({});
    setSelectedImport(importId);
  };
  const toggleUndoField = (rowId: number, field: string, checked: boolean) => {
    setSelectedUndoFields(current => {
      const selected = current[rowId] || [];
      const next = checked ? Array.from(new Set([...selected, field])) : selected.filter(item => item !== field);
      return { ...current, [rowId]: next };
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <PageHeader title={le.title} description={le.subtitle} icon={<CalendarClock className="w-5 h-5 text-primary" />} actions={isAdmin ? <Button onClick={() => runCheck.mutate()} disabled={runCheck.isPending}><Bell className="w-4 h-4 mr-2" />{runCheck.isPending ? le.runningCheck : le.runCheck}</Button> : undefined} />
      <Tabs defaultValue={canLicenses ? "licenses" : "documents"} className="space-y-5">
        <TabsList className="flex h-auto flex-wrap gap-1">
          {canLicenses && <TabsTrigger value="licenses">{le.licenses}</TabsTrigger>}
          {canDocuments && <TabsTrigger value="documents">{le.companyDocuments}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="rules">{le.rules}</TabsTrigger>}
          <TabsTrigger value="alerts">{le.myAlerts}{alerts.filter(alert => alert.status === "open").length > 0 && <span className="ml-2 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{alerts.filter(alert => alert.status === "open").length}</span>}</TabsTrigger>
        </TabsList>
        {canLicenses && <TabsContent value="licenses" className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {([
              ["expired", complianceCounts.expired, "border-red-200 bg-red-50/70 dark:bg-red-950/20"],
              ["expiring", complianceCounts.expiring, "border-amber-200 bg-amber-50/70 dark:bg-amber-950/20"],
              ["valid", complianceCounts.valid, "border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/20"],
              ["missing", complianceCounts.missing, "border-slate-200 bg-slate-50/70 dark:bg-slate-950/20"],
            ] as const).map(([state, count, className]) => (
              <Card key={state} className={className}>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">{le.complianceStates[state]}</p>
                  <p className="mt-1 text-3xl font-semibold">{count}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{le.vehicleCompliance}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{le.vehicleComplianceDescription}</p>
                </div>
                {isAdmin && <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={downloadTemplate}><Download className="mr-2 h-4 w-4" />{le.downloadTemplate}</Button>
                  <Button onClick={() => setImportDialog(true)}><Upload className="mr-2 h-4 w-4" />{le.importSpreadsheet}</Button>
                </div>}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input aria-label={le.searchCompliance} className="pl-9" value={complianceSearch} onChange={event => setComplianceSearch(event.target.value)} placeholder={le.searchCompliance} />
                </div>
                <Select value={complianceFilter} onValueChange={value => setComplianceFilter(value as typeof complianceFilter)}>
                  <SelectTrigger aria-label={le.filterCompliance} className="sm:w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{le.allStatuses}</SelectItem>
                    <SelectItem value="expired">{le.complianceStates.expired}</SelectItem>
                    <SelectItem value="expiring">{le.complianceStates.expiring}</SelectItem>
                    <SelectItem value="valid">{le.complianceStates.valid}</SelectItem>
                    <SelectItem value="missing">{le.complianceStates.missing}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="hidden items-center gap-4 rounded-lg bg-muted/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground md:grid md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_32px]">
                  <span>{le.vehicle}</span><span>{le.status}</span><span>{le.priorityExpiry}</span><span />
                </div>
                {filteredComplianceVehicles.map(vehicle => {
                  const state = overallState(vehicle);
                  const selected = selectedComplianceId === vehicle.id;
                   const urgentExpiry = nearestExpiry(vehicle);
                  const stateClass = state === "expired" ? "border-red-200 bg-red-50/45 dark:border-red-900/60 dark:bg-red-950/15" : state === "expiring" ? "border-amber-200 bg-amber-50/45 dark:border-amber-900/60 dark:bg-amber-950/15" : state === "valid" ? "border-emerald-200 bg-emerald-50/35 dark:border-emerald-900/60 dark:bg-emerald-950/15" : "border-border bg-card";
                  const detailRows = [
                    [le.vehicleLicenseExpiry, vehicle.licenseExpiryDate, true],
                    [le.ownership, vehicle.ownershipDocumentType, false],
                    [le.dateLimit, vehicle.ownershipExpiryDate, true],
                    [le.insuranceNumber, vehicle.insuranceNumber, false],
                    [le.policyNumber, vehicle.insurancePolicyNumber, false],
                    [le.insuranceExpiry, vehicle.insuranceExpiryDate, true],
                    [`${le.imported} · ${le.insuranceExpiry}`, vehicle.insuranceImportedStatus, false],
                    [le.ivmNumber, vehicle.ivmNumber, false],
                    [le.ivmPaymentTerms, vehicle.ivmPaymentTerms, false],
                    [le.ivmExpiry, vehicle.ivmExpiryDate, true],
                    [`${le.imported} · ${le.ivmExpiry}`, vehicle.ivmImportedStatus, false],
                  ] as Array<[string, string | null | undefined, boolean]>;
                  return <div key={vehicle.id} className={`overflow-hidden rounded-xl border transition-colors ${stateClass}`}>
                    <button type="button" className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 text-left md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_32px]" onClick={() => setSelectedComplianceId(selected ? null : vehicle.id)} aria-expanded={selected} aria-controls={`compliance-details-${vehicle.id}`}>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2"><span className="font-semibold tracking-wide">{vehicle.licensePlate || le.vehicle}</span>{vehicle.vehicleTypeLabel && <span className="hidden rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{vehicle.vehicleTypeLabel}</span>}</span>
                        <span className="mt-0.5 block truncate text-sm text-muted-foreground">{[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                      <span className="col-start-1 row-start-2 min-w-0 md:col-start-auto md:row-start-auto"><ComplianceBadge date={state === "missing" ? null : urgentExpiry?.date} labels={le} /></span>
                      <span className="col-start-2 row-start-2 min-w-0 text-right text-sm md:col-start-auto md:row-start-auto md:text-left"><span className="block truncate text-xs text-muted-foreground">{urgentExpiry?.label || le.priorityExpiry}</span><span className="font-medium">{urgentExpiry?.date || "—"}</span></span>
                      <ChevronDown className={`col-start-2 row-start-1 h-4 w-4 justify-self-end text-muted-foreground transition-transform md:col-start-auto md:row-start-auto ${selected ? "rotate-180" : ""}`} />
                    </button>
                    {selected && <div id={`compliance-details-${vehicle.id}`} role="region" aria-label={`${le.details}: ${vehicle.licensePlate || le.vehicle}`} className="border-t border-inherit bg-background/60 px-4 py-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{le.vehicle}</p><p className="text-lg font-semibold">{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || vehicle.licensePlate} <span className="text-muted-foreground">· {vehicle.licensePlate}</span></p></div>
                        <div className="flex flex-wrap gap-2">
                          {isAdmin && <><Button size="sm" variant="outline" onClick={() => setDocumentVehicle(vehicle)}><FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />{le.documents}</Button><Button size="sm" onClick={() => openCompliance(vehicle)}><Pencil className="mr-1.5 h-3.5 w-3.5" />{t.buttons.edit}</Button></>}
                        </div>
                      </div>
                      <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                        {detailRows.map(([label, value, date]) => <div key={label} className="min-w-0"><p className="text-xs font-medium text-muted-foreground">{label}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-sm">{value || "—"}{date && value && <ComplianceBadge date={value} labels={le} />}</div></div>)}
                      </div>
                      <div className="mt-4 flex items-center gap-2 border-t pt-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" />{le.vehicleComplianceDescription}</div>
                    </div>}
                  </div>;
                })}
                {filteredComplianceVehicles.length === 0 && <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">{le.noComplianceRecords}</div>}
              </div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-base">{le.driverLicenses}</CardTitle></CardHeader><CardContent className="space-y-3">
            {(overview?.drivers || []).map(driver => <div key={driver.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="font-medium">{resourceName(driver, "driver")}</p><p className="text-sm text-muted-foreground">{driver.licenseExpiryDate}</p></div>{driver.licenseExpiryDate && <ExpiryStatus date={driver.licenseExpiryDate} labels={le} />}</div>)}
            {overview && overview.drivers.length === 0 && <p className="text-sm text-muted-foreground">{le.noDriverLicenses}</p>}
          </CardContent></Card>
        </TabsContent>}
        {canDocuments && <TabsContent value="documents" className="space-y-4">
          {isAdmin && <div className="flex justify-end"><Button onClick={() => openDocument()}><Plus className="mr-2 w-4 h-4" />{le.addDocument}</Button></div>}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{documents.map(document => <Card key={document.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-base">{document.name}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{document.documentType || le.companyDocument}</p></div><ExpiryStatus date={document.expiryDate} labels={le} /></div></CardHeader><CardContent><p className="text-sm text-muted-foreground">{le.expiryDate}: {document.expiryDate}</p>{document.notes && <p className="mt-2 text-sm">{document.notes}</p>}{isAdmin && <div className="mt-4 flex gap-2"><Button size="sm" variant="outline" onClick={() => openDocument(document)}><Pencil className="mr-1 w-3.5 h-3.5" />{t.buttons.edit}</Button><Button size="sm" variant="outline" onClick={() => deleteDocument.mutate(document.id)}><Trash2 className="mr-1 w-3.5 h-3.5" />{t.buttons.delete}</Button></div>}</CardContent></Card>)}</div>
          {documents.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">{le.noDocuments}</CardContent></Card>}
        </TabsContent>}
        {isAdmin && <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-end"><Button onClick={() => openRule()}><Plus className="mr-2 w-4 h-4" />{le.addRule}</Button></div>
          <Card><CardContent className="space-y-3 pt-6">{rules.map(rule => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{le.entityTypes[rule.entityType as keyof typeof le.entityTypes]} · {rule.triggerType === "expired" ? le.whenExpired : le.daysBefore.replace("{days}", String(rule.thresholdDays))}</p><p className="mt-1 text-sm text-muted-foreground">{rule.recipients.length} {le.recipients.toLowerCase()} · {rule.sendEmail && le.email} {rule.sendInApp && le.inApp}</p></div><div className="flex items-center gap-2"><Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? le.active : le.inactive}</Badge><Button size="sm" variant="outline" onClick={() => openRule(rule)}><Pencil className="w-3.5 h-3.5" /></Button><Button size="sm" variant="outline" onClick={() => deleteRule.mutate(rule.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></div>)}{rules.length === 0 && <p className="py-8 text-center text-muted-foreground">{le.noRules}</p>}</CardContent></Card>
        </TabsContent>}
        <TabsContent value="alerts"><Card><CardContent className="space-y-3 pt-6">{alerts.map(alert => <div key={alert.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">{alert.entityName}</p><p className="text-sm text-muted-foreground">{le.expiryDate}: {alert.expiryDate}</p></div><div className="flex items-center gap-2"><Badge variant={alert.status === "resolved" ? "secondary" : alert.status === "acknowledged" ? "outline" : "destructive"}>{le.alertStatus[alert.status as keyof typeof le.alertStatus]}</Badge>{alert.status === "open" && <Button size="sm" variant="outline" onClick={() => updateAlert.mutate({ id: alert.id, action: "acknowledge" })}><Check className="mr-1 w-3.5 h-3.5" />{le.acknowledge}</Button>}{alert.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => updateAlert.mutate({ id: alert.id, action: "resolve" })}><X className="mr-1 w-3.5 h-3.5" />{le.resolve}</Button>}</div></div>)}{alerts.length === 0 && <p className="py-8 text-center text-muted-foreground">{le.noAlerts}</p>}</CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={documentDialog} onOpenChange={setDocumentDialog}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingDocument ? le.editDocument : le.addDocument}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>{le.documentName}</Label><Input value={documentForm.name} onChange={event => setDocumentForm({ ...documentForm, name: event.target.value })} /></div><div><Label>{le.documentType}</Label><Input value={documentForm.documentType} onChange={event => setDocumentForm({ ...documentForm, documentType: event.target.value })} /></div><div><Label>{le.expiryDate}</Label><Input type="date" value={documentForm.expiryDate} onChange={event => setDocumentForm({ ...documentForm, expiryDate: event.target.value })} /></div><div><Label>{le.notes}</Label><Textarea value={documentForm.notes} onChange={event => setDocumentForm({ ...documentForm, notes: event.target.value })} /></div><div className="flex items-center gap-2"><Switch checked={documentForm.isActive} onCheckedChange={isActive => setDocumentForm({ ...documentForm, isActive })} /><Label>{le.active}</Label></div><div className="space-y-2 border-t pt-4"><Label className="flex items-center gap-2"><UserCheck className="w-4 h-4" />{le.documentAccess}</Label><p className="text-xs text-muted-foreground">{le.documentAccessHint}</p>{users.map(appUser => <label key={appUser.id} className="flex items-center gap-2 text-sm"><Checkbox checked={documentForm.accessUserIds.includes(appUser.id)} onCheckedChange={checked => setDocumentForm({ ...documentForm, accessUserIds: checked ? [...documentForm.accessUserIds, appUser.id] : documentForm.accessUserIds.filter(id => id !== appUser.id) })} />{appUser.fullName}{appUser.email && <span className="text-muted-foreground">({appUser.email})</span>}</label>)}</div></div><DialogFooter><Button variant="outline" onClick={() => setDocumentDialog(false)}>{t.buttons.cancel}</Button><Button onClick={() => documentMutation.mutate()} disabled={!documentForm.name || !documentForm.expiryDate || documentMutation.isPending}>{t.buttons.save}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingRule ? le.editRule : le.addRule}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>{le.appliesTo}</Label><Select value={ruleForm.entityType} onValueChange={entityType => setRuleForm({ ...ruleForm, entityType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(le.entityTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label as string}</SelectItem>)}</SelectContent></Select></div><div><Label>{le.trigger}</Label><Select value={ruleForm.triggerType} onValueChange={triggerType => setRuleForm({ ...ruleForm, triggerType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expiry_approaching">{le.daysBefore.replace("{days}", "")}</SelectItem><SelectItem value="expired">{le.whenExpired}</SelectItem></SelectContent></Select></div>{ruleForm.triggerType === "expiry_approaching" && <div className="space-y-2"><Label>{le.reminderDays}</Label><Input min="0" type="number" value={ruleForm.thresholdDays} onChange={event => setRuleForm({ ...ruleForm, thresholdDays: event.target.value })} /><div className="flex flex-wrap gap-2">{[90, 60, 30, 7].map(days => <Button key={days} type="button" size="sm" variant={ruleForm.thresholdDays === String(days) ? "default" : "outline"} onClick={() => setRuleForm({ ...ruleForm, thresholdDays: String(days) })}>{days}</Button>)}</div></div>}<div className="space-y-2"><Label>{le.systemRecipients}</Label>{users.map(appUser => <label key={appUser.id} className="flex items-center gap-2 text-sm"><Checkbox checked={ruleForm.userIds.includes(appUser.id)} onCheckedChange={checked => setRuleForm({ ...ruleForm, userIds: checked ? [...ruleForm.userIds, appUser.id] : ruleForm.userIds.filter(id => id !== appUser.id) })} />{appUser.fullName}{appUser.email && <span className="text-muted-foreground">({appUser.email})</span>}</label>)}</div><div><Label>{le.extraEmails}</Label><Input value={ruleForm.extraEmails} onChange={event => setRuleForm({ ...ruleForm, extraEmails: event.target.value })} placeholder="ops@example.com, fleet@example.com" /></div><div className="flex items-center gap-2"><Switch checked={ruleForm.sendEmail} onCheckedChange={sendEmail => setRuleForm({ ...ruleForm, sendEmail })} /><Label>{le.email}</Label></div><div className="flex items-center gap-2"><Switch checked={ruleForm.sendInApp} onCheckedChange={sendInApp => setRuleForm({ ...ruleForm, sendInApp })} /><Label>{le.inApp}</Label></div><div className="flex items-center gap-2"><Switch checked={ruleForm.isActive} onCheckedChange={isActive => setRuleForm({ ...ruleForm, isActive })} /><Label>{le.active}</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setRuleDialog(false)}>{t.buttons.cancel}</Button><Button onClick={() => ruleMutation.mutate()} disabled={(ruleForm.userIds.length === 0 && !ruleForm.extraEmails.trim()) || ruleMutation.isPending}>{t.buttons.save}</Button></DialogFooter></DialogContent></Dialog>

      <Dialog open={Boolean(editingCompliance)} onOpenChange={open => !open && setEditingCompliance(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{le.editCompliance}: {editingCompliance?.licensePlate}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {complianceFieldRows.map((fields, rowIndex) => <div className="grid gap-4 sm:grid-cols-2" key={rowIndex}>
              {fields.map(field => <div key={field.key}>
                <Label>{field.label}</Label>
                <Input
                  type={field.type || "text"}
                  value={complianceForm[field.key]}
                  onChange={event => setComplianceForm({ ...complianceForm, [field.key]: event.target.value })}
                />
              </div>)}
            </div>)}
            <p className="text-xs text-muted-foreground">{le.derivedStatusHint}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCompliance(null)}>{t.buttons.cancel}</Button>
            <Button onClick={() => complianceMutation.mutate()} disabled={complianceMutation.isPending}>{t.buttons.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(documentVehicle)} onOpenChange={open => !open && setDocumentVehicle(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{le.vehicleDocuments} · {documentVehicle?.licensePlate}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{le.vehicleDocumentsHint}</p>
          <div className="space-y-3">
            {complianceDocumentTypes.map(({ type, label }) => {
              const document = vehicleDocuments.find(item => item.documentType === type);
              return <div key={type} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-medium">{label}</p>{document ? <p className="text-xs text-muted-foreground">{document.originalFilename} · {(document.sizeBytes / 1024 / 1024).toFixed(1)} MB</p> : <p className="text-xs text-muted-foreground">{le.noFileAttached}</p>}</div>
                  <div className="flex flex-wrap gap-2">
                    {document && <Button size="sm" variant="outline" onClick={() => window.open(`/api/vehicles/${documentVehicle!.id}/compliance-documents/${type}/file`, "_blank")}><Eye className="mr-1 h-3.5 w-3.5" />{le.viewFile}</Button>}
                    <Button size="sm" variant="outline" asChild><Label className="cursor-pointer"><Upload className="mr-1 h-3.5 w-3.5" />{document ? le.replaceFile : le.uploadFile}<Input className="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" disabled={uploadVehicleDocument.isPending} onChange={event => { const file = event.target.files?.[0]; if (file) uploadVehicleDocument.mutate({ type, file }); event.target.value = ""; }} /></Label></Button>
                    {document && <Button size="sm" variant="destructive" disabled={removeVehicleDocument.isPending} onClick={() => removeVehicleDocument.mutate(type)}><Trash2 className="mr-1 h-3.5 w-3.5" />{le.removeFile}</Button>}
                  </div>
                </div>
              </div>;
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialog} onOpenChange={open => {
        setImportDialog(open);
        if (!open) { setImportRows([]); setImportPreview(null); }
      }}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" />{le.importSpreadsheet}</DialogTitle>
          </DialogHeader>
          <input
            ref={importFileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
               if (file) setImportFilename(file.name);
              event.target.value = "";
            }}
          />
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed p-6 text-center">
              <FileSpreadsheet className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
              <p className="font-medium">{le.chooseSpreadsheet}</p>
              <p className="mb-4 text-sm text-muted-foreground">{le.supportedFormats}</p>
               <Button variant="outline" onClick={() => importFileRef.current?.click()}><Upload className="mr-2 h-4 w-4" />{le.chooseFile}</Button>
               <Input className="mx-auto mt-3 max-w-md" value={importFilename} onChange={event => setImportFilename(event.target.value)} placeholder="Source filename" />
              {importRows.length > 0 && <p className="mt-3 text-sm text-emerald-700">{le.rowsLoaded.replace("{count}", String(importRows.length))}</p>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Switch checked={createUnmatched} onCheckedChange={value => { setCreateUnmatched(value); setImportPreview(null); }} />
                <span><span className="block text-sm font-medium">{le.createUnmatched}</span><span className="text-xs text-muted-foreground">{le.createUnmatchedHint}</span></span>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <Switch checked={replaceBlanks} onCheckedChange={value => { setReplaceBlanks(value); setImportPreview(null); }} />
                <span><span className="block text-sm font-medium">{le.replaceBlanks}</span><span className="text-xs text-muted-foreground">{le.replaceBlanksHint}</span></span>
              </label>
            </div>
            {importPreview && <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(["create", "update", "error", "total"] as const).map(key => <div className="rounded-lg border p-3 text-center" key={key}><p className="text-2xl font-semibold">{importPreview.summary[key]}</p><p className="text-xs text-muted-foreground">{le.importSummary[key]}</p></div>)}
              </div>
              <div className="max-h-72 overflow-auto rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>{le.row}</TableHead><TableHead>{le.vehiclePlate}</TableHead><TableHead>{le.importAction}</TableHead><TableHead>{le.details}</TableHead></TableRow></TableHeader>
                  <TableBody>{importPreview.rows.map(row => <TableRow key={row.rowNumber}>
                    <TableCell>{row.rowNumber}</TableCell><TableCell>{row.licensePlate || "—"}</TableCell>
                    <TableCell><Badge variant={row.action === "error" ? "destructive" : row.action === "create" ? "default" : "secondary"}>{le.importSummary[row.action]}</Badge></TableCell>
                    <TableCell className="max-w-md text-xs text-muted-foreground">{row.messages.join("; ") || le.ready}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </div>
            </>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialog(false)}>{t.buttons.cancel}</Button>
            <Button variant="outline" onClick={() => importMutation.mutate("preview")} disabled={importRows.length === 0 || importMutation.isPending}>{le.previewImport}</Button>
            <Button onClick={() => importMutation.mutate("apply")} disabled={!importPreview || importMutation.isPending || importPreview.summary.create + importPreview.summary.update === 0}>{le.confirmImport}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {isAdmin && <Card>
        <CardHeader><CardTitle className="text-base">{le.importHistory}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {importHistory.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
            <div><p className="font-medium">{item.sourceFilename}</p><p className="text-xs text-muted-foreground">{item.actorName} · {new Date(item.appliedAt).toLocaleString()}</p></div>
              <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => openImportDetails(item.id)}>{le.inspectImport}</Button><Button size="sm" variant="outline" onClick={() => window.open(`/api/vehicle-compliance/import-history/${item.id}/report`, "_blank")}>{le.downloadReport}</Button>{item.undoStatus === "partial" && <Button size="sm" variant="outline" onClick={() => openImportDetails(item.id)}>{le.retrySkipped}</Button>}<Button size="sm" variant="destructive" disabled={Boolean(item.undoStatus)} onClick={async () => { if (!window.confirm(le.undoImportConfirm)) return; const response = await apiRequest("POST", `/api/vehicle-compliance/import-history/${item.id}/undo`); const result = await response.json(); refresh(); queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); toast({ title: le.undoImportComplete, description: le.undoResult.replace("{restored}", String(result.restoredCount)).replace("{deleted}", String(result.deletedCount)).replace("{skipped}", String(result.skippedCount)) }); }}>{item.undoStatus ? `${le.undo} ${item.undoStatus}` : le.undo}</Button></div>
          </div>)}
          {importHistory.length === 0 && <p className="text-sm text-muted-foreground">{le.noImports}</p>}
        </CardContent>
      </Card>}
      <Dialog open={selectedImport !== null} onOpenChange={open => !open && setSelectedImport(null)}><DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{le.importDetails}</DialogTitle></DialogHeader>{importDetail && <div className="space-y-4"><div className="rounded border p-3 text-sm"><p><span className="font-medium">{le.source}:</span> {importDetail.import.sourceFilename}</p><p><span className="font-medium">{le.runBy}:</span> {importDetail.import.actorName} · {new Date(importDetail.import.appliedAt).toLocaleString()}</p><p><span className="font-medium">{le.options}:</span> {le.createUnmatched} {importDetail.import.options?.createUnmatched ? le.on : le.off}, {le.replaceBlanks} {importDetail.import.options?.replaceBlanks ? le.on : le.off}</p></div><div className="grid grid-cols-3 gap-2">{[{ label: le.restoredRows, value: importDetail.rows.filter((row: any) => row.undoStatus === "restored" || row.undoStatus === "partial").length }, { label: le.deletedRows, value: importDetail.rows.filter((row: any) => row.undoStatus === "deleted").length }, { label: le.skippedRows, value: importDetail.rows.filter((row: any) => retryableUndoFields(row).length > 0).length }].map(item => <div key={item.label} className="rounded border p-3 text-center"><p className="text-2xl font-semibold">{item.value}</p><p className="text-xs text-muted-foreground">{item.label}</p></div>)}</div>{importDetail.rows.map((row: any) => { const retryableFields = retryableUndoFields(row); const restoredFields = (row.changedFields || []).filter((field: string) => !retryableFields.includes(field)); return <div key={row.id} className="rounded border p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><span className="font-medium">{le.row} {row.rowNumber} · {row.action}</span><span className="ml-2 text-muted-foreground">{row.success ? le.applied : row.message || le.failed}</span></div>{row.undoStatus && <Badge variant={row.undoStatus === "deleted" || row.undoStatus === "restored" ? "default" : "secondary"}>{row.undoStatus}</Badge>}</div>{row.undoStatus === "deleted" && <p className="mt-2 text-emerald-700">{le.deletedRows}</p>}{restoredFields.length > 0 && <p className="mt-2 text-emerald-700">{le.restoredFields}: {restoredFields.join(", ")}</p>}{retryableFields.length > 0 && <div className="mt-3 rounded bg-amber-50 p-3 dark:bg-amber-950/20"><p className="font-medium">{le.skippedFields}</p>{row.undoWarning && <p className="mt-1 text-xs text-muted-foreground">{row.undoWarning}</p>}{row.action === "create" ? <label className="mt-2 flex items-center gap-2 text-sm"><Checkbox checked={retryableFields.every((field: string) => (selectedUndoFields[row.id] || []).includes(field))} onCheckedChange={checked => setSelectedUndoFields(current => ({ ...current, [row.id]: checked ? retryableFields : [] }))} />{le.retryEntireRow}</label> : <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">{retryableFields.map((field: string) => <label key={field} className="flex items-center gap-2 text-sm"><Checkbox checked={(selectedUndoFields[row.id] || []).includes(field)} onCheckedChange={checked => toggleUndoField(row.id, field, Boolean(checked))} />{field}</label>)}</div>}</div>}{row.changedFields?.length > 0 && <div className="mt-3 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>{le.field}</TableHead><TableHead>{le.before}</TableHead><TableHead>{le.after}</TableHead></TableRow></TableHeader><TableBody>{row.changedFields.map((field: string) => <TableRow key={field}><TableCell>{field}</TableCell><TableCell>{String(row.beforeValues?.[field] ?? "—")}</TableCell><TableCell>{String(row.afterValues?.[field] ?? "—")}</TableCell></TableRow>)}</TableBody></Table></div>}</div>; })}{importDetail.undoAttempts?.length > 0 && <div className="space-y-2 border-t pt-4"><h3 className="font-medium">{le.retryHistory}</h3>{importDetail.undoAttempts.map((attempt: any) => <div key={attempt.id} className="rounded border p-3 text-sm"><p>{attempt.actorName} · {new Date(attempt.startedAt).toLocaleString()} · {attempt.status}</p>{attempt.rows.map((row: any) => <p key={row.id} className="mt-1 text-xs text-muted-foreground">{le.row} {row.rowNumber}: {row.status === "deleted" ? le.deletedRows : `${le.restoredFields} ${row.restoredFields.join(", ") || "—"}; ${le.skippedFields} ${row.skippedFields.join(", ") || "—"}`}{row.warning ? ` · ${row.warning}` : ""}</p>)}</div>)}</div>}<DialogFooter><Button variant="outline" onClick={() => setSelectedImport(null)}>{t.buttons.close}</Button><Button disabled={undoRetryMutation.isPending || Object.values(selectedUndoFields).every(fields => fields.length === 0)} onClick={() => { const rows = Object.entries(selectedUndoFields).filter(([, fields]) => fields.length > 0).map(([rowId, fields]) => ({ rowId: Number(rowId), fields })); if (selectedImport && rows.length) undoRetryMutation.mutate({ importId: selectedImport, rows }); }}>{undoRetryMutation.isPending ? le.retryingSkipped : le.retrySkipped}</Button></DialogFooter></div>}</DialogContent></Dialog>
    </div>
  );
}