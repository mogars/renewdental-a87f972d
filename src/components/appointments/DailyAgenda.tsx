import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, User, Phone, Mail, FileText, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAccessToken } from "@/lib/cognito";
import { config } from "@/config/api";
import type { AppointmentWithPatient } from "@/types/database";

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
      const token = getAccessToken();
      if (!token) {
        toast({
          title: "Not authenticated",
          description: "Please log in to send SMS reminders.",
          variant: "destructive",
        });
        return;
      }

      // For AWS backend, call the Lambda function endpoint
      const response = await fetch(
        `${config.awsApiUrl}/send-sms`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
        return <Badge className="bg-success/20 text-success hover:bg-success/30">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30">Cancelled</Badge>;
      case "no-show":
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30">No Show</Badge>;
      default:
        return <Badge className="bg-secondary text-secondary-foreground">Scheduled</Badge>;
    }
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
            No appointments scheduled for {format(date, "EEEE, MMMM d")}.
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
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center rounded-lg bg-muted px-3 py-2">
                        <span className="text-lg font-semibold text-foreground">
                          {apt.start_time.slice(0, 5)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {apt.end_time.slice(0, 5)}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">{apt.title}</h4>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3.5 w-3.5" />
                          <span>
                            {apt.patients
                              ? `${apt.patients.first_name} ${apt.patients.last_name}`
                              : "No patient"}
                          </span>
                        </div>

                        {apt.patients?.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            <span>{apt.patients.phone}</span>
                          </div>
                        )}

                        {apt.patients?.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3.5 w-3.5" />
                            <span>{apt.patients.email}</span>
                          </div>
                        )}

                        {apt.notes && (
                          <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <FileText className="mt-0.5 h-3.5 w-3.5" />
                            <span className="line-clamp-2">{apt.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(apt.status)}
                      {apt.treatment_type && (
                        <Badge variant="outline">{apt.treatment_type}</Badge>
                      )}
                      {apt.patients?.phone && apt.status === "scheduled" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={(e) => sendImmediateSms(e, apt.id)}
                          disabled={sendingSmsFor === apt.id}
                        >
                          {sendingSmsFor === apt.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <MessageSquare className="h-3 w-3" />
                          )}
                          Send SMS
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
