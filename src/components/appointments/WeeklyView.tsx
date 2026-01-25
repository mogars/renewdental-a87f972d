import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type AppointmentWithPatient = Tables<"appointments"> & {
  patients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

interface WeeklyViewProps {
  currentDate: Date;
  appointments: AppointmentWithPatient[];
  onAddAppointment: (date: Date) => void;
  onEditAppointment: (appointmentId: string) => void;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

export const WeeklyView = ({
  currentDate,
  appointments,
  onAddAppointment,
  onEditAppointment,
}: WeeklyViewProps) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getAppointmentsForDayAndHour = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      if (!isSameDay(parseISO(apt.appointment_date), date)) return false;
      const aptHour = parseInt(apt.start_time.split(":")[0], 10);
      return aptHour === hour;
    });
  };

  const getAppointmentPosition = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startOffset = (startMin / 60) * 100;
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    const height = (duration / 60) * 100;
    return { top: `${startOffset}%`, height: `${Math.max(height, 50)}%` };
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header with days */}
        <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border">
          <div className="border-r border-border p-2" />
          {days.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "border-r border-border p-2 text-center last:border-r-0",
                  isToday && "bg-primary/10"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                    isToday && "bg-primary text-primary-foreground"
                  )}
                >
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-border"
            >
              <div className="border-r border-border p-2 text-right text-xs text-muted-foreground">
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
              {days.map((day) => {
                const hourAppointments = getAppointmentsForDayAndHour(day, hour);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "group relative h-16 border-r border-border last:border-r-0",
                      isToday && "bg-primary/5"
                    )}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => onAddAppointment(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    {hourAppointments.map((apt, index) => {
                      const position = getAppointmentPosition(apt.start_time, apt.end_time);
                      return (
                        <button
                          key={apt.id}
                          onClick={() => onEditAppointment(apt.id)}
                          style={{
                            ...position,
                            left: `${index * 5}%`,
                            width: `${95 - index * 5}%`,
                          }}
                          className={cn(
                            "absolute mx-0.5 overflow-hidden rounded px-1.5 py-0.5 text-left text-xs transition-colors",
                            apt.status === "completed"
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : apt.status === "cancelled"
                              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          )}
                        >
                          <div className="font-medium truncate">
                            {apt.patients?.first_name} {apt.patients?.last_name}
                          </div>
                          <div className="text-[10px] opacity-75 truncate">
                            {apt.start_time.slice(0, 5)} - {apt.end_time.slice(0, 5)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
