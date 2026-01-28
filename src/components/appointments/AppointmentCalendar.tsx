import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar, List, LayoutGrid, Users, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { DailyAgenda } from "./DailyAgenda";
import { WeeklyView } from "./WeeklyView";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCalendarSettings } from "@/hooks/useCalendarSettings";
import type { AppointmentWithPatient, Doctor } from "@/types/database";

interface AppointmentCalendarProps {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  onAddAppointment: (date?: Date, startTime?: string) => void;
  onEditAppointment: (appointmentId: string) => void;
}

export const AppointmentCalendar = ({
  appointments,
  isLoading,
  onAddAppointment,
  onEditAppointment,
}: AppointmentCalendarProps) => {
  const isMobile = useIsMobile();
  const { data: calendarSettings, isLoading: settingsLoading } = useCalendarSettings();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("all");
  const [hasInitializedView, setHasInitializedView] = useState(false);

  // Apply default view from settings once loaded
  useEffect(() => {
    if (calendarSettings && !hasInitializedView) {
      if (!isMobile) {
        setView(calendarSettings.defaultView);
      }
      setHasInitializedView(true);
    }
  }, [calendarSettings, hasInitializedView, isMobile]);

  // Auto-switch to day view on mobile for better UX
  useEffect(() => {
    if (isMobile && view === "week") {
      setView("day");
    }
  }, [isMobile, view]);

  // Fetch doctors for the filter dropdown
  const { data: doctors } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      return apiGet<Doctor[]>("/doctors");
    },
  });

  // Filter appointments based on selected doctor
  const filteredAppointments = selectedDoctorId === "all"
    ? appointments
    : appointments.filter((apt) => apt.doctor_id === selectedDoctorId);

  const weekStartsOn = (calendarSettings?.firstDayOfWeek ?? 1) as 0 | 1;

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDayLabels = weekStartsOn === 0
    ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekDayLabelsMobile = weekStartsOn === 0
    ? ["S", "M", "T", "W", "T", "F", "S"]
    : ["M", "T", "W", "T", "F", "S", "S"];

  const getAppointmentsForDay = (date: Date) => {
    return filteredAppointments.filter(
      (apt) => isSameDay(parseISO(apt.appointment_date), date)
    );
  };

  const navigatePrevious = () => {
    if (view === "month") {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
    }
  };

  const navigateNext = () => {
    if (view === "month") {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-col gap-4 px-3 sm:px-6">
        {/* Doctor filter dropdown */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <div className="flex items-center gap-2">
                  {selectedDoctorId === "all" ? (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Stethoscope className="h-4 w-4 text-primary" />
                  )}
                  <SelectValue placeholder="Select doctor" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    All Doctors (Clinic View)
                  </div>
                </SelectItem>
                {doctors?.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Dr. {doctor.first_name} {doctor.last_name}
                      {doctor.specialty && (
                        <span className="text-muted-foreground">({doctor.specialty})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Navigation and view tabs */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={navigatePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="flex-1 text-center font-display text-sm sm:text-lg">
              {view === "day"
                ? format(currentDate, isMobile ? "EEE, dd/MM" : "EEEE, dd/MM/yyyy")
                : view === "week"
                  ? isMobile
                    ? `${format(startOfWeek(currentDate, { weekStartsOn }), "dd/MM")} - ${format(endOfWeek(currentDate, { weekStartsOn }), "dd/MM/yyyy")}`
                    : `Week of ${format(startOfWeek(currentDate, { weekStartsOn }), "dd/MM")} - ${format(endOfWeek(currentDate, { weekStartsOn }), "dd/MM/yyyy")}`
                  : format(currentDate, isMobile ? "MMM yyyy" : "MMMM yyyy")}
            </CardTitle>
            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={navigateNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs sm:text-sm">
              Today
            </Button>

            <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "day")}>
              <TabsList className="h-8 sm:h-10">
                <TabsTrigger value="month" className="gap-1 px-2 sm:gap-2 sm:px-3 text-xs sm:text-sm">
                  <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Month</span>
                </TabsTrigger>
                <TabsTrigger value="week" className="gap-1 px-2 sm:gap-2 sm:px-3 text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Week</span>
                </TabsTrigger>
                <TabsTrigger value="day" className="gap-1 px-2 sm:gap-2 sm:px-3 text-xs sm:text-sm">
                  <List className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Day</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-2 sm:px-6">
        {isLoading || settingsLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : view === "month" ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted">
              {(isMobile ? weekDayLabelsMobile : weekDayLabels).map((day, i) => (
                <div
                  key={`${day}-${i}`}
                  className="border-b border-r border-border p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      setCurrentDate(day);
                      if (isMobile) setView("day");
                    }}
                    className={cn(
                      "min-h-[60px] sm:min-h-[100px] border-b border-r border-border p-0.5 sm:p-1 transition-colors hover:bg-muted/50 cursor-pointer",
                      !isCurrentMonth && "bg-muted/30",
                      index % 7 === 6 && "border-r-0",
                      index >= days.length - 7 && "border-b-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex h-5 w-5 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm",
                          isToday && "bg-primary text-primary-foreground font-semibold",
                          !isCurrentMonth && "text-muted-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 sm:h-6 sm:w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100 hidden sm:flex"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAppointment(day);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mt-0.5 sm:mt-1 space-y-0.5 sm:space-y-1">
                      {dayAppointments.slice(0, isMobile ? 2 : 3).map((apt) => (
                        <button
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditAppointment(apt.id);
                          }}
                          className={cn(
                            "w-full truncate rounded px-1 sm:px-1.5 py-0.5 text-left text-[10px] sm:text-xs transition-colors",
                            apt.status === "completed"
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : apt.status === "cancelled"
                                ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          )}
                        >
                          {isMobile ? apt.start_time.slice(0, 5) : `${apt.start_time.slice(0, 5)} ${apt.patients?.first_name}`}
                        </button>
                      ))}
                      {dayAppointments.length > 3 && (
                        <span className="block text-xs text-muted-foreground">
                          +{dayAppointments.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : view === "week" ? (
          <WeeklyView
            currentDate={currentDate}
            appointments={filteredAppointments}
            onAddAppointment={onAddAppointment}
            onEditAppointment={onEditAppointment}
          />
        ) : (
          <DailyAgenda
            date={currentDate}
            appointments={filteredAppointments.filter((apt) =>
              isSameDay(parseISO(apt.appointment_date), currentDate)
            )}
            onAddAppointment={() => onAddAppointment(currentDate)}
            onEditAppointment={onEditAppointment}
          />
        )}
      </CardContent>
    </Card>
  );
};
