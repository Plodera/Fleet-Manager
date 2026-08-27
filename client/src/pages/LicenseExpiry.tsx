import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, Check, FileText, Pencil, Plus, ShieldAlert, Trash2, UserCheck, X } from "lucide-react";
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

type Resource = { id: number; licenseExpiryDate: string; make?: string; model?: string; licensePlate?: string; fullName?: string; licenseNumber?: string };
type CompanyDocument = { id: number; name: string; documentType: string | null; expiryDate: string; notes: string | null; isActive: boolean; accessUserIds?: number[] };
type Recipient = { id?: number; userId: number | null; email: string | null };
type Rule = { id: number; entityType: string; triggerType: string; thresholdDays: number | null; sendEmail: boolean; sendInApp: boolean; isActive: boolean; recipients: Recipient[] };
type Alert = { id: number; entityType: string; entityName: string; expiryDate: string; status: string; createdAt: string };
type AppUser = { id: number; fullName: string; email: string | null };

const blankDocument = { name: "", documentType: "", expiryDate: "", notes: "", isActive: true, accessUserIds: [] as number[] };
const blankRule = { entityType: "vehicle_license", triggerType: "expiry_approaching", thresholdDays: "30", sendEmail: true, sendInApp: true, userIds: [] as number[], extraEmails: "", isActive: true };

function daysUntil(date: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${date}T00:00:00`);
  return Math.round((expiry.getTime() - today.getTime()) / 86400000);
}

function ExpiryStatus({ date, labels }: { date: string; labels: any }) {
  const days = daysUntil(date);
  const classes = days < 0
    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
    : days <= 30
      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  const text = days < 0 ? `${labels.expired} · ${Math.abs(days)} ${labels.daysOverdue}` : days === 0 ? labels.expiresToday : days <= 30 ? `${labels.expiringSoon} · ${days} ${labels.daysRemaining}` : `${labels.valid} · ${days} ${labels.daysRemaining}`;
  return <Badge className={classes}>{text}</Badge>;
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

  const { data: overview } = useQuery<{ vehicles: Resource[]; drivers: Resource[] }>({ queryKey: ["/api/license-expiry/overview"], enabled: canLicenses });
  const { data: documents = [] } = useQuery<CompanyDocument[]>({ queryKey: ["/api/company-documents"], enabled: canDocuments });
  const { data: rules = [] } = useQuery<Rule[]>({ queryKey: ["/api/expiry-notification-rules"], enabled: isAdmin });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/users"], enabled: isAdmin });
  const { data: alerts = [] } = useQuery<Alert[]>({ queryKey: ["/api/expiry-notifications/mine"] });

  const refresh = () => {
    ["/api/company-documents", "/api/expiry-notification-rules", "/api/license-expiry/overview", "/api/expiry-notifications/mine"].forEach(key => queryClient.invalidateQueries({ queryKey: [key] }));
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">{le.vehicleLicenses}</CardTitle></CardHeader><CardContent className="space-y-3">
              {(overview?.vehicles || []).map(vehicle => <div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="font-medium">{resourceName(vehicle, "vehicle")}</p><p className="text-sm text-muted-foreground">{vehicle.licenseExpiryDate}</p></div><ExpiryStatus date={vehicle.licenseExpiryDate} labels={le} /></div>)}
              {overview && overview.vehicles.length === 0 && <p className="text-sm text-muted-foreground">{le.noVehicleLicenses}</p>}
            </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">{le.driverLicenses}</CardTitle></CardHeader><CardContent className="space-y-3">
              {(overview?.drivers || []).map(driver => <div key={driver.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><div><p className="font-medium">{resourceName(driver, "driver")}</p><p className="text-sm text-muted-foreground">{driver.licenseExpiryDate}</p></div><ExpiryStatus date={driver.licenseExpiryDate} labels={le} /></div>)}
              {overview && overview.drivers.length === 0 && <p className="text-sm text-muted-foreground">{le.noDriverLicenses}</p>}
            </CardContent></Card>
          </div>
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
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingRule ? le.editRule : le.addRule}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>{le.appliesTo}</Label><Select value={ruleForm.entityType} onValueChange={entityType => setRuleForm({ ...ruleForm, entityType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(le.entityTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label as string}</SelectItem>)}</SelectContent></Select></div><div><Label>{le.trigger}</Label><Select value={ruleForm.triggerType} onValueChange={triggerType => setRuleForm({ ...ruleForm, triggerType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="expiry_approaching">{le.daysBefore.replace("{days}", "")}</SelectItem><SelectItem value="expired">{le.whenExpired}</SelectItem></SelectContent></Select></div>{ruleForm.triggerType === "expiry_approaching" && <div><Label>{le.reminderDays}</Label><Input min="0" type="number" value={ruleForm.thresholdDays} onChange={event => setRuleForm({ ...ruleForm, thresholdDays: event.target.value })} /></div>}<div className="space-y-2"><Label>{le.systemRecipients}</Label>{users.map(appUser => <label key={appUser.id} className="flex items-center gap-2 text-sm"><Checkbox checked={ruleForm.userIds.includes(appUser.id)} onCheckedChange={checked => setRuleForm({ ...ruleForm, userIds: checked ? [...ruleForm.userIds, appUser.id] : ruleForm.userIds.filter(id => id !== appUser.id) })} />{appUser.fullName}{appUser.email && <span className="text-muted-foreground">({appUser.email})</span>}</label>)}</div><div><Label>{le.extraEmails}</Label><Input value={ruleForm.extraEmails} onChange={event => setRuleForm({ ...ruleForm, extraEmails: event.target.value })} placeholder="ops@example.com, fleet@example.com" /></div><div className="flex items-center gap-2"><Switch checked={ruleForm.sendEmail} onCheckedChange={sendEmail => setRuleForm({ ...ruleForm, sendEmail })} /><Label>{le.email}</Label></div><div className="flex items-center gap-2"><Switch checked={ruleForm.sendInApp} onCheckedChange={sendInApp => setRuleForm({ ...ruleForm, sendInApp })} /><Label>{le.inApp}</Label></div><div className="flex items-center gap-2"><Switch checked={ruleForm.isActive} onCheckedChange={isActive => setRuleForm({ ...ruleForm, isActive })} /><Label>{le.active}</Label></div></div><DialogFooter><Button variant="outline" onClick={() => setRuleDialog(false)}>{t.buttons.cancel}</Button><Button onClick={() => ruleMutation.mutate()} disabled={(ruleForm.userIds.length === 0 && !ruleForm.extraEmails.trim()) || ruleMutation.isPending}>{t.buttons.save}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}