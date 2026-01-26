import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CalendarSettings {
  firstDayOfWeek: 0 | 1;
  dayStartHour: number;
  dayEndHour: number;
  showWeekNumbers: boolean;
  defaultView: "day" | "week" | "month";
  colorByDoctor: boolean;
  colorByTreatment: boolean;
}

const DEFAULT_SETTINGS: CalendarSettings = {
  firstDayOfWeek: 1,
  dayStartHour: 8,
  dayEndHour: 20,
  showWeekNumbers: false,
  defaultView: "week",
  colorByDoctor: true,
  colorByTreatment: false,
};

export const useCalendarSettings = () => {
  return useQuery({
    queryKey: ["calendar-display-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "calendar_display")
        .maybeSingle();
      
      if (error) throw error;
      
      if (data?.value) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(data.value) } as CalendarSettings;
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
      return DEFAULT_SETTINGS;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export { DEFAULT_SETTINGS as DEFAULT_CALENDAR_SETTINGS };
