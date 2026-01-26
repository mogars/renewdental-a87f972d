import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface AppointmentDefaults {
  defaultDuration: number;
  bufferTime: number;
  timeSlotInterval: number;
  allowOverlapping: boolean;
  maxPerDay: number;
  reminderDaysBefore: number;
}

const DEFAULT_SETTINGS: AppointmentDefaults = {
  defaultDuration: 60,
  bufferTime: 0,
  timeSlotInterval: 15,
  allowOverlapping: false,
  maxPerDay: 20,
  reminderDaysBefore: 1,
};

export const AppointmentDefaultsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AppointmentDefaults>(DEFAULT_SETTINGS);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ["appointment-defaults-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "appointment_defaults")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(data.value) } as AppointmentDefaults;
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    },
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("app_settings")
        .upsert({
          key: "appointment_defaults",
          value: JSON.stringify(settings),
          description: "Default appointment settings",
        }, { onConflict: "key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointment-defaults-settings"] });
      toast({ title: "Salvat", description: "Setările programărilor au fost actualizate." });
    },
    onError: () => {
      toast({ title: "Eroare", description: "Nu s-au putut salva setările.", variant: "destructive" });
    },
  });

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
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Durată Implicită</Label>
            <span className="text-sm font-medium">{settings.defaultDuration} min</span>
          </div>
          <Slider
            value={[settings.defaultDuration]}
            onValueChange={([value]) => setSettings(prev => ({ ...prev, defaultDuration: value }))}
            min={15}
            max={180}
            step={15}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Durata standard pentru programări noi
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Timp Tampon Între Programări</Label>
            <span className="text-sm font-medium">{settings.bufferTime} min</span>
          </div>
          <Slider
            value={[settings.bufferTime]}
            onValueChange={([value]) => setSettings(prev => ({ ...prev, bufferTime: value }))}
            min={0}
            max={30}
            step={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Pauză automată între programări consecutive
          </p>
        </div>

        <div className="space-y-2">
          <Label>Interval Sloturi Timp</Label>
          <Select
            value={settings.timeSlotInterval.toString()}
            onValueChange={(value) => setSettings(prev => ({ ...prev, timeSlotInterval: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minute</SelectItem>
              <SelectItem value="10">10 minute</SelectItem>
              <SelectItem value="15">15 minute</SelectItem>
              <SelectItem value="30">30 minute</SelectItem>
              <SelectItem value="60">60 minute</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Intervalul de timp pentru selectarea orei
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Programări Maxime pe Zi</Label>
            <span className="text-sm font-medium">{settings.maxPerDay}</span>
          </div>
          <Slider
            value={[settings.maxPerDay]}
            onValueChange={([value]) => setSettings(prev => ({ ...prev, maxPerDay: value }))}
            min={5}
            max={50}
            step={5}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Limita de programări permise într-o zi
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Reminder SMS cu Zile Înainte</Label>
            <span className="text-sm font-medium">{settings.reminderDaysBefore} {settings.reminderDaysBefore === 1 ? 'zi' : 'zile'}</span>
          </div>
          <Slider
            value={[settings.reminderDaysBefore]}
            onValueChange={([value]) => setSettings(prev => ({ ...prev, reminderDaysBefore: value }))}
            min={1}
            max={7}
            step={1}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Cu câte zile înainte se trimite reminder-ul
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label>Permite Suprapunerea Programărilor</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Permite programări în același interval orar
            </p>
          </div>
          <Switch
            checked={settings.allowOverlapping}
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowOverlapping: checked }))}
          />
        </div>
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
        Salvează Setările
      </Button>
    </div>
  );
};

export default AppointmentDefaultsSettings;
