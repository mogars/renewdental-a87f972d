import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, User, Phone, Mail, FileText, MessageSquare, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { config } from "@/config/api";
import type { AppointmentWithPatient } from "@/types/database";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DailyAgendaProps {
  date: Date;
  appointments: AppointmentWithPatient[];
  onAddAppointment: () => void;
  onEditAppointment: (appointmentId: string) => void;
}

export const DailyAgenda = ({
  date,
  appointments,
  onAddAppointment,
  onEditAppointment,
}: DailyAgendaProps) => {
  const { toast } = useToast();
  const [sendingSmsFor, setSendingSmsFor] = useState<string | null>(null);

  const sortedAppointments = [...appointments].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  );

  const sendImmediateSms = async (e: React.MouseEvent, appointmentId: string) => {
    e.stopPropagation();
    setSendingSmsFor(appointmentId);

    try {
      const response = await fetch(
        `${config.awsApiUrl}/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ appointmentId }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "SMS Sent",
          description: result.message,
        });
      } else {
        toast({
          title: "Failed to send SMS",
          description: result.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("SMS send error:", error);
      toast({
        title: "Error",
        description: "Failed to send SMS. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setSendingSmsFor(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success/20 text-success hover:bg-success/30 border-none">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-none">Cancelled</Badge>;
      case "no-show":
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30 border-none">No Show</Badge>;
      default:
        return <Badge className="bg-secondary text-secondary-foreground border-none">Scheduled</Badge>;
    }
  };

  const NotificationStatus = ({ apt }: { apt: AppointmentWithPatient }) => {
    return (
      <TooltipProvider>
        <div className="flex gap-1.5 items-center mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border cursor-default",
                apt.reminder_sent_24h
                  ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                  : "bg-muted text-muted-foreground border-muted-foreground/10"
              )}>
                <Bell className="h-2.5 w-2.5" />
                24h
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {apt.reminder_sent_24h ? "Reminder-ul de 24h a fost trimis" : "Reminder-ul de 24h nu a fost trimis încă"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border cursor-default",
                apt.reminder_sent_2h
                  ? "bg-purple-500/10 text-purple-500 border-purple-500/20"
                  : "bg-muted text-muted-foreground border-muted-foreground/10"
              )}>
                <Bell className="h-2.5 w-2.5" />
                2h
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {apt.reminder_sent_2h ? "Reminder-ul de 2h a fost trimis" : "Reminder-ul de 2h nu a fost trimis încă"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors border cursor-default",
                apt.reminder_sent_1h
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-muted-foreground/10"
              )}>
                <Bell className="h-2.5 w-2.5" />
                1h
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {apt.reminder_sent_1h ? "Reminder-ul de 1h a fost trimis" : "Reminder-ul de 1h nu a fost trimis încă"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-4">
      {sortedAppointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-foreground">No appointments</h3>
          <p className="mb-6 text-muted-foreground">
            No appointments scheduled for {format(date, "EEEE, dd/MM/yyyy")}.
          </p>
          <Button onClick={onAddAppointment}>
            <Plus className="mr-2 h-4 w-4" />
            Add Appointment
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {sortedAppointments.length} appointment{sortedAppointments.length !== 1 ? "s" : ""}
            </p>
            <Button variant="outline" size="sm" onClick={onAddAppointment}>
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {sortedAppointments.map((apt) => (
              <Card
                key={apt.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-card-hover",
                  apt.status === "cancelled" && "opacity-60"
                )}
                onClick={() => onEditAppointment(apt.id)}
              >
                <CardContent className="p-2 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-2 sm:gap-4">
                      <div className="flex flex-col items-center rounded-lg bg-muted px-2 py-1 sm:px-3 sm:py-2">
                        <span className="text-base font-semibold text-foreground sm:text-lg">
                          {apt.start_time.slice(0, 5)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {apt.end_time.slice(0, 5)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-foreground sm:text-base">{apt.title}</h4>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="line-clamp-1">
                            {apt.patients
                              ? `${apt.patients.first_name} ${apt.patients.last_name}`
                              : "No patient"}
                          </span>
                        </div>

                        {apt.patients?.phone && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                            <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="line-clamp-1">{apt.patients.phone}</span>
                          </div>
                        )}

                        {apt.patients?.email && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                            <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="line-clamp-1">{apt.patients.email}</span>
                          </div>
                        )}

                        {apt.notes && (
                          <div className="flex items-start gap-2 text-xs text-muted-foreground sm:text-sm">
                            <FileText className="mt-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="line-clamp-1 sm:line-clamp-2">{apt.notes}</span>
                          </div>
                        )}

                        <NotificationStatus apt={apt} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                      {getStatusBadge(apt.status)}
                      {apt.treatment_type && (
                        <Badge variant="outline" className="text-xs">{apt.treatment_type}</Badge>
                      )}
                      {apt.patients?.phone && apt.status === "scheduled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 gap-1 text-xs sm:h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            sendImmediateSms(e, apt.id);
                          }}
                          disabled={sendingSmsFor === apt.id}
                        >
                          {sendingSmsFor === apt.id ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <MessageSquare className="h-2.5 w-2.5" />
                          )}
                          <span className="hidden sm:inline">Send SMS</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
