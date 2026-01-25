import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tables } from "@/integrations/supabase/types";

type Doctor = Tables<"doctors">;
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

// Color palette for different doctors
const DOCTOR_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-l-blue-500" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", border: "border-l-emerald-500" },
  { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", border: "border-l-purple-500" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", border: "border-l-amber-500" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300", border: "border-l-rose-500" },
  { bg: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-700 dark:text-cyan-300", border: "border-l-cyan-500" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", border: "border-l-orange-500" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-l-indigo-500" },
];

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

  // Fetch doctors to create color mapping
  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data as Doctor[];
    },
  });

  // Create a color map for doctors
  const getDoctorColor = (doctorId: string | null) => {
    if (!doctorId || !doctors) return DOCTOR_COLORS[0];
    const index = doctors.findIndex((d) => d.id === doctorId);
    return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
  };

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId || !doctors) return "";
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor ? `Dr. ${doctor.first_name.charAt(0)}. ${doctor.last_name}` : "";
  };

  const getAppointmentsForDayAndHour = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      if (!isSameDay(parseISO(apt.appointment_date), date)) return false;
      const aptHour = parseInt(apt.start_time.split(":")[0], 10);
      return aptHour === hour;
    });
  };

  const getAppointmentPosition = (startTime: string, endTime: string, index: number, total: number) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startOffset = (startMin / 60) * 100;
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    const height = (duration / 60) * 100;
    
    // Calculate width and position for side-by-side display
    const width = total > 1 ? 100 / total : 100;
    const left = index * width;
    
    return { 
      top: `${startOffset}%`, 
      height: `${Math.max(height, 50)}%`,
      width: `${width - 1}%`,
      left: `${left}%`
    };
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Doctor color legend */}
        {doctors && doctors.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 px-2">
            <span className="text-xs font-medium text-muted-foreground">Doctors:</span>
            {doctors.map((doctor, index) => {
              const colors = DOCTOR_COLORS[index % DOCTOR_COLORS.length];
              return (
                <div key={doctor.id} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded-sm", colors.bg, "border-l-2", colors.border)} />
                  <span className={cn("text-xs font-medium", colors.text)}>
                    Dr. {doctor.first_name.charAt(0)}. {doctor.last_name}
                  </span>
                </div>
              );
            })}
          </div>
        )}

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
                const totalAppointments = hourAppointments.length;

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
                      className="absolute right-1 top-1 z-10 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => onAddAppointment(day)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    {hourAppointments.map((apt, index) => {
                      const position = getAppointmentPosition(apt.start_time, apt.end_time, index, totalAppointments);
                      const doctorColors = getDoctorColor(apt.doctor_id);
                      const doctorName = getDoctorName(apt.doctor_id);
                      
                      return (
                        <button
                          key={apt.id}
                          onClick={() => onEditAppointment(apt.id)}
                          style={position}
                          className={cn(
                            "absolute overflow-hidden rounded-r px-1.5 py-0.5 text-left text-xs transition-all hover:z-20 hover:shadow-md border-l-2",
                            apt.status === "completed"
                              ? "bg-success/20 text-success border-l-success hover:bg-success/30"
                              : apt.status === "cancelled"
                              ? "bg-destructive/20 text-destructive border-l-destructive hover:bg-destructive/30"
                              : cn(doctorColors.bg, doctorColors.text, doctorColors.border)
                          )}
                        >
                          <div className="font-medium truncate">
                            {apt.patients?.first_name} {apt.patients?.last_name?.charAt(0)}.
                          </div>
                          {totalAppointments > 1 && doctorName && (
                            <div className="text-[9px] font-semibold opacity-90 truncate">
                              {doctorName}
                            </div>
                          )}
                          <div className="text-[10px] opacity-75 truncate">
                            {apt.start_time.slice(0, 5)}
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
