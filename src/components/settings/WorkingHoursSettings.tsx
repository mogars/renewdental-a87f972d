import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const DAYS = [
  { key: "monday", label: "Luni" },
  { key: "tuesday", label: "Marți" },
  { key: "wednesday", label: "Miercuri" },
  { key: "thursday", label: "Joi" },
  { key: "friday", label: "Vineri" },
  { key: "saturday", label: "Sâmbătă" },
  { key: "sunday", label: "Duminică" },
] as const;

const DEFAULT_HOURS: WorkingHours = {
  monday: { enabled: true, start: "09:00", end: "18:00" },
  tuesday: { enabled: true, start: "09:00", end: "18:00" },
  wednesday: { enabled: true, start: "09:00", end: "18:00" },
  thursday: { enabled: true, start: "09:00", end: "18:00" },
  friday: { enabled: true, start: "09:00", end: "18:00" },
  saturday: { enabled: false, start: "09:00", end: "14:00" },
  sunday: { enabled: false, start: "09:00", end: "14:00" },
};

export const WorkingHoursSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["working-hours-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "working_hours")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        try {
          return JSON.parse(data.value) as WorkingHours;
        } catch {
          return DEFAULT_HOURS;
        }
      }
      return DEFAULT_HOURS;
    },
  });

  useEffect(() => {
    if (settings) {
      setHours(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "working_hours",
          value: JSON.stringify(hours),
          description: "Clinic working hours schedule",
        }, { onConflict: "key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["working-hours-settings"] });
      toast({ title: "Salvat", description: "Programul de lucru a fost actualizat." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-a putut salva programul.", variant: "destructive" });
    },
  });

  const updateDay = (day: keyof WorkingHours, field: keyof DaySchedule, value: boolean | string) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4 rounded-lg border p-3">
            <div className="flex items-center gap-2 w-28">
              <Switch
                checked={hours[key].enabled}
                onCheckedChange={(checked) => updateDay(key, "enabled", checked)}
              />
              <Label className="font-medium">{label}</Label>
            </div>
            
            {hours[key].enabled ? (
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={hours[key].start}
                  onChange={(e) => updateDay(key, "start", e.target.value)}
                  className="w-32"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={hours[key].end}
                  onChange={(e) => updateDay(key, "end", e.target.value)}
                  className="w-32"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Închis</span>
            )}
          </div>
        ))}
      </div>

      <Button 
        onClick={() => saveMutation.mutate()} 
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvează Programul
      </Button>
    </div>
  );
};

export default WorkingHoursSettings;
