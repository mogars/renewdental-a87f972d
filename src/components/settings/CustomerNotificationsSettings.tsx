import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { config as apiConfig } from "@/config/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, MessageSquare, Clock, Bell, Settings2 } from "lucide-react";

interface ReminderConfig {
  enabled24h: boolean;
  enabled2h: boolean;
  enabled1h: boolean;
  daysBefore: number;
  template24h: string;
  template2h: string;
  template1h: string;
  textbeeApiKey: string;
  textbeeDeviceId: string;
}

const DEFAULT_CONFIG: ReminderConfig = {
  enabled24h: true,
  enabled2h: true,
  enabled1h: true,
  daysBefore: 1,
  template24h: "Bună ziua {patient_name}! Vă reamintim că aveți o programare la clinică în data de {appointment_date} la ora {appointment_time}. Răspundeți cu DA pentru confirmare.",
  template2h: "Bună {patient_name}! Programarea dvs. este în 2 ore, la {appointment_time}. Vă așteptăm!",
  template1h: "Bună {patient_name}! Programarea dvs. este în 1 oră, la {appointment_time}. Ne vedem curând!",
  textbeeApiKey: "",
  textbeeDeviceId: "",
};

const PLACEHOLDERS = [
  { key: "{patient_name}", description: "Numele pacientului" },
  { key: "{appointment_date}", description: "Data programării" },
  { key: "{appointment_time}", description: "Ora programării (HH:MM)" },
];

const STORAGE_KEY = "sms_reminder_config";

export function CustomerNotificationsSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ReminderConfig>(DEFAULT_CONFIG);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<"24h" | "2h" | "1h">("24h");

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Load from localStorage first (legacy/UI state)
        const stored = localStorage.getItem(STORAGE_KEY);
        let currentConfig = stored ? { ...DEFAULT_CONFIG, ...JSON.parse(stored) } : DEFAULT_CONFIG;

        // Load sensitive keys from backend
        try {
          const apiSettings = await Promise.all([
            fetch(`${apiConfig.awsApiUrl}/app-settings/textbee_api_key`).then(res => res.json()),
            fetch(`${apiConfig.awsApiUrl}/app-settings/textbee_device_id`).then(res => res.json())
          ]);

          console.log("[DEBUG] Loaded API Settings:", apiSettings);

          if (apiSettings[0]?.[0]?.value) currentConfig.textbeeApiKey = apiSettings[0][0].value;
          if (apiSettings[1]?.[0]?.value) currentConfig.textbeeDeviceId = apiSettings[1][0].value;
        } catch (err) {
          console.warn("Failed to fetch TextBee settings from backend:", err);
        }

        setConfig(currentConfig);
      } catch (e) {
        console.error("Failed to load reminder config:", e);
      }
      setIsLoading(false);
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save UI config to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Save sensitive keys to backend
      console.log("[DEBUG] Saving TextBee keys to backend...");
      const response = await fetch(`${apiConfig.awsApiUrl}/app-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { key: 'textbee_api_key', value: config.textbeeApiKey, description: 'TextBee API Key' },
          { key: 'textbee_device_id', value: config.textbeeDeviceId, description: 'TextBee Device ID' }
        ])
      });

      console.log("[DEBUG] Backend Save Status:", response.status);

      if (!response.ok) throw new Error("Failed to save to backend");

      setIsDirty(false);
      toast({ title: "Salvat", description: "Configurația notificărilor a fost actualizată." });
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Eroare", description: "Nu s-a putut salva configurația.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const updateConfig = <K extends keyof ReminderConfig>(key: K, value: ReminderConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const insertPlaceholder = (placeholder: string) => {
    const templateKey = `template${activeTemplate.toUpperCase()}` as keyof ReminderConfig;
    if (typeof config[templateKey] === 'string') {
      updateConfig(templateKey as any, config[templateKey] + placeholder);
    }
  };

  const getActiveTemplate = () => {
    switch (activeTemplate) {
      case "24h": return config.template24h;
      case "2h": return config.template2h;
      case "1h": return config.template1h;
    }
  };

  const setActiveTemplateValue = (value: string) => {
    switch (activeTemplate) {
      case "24h": updateConfig("template24h", value); break;
      case "2h": updateConfig("template2h", value); break;
      case "1h": updateConfig("template1h", value); break;
    }
  };

  const charCount = getActiveTemplate().length;
  const smsCount = Math.ceil(charCount / 160);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TextBee Config */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Configurare TextBee</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="textbee-api-key">API Key TextBee</Label>
            <Input
              id="textbee-api-key"
              type="password"
              value={config.textbeeApiKey}
              onChange={(e) => updateConfig("textbeeApiKey", e.target.value)}
              placeholder="Introdu API Key..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textbee-device-id">Device ID TextBee</Label>
            <Input
              id="textbee-device-id"
              value={config.textbeeDeviceId}
              onChange={(e) => updateConfig("textbeeDeviceId", e.target.value)}
              placeholder="Introdu Device ID..."
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Reminder Toggles */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Tipuri de Reminder-e</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Reminder cu 1 zi înainte</Label>
              <p className="text-sm text-muted-foreground">
                Trimis cu {config.daysBefore} {config.daysBefore === 1 ? 'zi' : 'zile'} înainte de programare
              </p>
            </div>
            <Switch
              checked={config.enabled24h}
              onCheckedChange={(checked) => updateConfig("enabled24h", checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Reminder cu 2 ore înainte</Label>
              <p className="text-sm text-muted-foreground">
                Trimis cu 2 ore înainte de programare
              </p>
            </div>
            <Switch
              checked={config.enabled2h}
              onCheckedChange={(checked) => updateConfig("enabled2h", checked)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Reminder cu 1 oră înainte</Label>
              <p className="text-sm text-muted-foreground">
                Trimis cu 1 oră înainte de programare
              </p>
            </div>
            <Switch
              checked={config.enabled1h}
              onCheckedChange={(checked) => updateConfig("enabled1h", checked)}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Days Before Setting */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Timing Reminder 24h</h3>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Reminder-ul de 24h se trimite cu:</Label>
            <span className="text-sm font-medium">{config.daysBefore} {config.daysBefore === 1 ? 'zi' : 'zile'} înainte</span>
          </div>
          <Slider
            value={[config.daysBefore]}
            onValueChange={([value]) => updateConfig("daysBefore", value)}
            min={1}
            max={7}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cu câte zile înainte se trimite primul reminder
          </p>
        </div>
      </div>

      <Separator />

      {/* SMS Templates */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-medium">Șabloane SMS</h3>
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeTemplate === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTemplate("24h")}
          >
            24h înainte
          </Button>
          <Button
            variant={activeTemplate === "2h" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTemplate("2h")}
          >
            2h înainte
          </Button>
          <Button
            variant={activeTemplate === "1h" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTemplate("1h")}
          >
            1h înainte
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sms-template">
            Șablon pentru reminder-ul de {activeTemplate === "24h" ? "24 ore" : activeTemplate === "2h" ? "2 ore" : "1 oră"}
          </Label>
          <Textarea
            id="sms-template"
            value={getActiveTemplate()}
            onChange={(e) => setActiveTemplateValue(e.target.value)}
            className="min-h-[100px] font-mono text-sm"
            placeholder="Introdu șablonul SMS..."
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {charCount} caractere ({smsCount} SMS{smsCount !== 1 ? "-uri" : ""})
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Placeholder-e Disponibile</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Click pe un placeholder pentru a-l insera în șablon
          </p>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS.map(({ key, description }) => (
              <Badge
                key={key}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80"
                onClick={() => insertPlaceholder(key)}
                title={description}
              >
                {key}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvează Configurația
        </Button>
      </div>

      {isDirty && (
        <p className="text-sm text-amber-500 dark:text-amber-400 text-center">
          Ai modificări nesalvate
        </p>
      )}
    </div>
  );
}

export default CustomerNotificationsSettings;
