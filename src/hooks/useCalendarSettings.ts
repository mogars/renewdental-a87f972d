import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import type { AppSetting } from "@/types/database";

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

const STORAGE_KEY = "calendar_display_settings";

export const useCalendarSettings = () => {
  return useQuery({
    queryKey: ["calendar-display-settings"],
    queryFn: async () => {
      try {
        // Try to get from localStorage first
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } as CalendarSettings;
        }
        
        // Fallback to API if localStorage is empty
        const data = await apiGet<AppSetting[]>("/app-settings/calendar_display");
        
        if (data && data.length > 0 && data[0].value) {
          try {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data[0].value) } as CalendarSettings;
          } catch {
            return DEFAULT_SETTINGS;
          }
        }
        return DEFAULT_SETTINGS;
      } catch {
        return DEFAULT_SETTINGS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
};

export { DEFAULT_SETTINGS as DEFAULT_CALENDAR_SETTINGS };
