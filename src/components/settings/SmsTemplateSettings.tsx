import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare, Save } from "lucide-react";

const DEFAULT_TEMPLATE = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";

const PLACEHOLDERS = [
  { key: "{patient_name}", description: "Patient's first name" },
  { key: "{appointment_date}", description: "Formatted appointment date" },
  { key: "{appointment_time}", description: "Appointment time (HH:MM)" },
];

export function SmsTemplateSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const { data: savedTemplate, isLoading } = useQuery({
    queryKey: ["app-settings", "sms_template"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "sms_template")
        .maybeSingle();

      if (error) throw error;
      return data?.value || DEFAULT_TEMPLATE;
    },
  });

  useEffect(() => {
    if (savedTemplate) {
      setTemplate(savedTemplate);
    }
  }, [savedTemplate]);

  const updateTemplate = useMutation({
    mutationFn: async (newTemplate: string) => {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: newTemplate })
        .eq("key", "sms_template");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings", "sms_template"] });
      setIsDirty(false);
      toast({
        title: "Template saved",
        description: "Your SMS template has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update template:", error);
      toast({
        title: "Error",
        description: "Failed to save SMS template. Make sure you have admin permissions.",
        variant: "destructive",
      });
    },
  });

  const handleTemplateChange = (value: string) => {
    setTemplate(value);
    setIsDirty(value !== savedTemplate);
  };

  const handleSave = () => {
    updateTemplate.mutate(template);
  };

  const handleReset = () => {
    setTemplate(savedTemplate || DEFAULT_TEMPLATE);
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
          disabled={!isDirty || updateTemplate.isPending}
        >
          {updateTemplate.isPending ? (
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
