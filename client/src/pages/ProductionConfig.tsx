import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Factory, Zap, Layers, Eye, EyeOff, Copy, Check, Clock, AlertCircle, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type SteelSettings = {
  id: number;
  section: string;
  webhookSecret: string;
  enabled: boolean;
  notes: string | null;
  lastReceivedAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

type SectionKey = "rolling_mill" | "sms" | "ccm";

// ─── Webhook URL copy button ────────────────────────────────────────────────
function WebhookUrl({ path, label, customUrl }: { path: string; label: string; customUrl?: string }) {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const url = customUrl ? `${origin}${customUrl}` : `${origin}/api/production/webhook/${path}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs bg-muted rounded px-2 py-1.5 font-mono text-muted-foreground break-all">{url}</code>
        <Button size="icon" variant="ghost" onClick={handleCopy} title="Copy URL" data-testid={`btn-copy-${path}`}>
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Manual Entry Dialog for Rolling Mill ──────────────────────────────────
function RollingMillEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const p = t.production;
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    shift: "",
    isDailyTotal: false,
    tonsProduced: "",
    billetsTaken: "",
    billetsRolled: "",
    missRoll: "",
    cobleCut: "",
    hotOut: "",
    breakdownMinutes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/production/rolling-mill", {
        ...data,
        isDailyTotal: data.isDailyTotal,
        tonsProduced: data.tonsProduced || undefined,
        billetsTaken: data.billetsTaken ? parseInt(data.billetsTaken, 10) : undefined,
        billetsRolled: data.billetsRolled ? parseInt(data.billetsRolled, 10) : undefined,
        missRoll: data.missRoll ? parseInt(data.missRoll, 10) : undefined,
        cobleCut: data.cobleCut ? parseInt(data.cobleCut, 10) : undefined,
        hotOut: data.hotOut ? parseInt(data.hotOut, 10) : undefined,
        breakdownMinutes: data.breakdownMinutes ? parseInt(data.breakdownMinutes, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/rolling-mill"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/kpis"] });
      toast({ title: p.reportAdded });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.manualEntryTitle} — {p.rollingMill}</DialogTitle>
          <DialogDescription>{p.manualEntrySubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="rm-date">{p.reportDate}</Label>
            <Input id="rm-date" type="date" value={form.reportDate} onChange={set("reportDate")} data-testid="input-rm-date" />
          </div>
          <div>
            <Label htmlFor="rm-shift">{p.shift}</Label>
            <Input id="rm-shift" placeholder="A / B / C" value={form.shift} onChange={set("shift")} data-testid="input-rm-shift" />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={form.isDailyTotal}
              onCheckedChange={v => setForm(f => ({ ...f, isDailyTotal: v }))}
              data-testid="switch-rm-daily-total"
            />
            <Label>{p.isDailyTotal}</Label>
          </div>
          <div>
            <Label htmlFor="rm-tons">{p.tonsProduced}</Label>
            <Input id="rm-tons" type="number" step="0.01" value={form.tonsProduced} onChange={set("tonsProduced")} data-testid="input-rm-tons" />
          </div>
          <div>
            <Label htmlFor="rm-taken">{p.billetsTaken}</Label>
            <Input id="rm-taken" type="number" value={form.billetsTaken} onChange={set("billetsTaken")} data-testid="input-rm-taken" />
          </div>
          <div>
            <Label htmlFor="rm-rolled">{p.billetsRolled}</Label>
            <Input id="rm-rolled" type="number" value={form.billetsRolled} onChange={set("billetsRolled")} data-testid="input-rm-rolled" />
          </div>
          <div>
            <Label htmlFor="rm-miss">{p.missRoll}</Label>
            <Input id="rm-miss" type="number" value={form.missRoll} onChange={set("missRoll")} data-testid="input-rm-miss" />
          </div>
          <div>
            <Label htmlFor="rm-coble">{p.cobleCut}</Label>
            <Input id="rm-coble" type="number" value={form.cobleCut} onChange={set("cobleCut")} data-testid="input-rm-coble" />
          </div>
          <div>
            <Label htmlFor="rm-hot">{p.hotOut}</Label>
            <Input id="rm-hot" type="number" value={form.hotOut} onChange={set("hotOut")} data-testid="input-rm-hot" />
          </div>
          <div>
            <Label htmlFor="rm-bd">{p.breakdownMinutes}</Label>
            <Input id="rm-bd" type="number" value={form.breakdownMinutes} onChange={set("breakdownMinutes")} data-testid="input-rm-breakdown" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.buttons.cancel}</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} data-testid="btn-rm-submit">
            {t.buttons.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manual Entry Dialog for SMS ───────────────────────────────────────────
function SmsEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const p = t.production;
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    shift: "",
    heatNo: "",
    startTime: "",
    tapingTime: "",
    tapToTapMinutes: "",
    tapingTempC: "",
    ladleTempC: "",
    totalKwh: "",
    fcTons: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/production/sms-manual", {
        ...data,
        tapToTapMinutes: data.tapToTapMinutes ? parseInt(data.tapToTapMinutes, 10) : undefined,
        tapingTempC: data.tapingTempC ? parseInt(data.tapingTempC, 10) : undefined,
        ladleTempC: data.ladleTempC ? parseInt(data.ladleTempC, 10) : undefined,
        totalKwh: data.totalKwh || undefined,
        fcTons: data.fcTons || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/sms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/kpis"] });
      toast({ title: p.reportAdded });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.manualEntryTitle} — {p.sms}</DialogTitle>
          <DialogDescription>{p.manualEntrySubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="sms-date">{p.reportDate}</Label>
            <Input id="sms-date" type="date" value={form.reportDate} onChange={set("reportDate")} data-testid="input-sms-date" />
          </div>
          <div>
            <Label htmlFor="sms-shift">{p.shift}</Label>
            <Input id="sms-shift" placeholder="A / B / C" value={form.shift} onChange={set("shift")} data-testid="input-sms-shift" />
          </div>
          <div>
            <Label htmlFor="sms-heat">{p.heatNo}</Label>
            <Input id="sms-heat" value={form.heatNo} onChange={set("heatNo")} data-testid="input-sms-heat" />
          </div>
          <div>
            <Label htmlFor="sms-start">{p.startTime}</Label>
            <Input id="sms-start" placeholder="HH:MM" value={form.startTime} onChange={set("startTime")} data-testid="input-sms-start" />
          </div>
          <div>
            <Label htmlFor="sms-taping">{p.tapingTime}</Label>
            <Input id="sms-taping" placeholder="HH:MM" value={form.tapingTime} onChange={set("tapingTime")} data-testid="input-sms-taping" />
          </div>
          <div>
            <Label htmlFor="sms-t2t">{p.tapToTapMinutes}</Label>
            <Input id="sms-t2t" type="number" value={form.tapToTapMinutes} onChange={set("tapToTapMinutes")} data-testid="input-sms-t2t" />
          </div>
          <div>
            <Label htmlFor="sms-taptemp">{p.tapingTempC}</Label>
            <Input id="sms-taptemp" type="number" value={form.tapingTempC} onChange={set("tapingTempC")} data-testid="input-sms-taptemp" />
          </div>
          <div>
            <Label htmlFor="sms-ladletemp">{p.ladleTempC}</Label>
            <Input id="sms-ladletemp" type="number" value={form.ladleTempC} onChange={set("ladleTempC")} data-testid="input-sms-ladletemp" />
          </div>
          <div>
            <Label htmlFor="sms-kwh">{p.totalKwh}</Label>
            <Input id="sms-kwh" type="number" step="0.01" value={form.totalKwh} onChange={set("totalKwh")} data-testid="input-sms-kwh" />
          </div>
          <div>
            <Label htmlFor="sms-fc">{p.fcTons}</Label>
            <Input id="sms-fc" type="number" step="0.01" value={form.fcTons} onChange={set("fcTons")} data-testid="input-sms-fc" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.buttons.cancel}</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} data-testid="btn-sms-submit">
            {t.buttons.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manual Entry Dialog for CCM ───────────────────────────────────────────
function CcmEntryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const p = t.production;
  const [form, setForm] = useState({
    reportDate: new Date().toISOString().split("T")[0],
    shift: "",
    incharge: "",
    heatNo: "",
    noBillets: "",
    strandsRun: "",
    mouldLife1: "",
    mouldLife2: "",
    ladleNo: "",
    ladleOpening: "",
    tundishNo: "",
    tundishType: "",
    sequence: "",
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/api/production/ccm-manual", {
        ...data,
        noBillets: data.noBillets ? parseInt(data.noBillets, 10) : undefined,
        strandsRun: data.strandsRun ? parseInt(data.strandsRun, 10) : undefined,
        mouldLife1: data.mouldLife1 ? parseInt(data.mouldLife1, 10) : undefined,
        mouldLife2: data.mouldLife2 ? parseInt(data.mouldLife2, 10) : undefined,
        sequence: data.sequence ? parseInt(data.sequence, 10) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/ccm"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/kpis"] });
      toast({ title: p.reportAdded });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{p.manualEntryTitle} — {p.ccm}</DialogTitle>
          <DialogDescription>{p.manualEntrySubtitle}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="ccm-date">{p.reportDate}</Label>
            <Input id="ccm-date" type="date" value={form.reportDate} onChange={set("reportDate")} data-testid="input-ccm-date" />
          </div>
          <div>
            <Label htmlFor="ccm-shift">{p.shift}</Label>
            <Input id="ccm-shift" placeholder="A / B / C" value={form.shift} onChange={set("shift")} data-testid="input-ccm-shift" />
          </div>
          <div>
            <Label htmlFor="ccm-incharge">{p.incharge}</Label>
            <Input id="ccm-incharge" value={form.incharge} onChange={set("incharge")} data-testid="input-ccm-incharge" />
          </div>
          <div>
            <Label htmlFor="ccm-heat">{p.heatNo}</Label>
            <Input id="ccm-heat" value={form.heatNo} onChange={set("heatNo")} data-testid="input-ccm-heat" />
          </div>
          <div>
            <Label htmlFor="ccm-billets">{p.noBillets}</Label>
            <Input id="ccm-billets" type="number" value={form.noBillets} onChange={set("noBillets")} data-testid="input-ccm-billets" />
          </div>
          <div>
            <Label htmlFor="ccm-strands">{p.strandsRun}</Label>
            <Input id="ccm-strands" type="number" value={form.strandsRun} onChange={set("strandsRun")} data-testid="input-ccm-strands" />
          </div>
          <div>
            <Label htmlFor="ccm-ml1">{p.mouldLife1}</Label>
            <Input id="ccm-ml1" type="number" value={form.mouldLife1} onChange={set("mouldLife1")} data-testid="input-ccm-ml1" />
          </div>
          <div>
            <Label htmlFor="ccm-ml2">{p.mouldLife2}</Label>
            <Input id="ccm-ml2" type="number" value={form.mouldLife2} onChange={set("mouldLife2")} data-testid="input-ccm-ml2" />
          </div>
          <div>
            <Label htmlFor="ccm-ladle">{p.ladleNo}</Label>
            <Input id="ccm-ladle" value={form.ladleNo} onChange={set("ladleNo")} data-testid="input-ccm-ladle" />
          </div>
          <div>
            <Label htmlFor="ccm-opening">{p.ladleOpening}</Label>
            <Input id="ccm-opening" value={form.ladleOpening} onChange={set("ladleOpening")} data-testid="input-ccm-opening" />
          </div>
          <div>
            <Label htmlFor="ccm-tundish">{p.tundishNo}</Label>
            <Input id="ccm-tundish" value={form.tundishNo} onChange={set("tundishNo")} data-testid="input-ccm-tundish" />
          </div>
          <div>
            <Label htmlFor="ccm-ttype">{p.tundishType}</Label>
            <Input id="ccm-ttype" value={form.tundishType} onChange={set("tundishType")} data-testid="input-ccm-ttype" />
          </div>
          <div>
            <Label htmlFor="ccm-seq">{p.sequence}</Label>
            <Input id="ccm-seq" type="number" value={form.sequence} onChange={set("sequence")} data-testid="input-ccm-seq" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.buttons.cancel}</Button>
          <Button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} data-testid="btn-ccm-submit">
            {t.buttons.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Section Config Card ─────────────────────────────────────────────────────
function SectionConfig({
  section,
  label,
  icon: Icon,
  description,
  webhookPath,
  webhookCustomUrl,
  setting,
  onSave,
  saving,
  onManualEntry,
}: {
  section: SectionKey;
  label: string;
  icon: React.ElementType;
  description: string;
  webhookPath: string;
  webhookCustomUrl?: string;
  setting: SteelSettings | undefined;
  onSave: (section: string, data: { webhookSecret?: string; enabled?: boolean; notes?: string }) => void;
  saving: boolean;
  onManualEntry: () => void;
}) {
  const [secret, setSecret] = useState(setting?.webhookSecret || "");
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(setting?.enabled ?? true);
  const [notes, setNotes] = useState(setting?.notes || "");
  const { t } = useLanguage();
  const p = t.production;

  const hasChanged =
    secret !== (setting?.webhookSecret || "") ||
    enabled !== (setting?.enabled ?? true) ||
    notes !== (setting?.notes || "");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              data-testid={`switch-enabled-${section}`}
            />
            <Badge variant={enabled ? "default" : "secondary"}>
              {enabled ? p.active : p.inactive}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <WebhookUrl path={webhookPath} customUrl={webhookCustomUrl} label={p.webhookUrl} />

        <div className="space-y-1.5">
          <Label htmlFor={`secret-${section}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {p.sharedSecret}
          </Label>
          <div className="relative flex-1">
            <Input
              id={`secret-${section}`}
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder={p.secretPlaceholder}
              className="pr-10 font-mono text-sm"
              data-testid={`input-secret-${section}`}
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Power Automate: <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;secret&gt;</code> {t.common?.or || "or"} <code className="bg-muted px-1 rounded">?token=&lt;secret&gt;</code>
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`notes-${section}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {p.notes}
          </Label>
          <Input
            id={`notes-${section}`}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional notes"
            data-testid={`input-notes-${section}`}
          />
        </div>

        {setting?.lastReceivedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {p.lastReceived}: {new Date(setting.lastReceivedAt).toLocaleString()}
          </div>
        )}

        {setting?.lastError && (
          <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{p.lastError}: {setting.lastError}</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onSave(section, { webhookSecret: secret, enabled, notes })}
            disabled={saving || !hasChanged}
            data-testid={`btn-save-${section}`}
          >
            {saving ? "..." : p.saveSettings}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onManualEntry}
            data-testid={`btn-manual-${section}`}
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {p.manualEntry}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductionConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const p = t.production;
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState<SectionKey | null>(null);

  const { data: settings = [], isLoading } = useQuery<SteelSettings[]>({
    queryKey: ["/api/production/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: ({ section, data }: { section: string; data: Record<string, unknown> }) =>
      apiRequest("PUT", `/api/production/settings/${section}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/settings"] });
      toast({ title: p.settingsSaved });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setSavingSection(null),
  });

  const handleSave = (section: string, data: Record<string, unknown>) => {
    setSavingSection(section);
    saveMutation.mutate({ section, data });
  };

  const getSetting = (section: string) => settings.find(s => s.section === section);

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">{t.common?.loading || "Loading..."}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.configTitle}
        description={p.configSubtitle}
      />

      <div className="grid gap-4">
        <SectionConfig
          section="rolling_mill"
          label={p.rollingMill}
          icon={Layers}
          description="Receives shift production reports (tons, billets, breakdown, coble cut, etc.)"
          webhookPath="rolling-mill"
          webhookCustomUrl="/api/rolling-mill/webhook"
          setting={getSetting("rolling_mill")}
          onSave={handleSave}
          saving={savingSection === "rolling_mill"}
          onManualEntry={() => setManualOpen("rolling_mill")}
        />
        <SectionConfig
          section="sms"
          label={p.sms}
          icon={Zap}
          description="Receives heat reports (heat no., tap-to-tap, temperatures, kWh, etc.)"
          webhookPath="sms"
          setting={getSetting("sms")}
          onSave={handleSave}
          saving={savingSection === "sms"}
          onManualEntry={() => setManualOpen("sms")}
        />
        <SectionConfig
          section="ccm"
          label={p.ccm}
          icon={Factory}
          description="Receives casting reports (billets, strands, mould life, sequence, etc.)"
          webhookPath="ccm"
          setting={getSetting("ccm")}
          onSave={handleSave}
          saving={savingSection === "ccm"}
          onManualEntry={() => setManualOpen("ccm")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{p.howToConfigure}</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>1. {p.guideStep1}</p>
          <p>2. {p.guideStep2}</p>
          <p>3. {p.guideStep3}</p>
          <p>4. {p.guideStep4}</p>
          <p className="pt-1">
            Format: <code className="bg-muted px-1 rounded">Shift: A</code>, <code className="bg-muted px-1 rounded">Tons: 120.5</code>, <code className="bg-muted px-1 rounded">Date: 2025-04-14</code>
          </p>
        </CardContent>
      </Card>

      <RollingMillEntryDialog open={manualOpen === "rolling_mill"} onOpenChange={v => !v && setManualOpen(null)} />
      <SmsEntryDialog open={manualOpen === "sms"} onOpenChange={v => !v && setManualOpen(null)} />
      <CcmEntryDialog open={manualOpen === "ccm"} onOpenChange={v => !v && setManualOpen(null)} />
    </div>
  );
}
