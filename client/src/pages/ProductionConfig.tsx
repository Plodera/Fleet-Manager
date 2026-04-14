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
import { Factory, Zap, Layers, Eye, EyeOff, Copy, Check, Clock } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type SteelSettings = {
  id: number;
  section: string;
  webhookSecret: string;
  enabled: boolean;
  lastReceivedAt: string | null;
  updatedAt: string;
};

function maskSecret(s: string): string {
  if (!s) return "";
  if (s.length <= 8) return "••••••••";
  return s.slice(0, 4) + "••••••••" + s.slice(-4);
}

function WebhookUrl({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const origin = window.location.origin;
  const url = `${origin}/api/production/webhook/${path}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="flex items-center gap-2 mt-1">
      <code className="flex-1 text-xs bg-muted rounded px-2 py-1.5 font-mono text-muted-foreground break-all">{url}</code>
      <Button size="icon" variant="ghost" onClick={handleCopy} title="Copy URL" data-testid={`btn-copy-${path}`}>
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </Button>
    </div>
  );
}

function SectionConfig({
  section,
  label,
  icon: Icon,
  description,
  webhookPath,
  setting,
  onSave,
  saving,
}: {
  section: string;
  label: string;
  icon: React.ElementType;
  description: string;
  webhookPath: string;
  setting: SteelSettings | undefined;
  onSave: (section: string, data: { webhookSecret?: string; enabled?: boolean }) => void;
  saving: boolean;
}) {
  const [secret, setSecret] = useState(setting?.webhookSecret || "");
  const [showSecret, setShowSecret] = useState(false);
  const [enabled, setEnabled] = useState(setting?.enabled ?? true);
  const { t } = useLanguage();

  const hasChanged = secret !== (setting?.webhookSecret || "") || enabled !== (setting?.enabled ?? true);

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
              {enabled ? (t.labels?.active || "Active") : (t.labels?.inactive || "Inactive")}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Webhook URL
          </Label>
          <WebhookUrl path={webhookPath} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`secret-${section}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Shared Secret (Bearer Token)
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id={`secret-${section}`}
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="Leave empty to disable authentication"
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
          </div>
          <p className="text-xs text-muted-foreground">
            Power Automate sends this as <code className="bg-muted px-1 rounded">Authorization: Bearer &lt;secret&gt;</code> or <code className="bg-muted px-1 rounded">?token=&lt;secret&gt;</code>
          </p>
        </div>

        {setting?.lastReceivedAt && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Last received: {new Date(setting.lastReceivedAt).toLocaleString()}
          </div>
        )}

        <Button
          size="sm"
          onClick={() => onSave(section, { webhookSecret: secret, enabled })}
          disabled={saving || !hasChanged}
          data-testid={`btn-save-${section}`}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function ProductionConfig() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const { data: settings = [], isLoading } = useQuery<SteelSettings[]>({
    queryKey: ["/api/production/settings"],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ section, data }: { section: string; data: any }) => {
      return apiRequest("PUT", `/api/production/settings/${section}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/production/settings"] });
      toast({ title: "Saved", description: "Settings updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
    onSettled: () => setSavingSection(null),
  });

  const handleSave = (section: string, data: any) => {
    setSavingSection(section);
    saveMutation.mutate({ section, data });
  };

  const getSetting = (section: string) => settings.find(s => s.section === section);

  if (isLoading) return <div className="text-muted-foreground text-sm p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.production?.configTitle || "Steel Production Config"}
        description={t.production?.configSubtitle || "Configure Power Automate webhook endpoints for SMS, CCM, and Rolling Mill"}
      />

      <div className="grid gap-4">
        <SectionConfig
          section="rolling_mill"
          label={t.production?.rollingMill || "Rolling Mill"}
          icon={Layers}
          description="Receives shift production reports (tons, billets, breakdown, coble cut, etc.)"
          webhookPath="rolling-mill"
          setting={getSetting("rolling_mill")}
          onSave={handleSave}
          saving={savingSection === "rolling_mill"}
        />
        <SectionConfig
          section="sms"
          label={t.production?.sms || "Steel Melting Shop (SMS)"}
          icon={Zap}
          description="Receives heat reports (heat no., tap-to-tap, temperatures, kWh, etc.)"
          webhookPath="sms"
          setting={getSetting("sms")}
          onSave={handleSave}
          saving={savingSection === "sms"}
        />
        <SectionConfig
          section="ccm"
          label={t.production?.ccm || "Continuous Casting Machine (CCM)"}
          icon={Factory}
          description="Receives casting reports (billets, strands, mould life, sequence, etc.)"
          webhookPath="ccm"
          setting={getSetting("ccm")}
          onSave={handleSave}
          saving={savingSection === "ccm"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How to configure Power Automate</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>1. Create a Power Automate flow triggered by "When a new message is posted in a channel".</p>
          <p>2. Add an HTTP action pointing to the webhook URL above.</p>
          <p>3. Set Method to POST, Body to the message text (use the Teams <code className="bg-muted px-1 rounded">body/content</code> dynamic value).</p>
          <p>4. Optionally add an Authorization header: <code className="bg-muted px-1 rounded">Bearer &lt;your-secret&gt;</code></p>
          <p>5. The message should contain key: value pairs on each line (e.g. <code className="bg-muted px-1 rounded">Shift: A</code>, <code className="bg-muted px-1 rounded">Tons: 120.5</code>).</p>
        </CardContent>
      </Card>
    </div>
  );
}
