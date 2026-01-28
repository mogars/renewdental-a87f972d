import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Plus, Bell } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCalendarSettings } from "@/hooks/useCalendarSettings";
import type { AppointmentWithPatient, Doctor } from "@/types/database";

interface WeeklyViewProps {
  currentDate: Date;
  appointments: AppointmentWithPatient[];
  onAddAppointment: (date: Date, startTime?: string) => void;
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

// Treatment type colors
const TREATMENT_COLORS = [
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300", border: "border-l-teal-500" },
  { bg: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", border: "border-l-pink-500" },
  { bg: "bg-lime-100 dark:bg-lime-900/40", text: "text-lime-700 dark:text-lime-300", border: "border-l-lime-500" },
  { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300", border: "border-l-sky-500" },
  { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/40", text: "text-fuchsia-700 dark:text-fuchsia-300", border: "border-l-fuchsia-500" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-300", border: "border-l-yellow-500" },
];

export const WeeklyView = ({
  currentDate,
  appointments,
  onAddAppointment,
  onEditAppointment,
}: WeeklyViewProps) => {
  const { data: calendarSettings } = useCalendarSettings();

  const weekStartsOn = (calendarSettings?.firstDayOfWeek ?? 1) as 0 | 1;
  const dayStartHour = calendarSettings?.dayStartHour ?? 8;
  const dayEndHour = calendarSettings?.dayEndHour ?? 20;
  const colorByDoctor = calendarSettings?.colorByDoctor ?? true;
  const colorByTreatment = calendarSettings?.colorByTreatment ?? false;

  const HOURS = Array.from({ length: dayEndHour - dayStartHour }, (_, i) => i + dayStartHour);

  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Fetch doctors to create color mapping
  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      return apiGet<Doctor[]>("/doctors");
    },
  });

  // Collect unique treatment types
  const treatmentTypes = [...new Set(appointments.map(apt => apt.treatment_type).filter(Boolean))];

  // Create a color map for doctors
  const getDoctorColor = (doctorId: string | null) => {
    if (!doctorId || !doctors) return DOCTOR_COLORS[0];
    const index = doctors.findIndex((d) => d.id === doctorId);
    return DOCTOR_COLORS[index % DOCTOR_COLORS.length];
  };

  const getTreatmentColor = (treatmentType: string | null) => {
    if (!treatmentType) return TREATMENT_COLORS[0];
    const index = treatmentTypes.indexOf(treatmentType);
    return TREATMENT_COLORS[index % TREATMENT_COLORS.length];
  };

  const getAppointmentColor = (apt: AppointmentWithPatient) => {
    if (colorByTreatment && apt.treatment_type) {
      return getTreatmentColor(apt.treatment_type);
    }
    return getDoctorColor(apt.doctor_id);
  };

  const getDoctorName = (doctorId: string | null) => {
    if (!doctorId || !doctors) return "";
    const doctor = doctors.find((d) => d.id === doctorId);
    return doctor ? `Dr. ${doctor.first_name.charAt(0)}. ${doctor.last_name}` : "";
  };

  // Build per-day layout mapping that groups overlapping appointments
  const buildDayLayouts = () => {
    const layouts: Record<string, { index: number; total: number }> = {};

    // Helper to convert HH:MM to minutes since midnight
    const toMinutes = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    // Process each day separately
    days.forEach((day) => {
      const dayApts = appointments
        .filter((apt) => apt.appointment_date && isSameDay(parseISO(apt.appointment_date), day))
        .filter((apt) => apt.start_time && apt.end_time)
        .map((apt) => ({ ...apt, startMin: toMinutes(apt.start_time), endMin: toMinutes(apt.end_time) }))
        .sort((a, b) => a.startMin - b.startMin);

      // Split into overlapping groups (clusters)
      const groups: { apts: typeof dayApts }[] = [];
      dayApts.forEach((apt) => {
        const lastGroup = groups[groups.length - 1];
        if (!lastGroup) {
          groups.push({ apts: [apt] });
        } else {
          const groupEnd = Math.max(...lastGroup.apts.map((g) => g.endMin));
          if (apt.startMin <= groupEnd) {
            lastGroup.apts.push(apt);
          } else {
            groups.push({ apts: [apt] });
          }
        }
      });

      // For each group, assign columns using greedy interval partitioning
      groups.forEach((group) => {
        const columns: number[] = []; // stores endMin per column

        group.apts.forEach((apt) => {
          let placed = false;
          for (let i = 0; i < columns.length; i++) {
            if (apt.startMin >= columns[i]) {
              // place in this column
              layouts[apt.id] = { index: i, total: 0 } as any;
              columns[i] = apt.endMin;
              placed = true;
              break;
            }
          }
          if (!placed) {
            // new column
            columns.push(apt.endMin);
            layouts[apt.id] = { index: columns.length - 1, total: 0 } as any;
          }
        });

        // After assignment, set total columns for each appointment in the group
        const totalCols = columns.length;
        group.apts.forEach((apt) => {
          layouts[apt.id].total = totalCols;
        });
      });
    });

    return layouts;
  };

  const dayLayouts = buildDayLayouts();

  const getAppointmentPosition = (startTime: string, endTime: string, index: number, total: number) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startOffset = (startMin / 60) * 100;
    const duration = (endHour - startHour) * 60 + (endMin - startMin);
    const height = (duration / 60) * 100;

    // Calculate width and position for side-by-side display using per-group totals
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
        {/* Color legend based on settings */}
        {colorByDoctor && doctors && doctors.length > 0 && (
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

        {colorByTreatment && treatmentTypes.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-3 px-2">
            <span className="text-xs font-medium text-muted-foreground">Treatments:</span>
            {treatmentTypes.map((treatment, index) => {
              const colors = TREATMENT_COLORS[index % TREATMENT_COLORS.length];
              return (
                <div key={treatment} className="flex items-center gap-1.5">
                  <div className={cn("h-3 w-3 rounded-sm", colors.bg, "border-l-2", colors.border)} />
                  <span className={cn("text-xs font-medium", colors.text)}>
                    {treatment}
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
                <div className="text-xs font-medium text-muted-foreground sm:text-sm">
                  {format(day, "EEE")}
                </div>
                <div
                  className={cn(
                    "mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8 sm:text-sm",
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
              <div className="border-r border-border p-1 text-right text-[10px] text-muted-foreground sm:p-2 sm:text-xs">
                {format(new Date().setHours(hour, 0), "HH:mm")}
              </div>
              {days.map((day) => {
                const isToday = isSameDay(day, new Date());

                const dayAppointments = appointments.filter((apt) => apt.appointment_date && isSameDay(parseISO(apt.appointment_date), day));
                const hourAppointments = dayAppointments.filter((apt) => apt.start_time && parseInt(apt.start_time.split(":")[0], 10) === hour);

                const totalAppointments = hourAppointments.length;

                const formattedHour = hour.toString().padStart(2, '0') + ':00';

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className={cn(
                      "group relative h-12 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors sm:h-16",
                      isToday && "bg-primary/5"
                    )}
                    onClick={() => onAddAppointment(day, formattedHour)}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute right-1 top-1 z-30 h-5 w-5 transition-opacity bg-background/80 hover:bg-background shadow-sm",
                        totalAppointments > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAppointment(day, formattedHour);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>

                    {hourAppointments.map((apt) => {
                      const layout = dayLayouts[apt.id] ?? { index: 0, total: 1 };
                      const position = getAppointmentPosition(apt.start_time, apt.end_time, layout.index, layout.total);
                      const appointmentColors = getAppointmentColor(apt);
                      const doctorName = getDoctorName(apt.doctor_id);

                      return (
                        <button
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(apt.id);
                          }}
                          style={position}
                          className={cn(
                            "absolute overflow-hidden rounded-r px-0.5 py-0.5 text-left text-[10px] transition-all hover:z-20 hover:shadow-md border-l-2 sm:px-1.5 sm:text-xs",
                            apt.status === "completed"
                              ? "bg-success/20 text-success border-l-success hover:bg-success/30"
                              : apt.status === "cancelled"
                                ? "bg-destructive/20 text-destructive border-l-destructive hover:bg-destructive/30"
                                : cn(appointmentColors.bg, appointmentColors.text, appointmentColors.border)
                          )
                        >
                          <div className="font-medium truncate">
                            {apt.patients?.first_name} {apt.patients?.last_name?.charAt(0)}.
                          </div>

                          <div className="text-[10px] opacity-75 truncate">
                            {apt.start_time.slice(0, 5)}
                          </div>

                          {/* Reminder indicators removed */}
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
