import { useState, useEffect } from "react";
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

const STORAGE_KEY = "working_hours_settings";

export const WorkingHoursSettings = () => {
  const { toast } = useToast();
  const [hours, setHours] = useState<WorkingHours>(DEFAULT_HOURS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHours(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load working hours:", e);
    }
    setIsLoading(false);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hours));
      toast({ title: "Salvat", description: "Programul de lucru a fost actualizat." });
    } catch (e) {
      toast({ title: "Eroare", description: "Nu s-a putut salva programul.", variant: "destructive" });
    }
    setIsSaving(false);
  };

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
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? (
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
