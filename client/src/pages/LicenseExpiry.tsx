import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Check, Download, FileSpreadsheet, Pencil, Plus, Search, Trash2, Upload, UserCheck, X } from "lucide-react";
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
  const [complianceForm, setComplianceForm] = useState(blankCompliance);
  const [importDialog, setImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<ParsedComplianceRow[]>([]);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [createUnmatched, setCreateUnmatched] = useState(true);
  const [replaceBlanks, setReplaceBlanks] = useState(false);
  const [importFilename, setImportFilename] = useState("");
  const [selectedImport, setSelectedImport] = useState<number | null>(null);
  const { data: importHistory = [] } = useQuery<any[]>({ queryKey: ["/api/vehicle-compliance/import-history"], enabled: isAdmin });
  const { data: importDetail } = useQuery<any>({ queryKey: ["/api/vehicle-compliance/import-history", selectedImport], enabled: isAdmin && selectedImport !== null });
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: overview } = useQuery<{ vehicles: Resource[]; drivers: Resource[] }>({ queryKey: ["/api/license-expiry/overview"], enabled: canLicenses });
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
                  <Input className="pl-9" value={complianceSearch} onChange={event => setComplianceSearch(event.target.value)} placeholder={le.searchCompliance} />
                </div>
                <Select value={complianceFilter} onValueChange={value => setComplianceFilter(value as typeof complianceFilter)}>
                  <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
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
              <div className="overflow-x-auto rounded-md border">
                <Table className="min-w-[1250px]">
                  <TableHeader><TableRow>
                    <TableHead>{le.vehicle}</TableHead>
                    <TableHead>{le.vehicleLicenseExpiry}</TableHead>
                    <TableHead>{le.ownership}</TableHead>
                    <TableHead>{le.dateLimit}</TableHead>
                    <TableHead>{le.insuranceNumber}</TableHead>
                    <TableHead>{le.policyNumber}</TableHead>
                    <TableHead>{le.insuranceExpiry}</TableHead>
                    <TableHead>{le.ivmNumber}</TableHead>
                    <TableHead>{le.ivmPaymentTerms}</TableHead>
                    <TableHead>{le.ivmExpiry}</TableHead>
                    {isAdmin && <TableHead className="text-right">{le.actions}</TableHead>}
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredComplianceVehicles.map(vehicle => <TableRow key={vehicle.id}>
                      <TableCell>
                        <p className="font-medium">{vehicle.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">{[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" · ")}</p>
                        {vehicle.vehicleTypeLabel && <p className="text-xs text-muted-foreground">{vehicle.vehicleTypeLabel}</p>}
                      </TableCell>
                      <TableCell><div className="space-y-1"><span className="text-xs">{vehicle.licenseExpiryDate || "—"}</span><ComplianceBadge date={vehicle.licenseExpiryDate} labels={le} /></div></TableCell>
                      <TableCell>{vehicle.ownershipDocumentType || "—"}</TableCell>
                      <TableCell><div className="space-y-1"><span className="text-xs">{vehicle.ownershipExpiryDate || "—"}</span><ComplianceBadge date={vehicle.ownershipExpiryDate} labels={le} /></div></TableCell>
                      <TableCell>{vehicle.insuranceNumber || "—"}</TableCell>
                      <TableCell>{vehicle.insurancePolicyNumber || "—"}</TableCell>
                      <TableCell><div className="space-y-1"><span className="text-xs">{vehicle.insuranceExpiryDate || "—"}</span><ComplianceBadge date={vehicle.insuranceExpiryDate} labels={le} />{vehicle.insuranceImportedStatus && <p className="text-xs text-muted-foreground">{le.imported}: {vehicle.insuranceImportedStatus}</p>}</div></TableCell>
                      <TableCell>{vehicle.ivmNumber || "—"}</TableCell>
                      <TableCell>{vehicle.ivmPaymentTerms || "—"}</TableCell>
                      <TableCell><div className="space-y-1"><span className="text-xs">{vehicle.ivmExpiryDate || "—"}</span><ComplianceBadge date={vehicle.ivmExpiryDate} labels={le} />{vehicle.ivmImportedStatus && <p className="text-xs text-muted-foreground">{le.imported}: {vehicle.ivmImportedStatus}</p>}</div></TableCell>
                      {isAdmin && <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openCompliance(vehicle)}><Pencil className="mr-1 h-3.5 w-3.5" />{t.buttons.edit}</Button></TableCell>}
                    </TableRow>)}
                    {filteredComplianceVehicles.length === 0 && <TableRow><TableCell colSpan={11} className="h-28 text-center text-muted-foreground">{le.noComplianceRecords}</TableCell></TableRow>}
                  </TableBody>
                </Table>
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
        <CardHeader><CardTitle className="text-base">Compliance import history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {importHistory.map((item: any) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
            <div><p className="font-medium">{item.sourceFilename}</p><p className="text-xs text-muted-foreground">{item.actorName} · {new Date(item.appliedAt).toLocaleString()}</p></div>
             <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setSelectedImport(item.id)}>Inspect</Button><Button size="sm" variant="outline" onClick={() => window.open(`/api/vehicle-compliance/import-history/${item.id}/report`, "_blank")}>Download report</Button><Button size="sm" variant="destructive" disabled={Boolean(item.undoStatus)} onClick={async () => { if (!window.confirm("Undo this import? Later edits will be preserved.")) return; const response = await apiRequest("POST", `/api/vehicle-compliance/import-history/${item.id}/undo`); const result = await response.json(); refresh(); queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] }); toast({ title: "Import undo complete", description: `${result.restoredCount} restored, ${result.skippedCount} skipped${result.skipped?.[0] ? `. ${result.skipped[0].warning}` : ""}` }); }}>{item.undoStatus ? `Undo ${item.undoStatus}` : "Undo"}</Button></div>
          </div>)}
          {importHistory.length === 0 && <p className="text-sm text-muted-foreground">No imports recorded.</p>}
        </CardContent>
      </Card>}
      <Dialog open={selectedImport !== null} onOpenChange={open => !open && setSelectedImport(null)}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Import details</DialogTitle></DialogHeader>{importDetail && <div className="space-y-3"><div className="rounded border p-3 text-sm"><p><span className="font-medium">Source:</span> {importDetail.import.sourceFilename}</p><p><span className="font-medium">Run by:</span> {importDetail.import.actorName} · {new Date(importDetail.import.appliedAt).toLocaleString()}</p><p><span className="font-medium">Options:</span> create unmatched {importDetail.import.options?.createUnmatched ? "on" : "off"}, replace blanks {importDetail.import.options?.replaceBlanks ? "on" : "off"}</p></div>{importDetail.rows.map((row: any) => <div key={row.id} className="rounded border p-3 text-sm"><span className="font-medium">Row {row.rowNumber} · {row.action}</span><span className="ml-2">{row.success ? "Applied" : row.message || "Failed"}</span>{row.changedFields?.length > 0 && <div className="mt-2 overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Field</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead></TableRow></TableHeader><TableBody>{row.changedFields.map((field: string) => <TableRow key={field}><TableCell>{field}</TableCell><TableCell>{String(row.beforeValues?.[field] ?? "—")}</TableCell><TableCell>{String(row.afterValues?.[field] ?? "—")}</TableCell></TableRow>)}</TableBody></Table></div>}</div>)}</div>}</DialogContent></Dialog>
    </div>
  );
}