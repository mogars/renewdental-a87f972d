import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface CalendarSettings {
  firstDayOfWeek: number;
  dayStartHour: number;
  dayEndHour: number;
  showWeekNumbers: boolean;
  defaultView: "day" | "week" | "month";
  colorByDoctor: boolean;
  colorByTreatment: boolean;
  showWeekends: boolean;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  firstDayOfWeek: 1,
  dayStartHour: 8,
  dayEndHour: 20,
  showWeekNumbers: false,
  defaultView: "week",
  colorByDoctor: true,
  colorByTreatment: false,
  showWeekends: true,
};

const STORAGE_KEY = "calendar_display_settings";

export const CalendarDisplaySettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<CalendarSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load calendar settings:", e);
    }
    setIsLoading(false);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      toast({ title: "Salvat", description: "Setările calendarului au fost actualizate." });
    } catch (e) {
      toast({ title: "Eroare", description: "Nu s-au putut salva setările.", variant: "destructive" });
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Prima Zi a Săptămânii</Label>
          <Select
            value={settings.firstDayOfWeek.toString()}
            onValueChange={(value) => setSettings(prev => ({ ...prev, firstDayOfWeek: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Duminică</SelectItem>
              <SelectItem value="1">Luni</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vizualizare Implicită</Label>
          <Select
            value={settings.defaultView}
            onValueChange={(value: "day" | "week" | "month") => setSettings(prev => ({ ...prev, defaultView: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Zi</SelectItem>
              <SelectItem value="week">Săptămână</SelectItem>
              <SelectItem value="month">Lună</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ora de Start</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={settings.dayStartHour}
              onChange={(e) => setSettings(prev => ({ ...prev, dayStartHour: parseInt(e.target.value) || 0 }))}
            />
            <p className="text-xs text-muted-foreground">
              Prima oră afișată în calendar
            </p>
          </div>
          <div className="space-y-2">
            <Label>Ora de Sfârșit</Label>
            <Input
              type="number"
              min={1}
              max={24}
              value={settings.dayEndHour}
              onChange={(e) => setSettings(prev => ({ ...prev, dayEndHour: parseInt(e.target.value) || 24 }))}
            />
            <p className="text-xs text-muted-foreground">
              Ultima oră afișată în calendar
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Afișează Numerele Săptămânilor</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Arată numărul săptămânii în calendar
            </p>
          </div>
          <Switch
            checked={settings.showWeekNumbers}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showWeekNumbers: checked }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Colorează după Doctor</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Programările au culori diferite pentru fiecare doctor
            </p>
          </div>
          <Switch
            checked={settings.colorByDoctor}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, colorByDoctor: checked, colorByTreatment: checked ? false : prev.colorByTreatment }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Colorează după Tratament</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Programările au culori diferite pentru fiecare tip de tratament
            </p>
          </div>
          <Switch
            checked={settings.colorByTreatment}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, colorByTreatment: checked, colorByDoctor: checked ? false : prev.colorByDoctor }))}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Afișează Weekenduri</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Arată zilele de weekend (sâmbătă și duminică) în calendar
            </p>
          </div>
          <Switch
            checked={settings.showWeekends}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, showWeekends: checked }))}
          />
        </div>
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
        Salvează Setările
      </Button>
    </div>
  );
};

export default CalendarDisplaySettings;
