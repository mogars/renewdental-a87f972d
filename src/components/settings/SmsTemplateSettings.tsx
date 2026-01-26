import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

const DEFAULT_TEMPLATE = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";

const PLACEHOLDERS = [
  { key: "{patient_name}", description: "Patient's first name" },
  { key: "{appointment_date}", description: "Formatted appointment date" },
  { key: "{appointment_time}", description: "Appointment time (HH:MM)" },
];

const STORAGE_KEY = "sms_template";

export function SmsTemplateSettings() {
  const { toast } = useToast();
  const [template, setTemplate] = useState("");
  const [savedTemplate, setSavedTemplate] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const value = stored || DEFAULT_TEMPLATE;
      setTemplate(value);
      setSavedTemplate(value);
    } catch (e) {
      console.error("Failed to load SMS template:", e);
      setTemplate(DEFAULT_TEMPLATE);
      setSavedTemplate(DEFAULT_TEMPLATE);
    }
    setIsLoading(false);
  }, []);

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    setIsDirty(value !== savedTemplate);
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, template);
      setSavedTemplate(template);
      setIsDirty(false);
      toast({
        title: "Template saved",
        description: "Your SMS template has been updated successfully.",
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to save SMS template.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const handleReset = () => {
    setTemplate(savedTemplate);
    setIsDirty(false);
  };

  const insertPlaceholder = (placeholder: string) => {
    setTemplate((prev) => prev + placeholder);
    setIsDirty(true);
  };

  // Calculate character count
  const charCount = template.length;
  const smsCount = Math.ceil(charCount / 160);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sms-template">Șablon Mesaj</Label>
        <Textarea
          id="sms-template"
          value={template}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="min-h-[120px] font-mono text-sm"
          placeholder="Introdu șablonul SMS..."
        />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {charCount} caractere ({smsCount} SMS{smsCount !== 1 ? "-uri" : ""})
          </span>
          {isDirty && (
            <span className="text-amber-500 dark:text-amber-400">Modificări nesalvate</span>
          )}
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

      <div className="flex gap-2 pt-2">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvează Șablon
        </Button>
        {isDirty && (
          <Button variant="outline" onClick={handleReset}>
            Anulează
          </Button>
        )}
      </div>
    </div>
  );
}
