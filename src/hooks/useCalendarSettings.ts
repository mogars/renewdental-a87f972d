import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";

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

interface SettingResponse {
  value: string;
}

export const useCalendarSettings = () => {
  return useQuery({
    queryKey: ["calendar-display-settings"],
    queryFn: async () => {
      try {
        const data = await apiGet<SettingResponse[]>("/app-settings/calendar_display");
        
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
