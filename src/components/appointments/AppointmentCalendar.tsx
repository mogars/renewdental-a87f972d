import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, Calendar, List, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { DailyAgenda } from "./DailyAgenda";
import { WeeklyView } from "./WeeklyView";
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

interface AppointmentCalendarProps {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  onAddAppointment: (date?: Date) => void;
  onEditAppointment: (appointmentId: string) => void;
}

export const AppointmentCalendar = ({
  appointments,
  isLoading,
  onAddAppointment,
  onEditAppointment,
}: AppointmentCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("week");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(
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
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="min-w-[200px] text-center font-display">
            {view === "day"
              ? format(currentDate, "EEEE, MMMM d, yyyy")
              : view === "week"
              ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d")} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "MMM d, yyyy")}`
              : format(currentDate, "MMMM yyyy")}
          </CardTitle>
          <Button variant="outline" size="icon" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as "month" | "week" | "day")}>
          <TabsList>
            <TabsTrigger value="month" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="day" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Day</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : view === "month" ? (
          <div className="overflow-hidden rounded-lg border border-border">
            {/* Day headers */}
            <div className="grid grid-cols-7 bg-muted">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div
                  key={day}
                  className="border-b border-r border-border p-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
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
                    className={cn(
                      "min-h-[100px] border-b border-r border-border p-1 transition-colors hover:bg-muted/50",
                      !isCurrentMonth && "bg-muted/30",
                      index % 7 === 6 && "border-r-0",
                      index >= days.length - 7 && "border-b-0"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-sm",
                          isToday && "bg-primary text-primary-foreground font-semibold",
                          !isCurrentMonth && "text-muted-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                        onClick={() => onAddAppointment(day)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayAppointments.slice(0, 3).map((apt) => (
                        <button
                          key={apt.id}
                          onClick={() => onEditAppointment(apt.id)}
                          className={cn(
                            "w-full truncate rounded px-1.5 py-0.5 text-left text-xs transition-colors",
                            apt.status === "completed"
                              ? "bg-success/20 text-success hover:bg-success/30"
                              : apt.status === "cancelled"
                              ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          )}
                        >
                          {apt.start_time.slice(0, 5)} {apt.patients?.first_name}
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
            appointments={appointments}
            onAddAppointment={onAddAppointment}
            onEditAppointment={onEditAppointment}
          />
        ) : (
          <DailyAgenda
            date={currentDate}
            appointments={appointments.filter((apt) =>
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
