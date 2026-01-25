import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Appointments = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingAppointment, setEditingAppointment] = useState<string | null>(null);

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          patients (
            id,
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .order("appointment_date", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: patients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const handleAddAppointment = (date?: Date) => {
    if (date) setSelectedDate(date);
    setEditingAppointment(null);
    setIsFormOpen(true);
  };

  const handleEditAppointment = (appointmentId: string) => {
    setEditingAppointment(appointmentId);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Appointments</h1>
            <p className="mt-1 text-muted-foreground">
              Schedule and manage patient appointments
            </p>
          </div>
          <Button onClick={() => handleAddAppointment()} className="sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Button>
        </div>

        <AppointmentCalendar
          appointments={appointments || []}
          isLoading={appointmentsLoading}
          onAddAppointment={handleAddAppointment}
          onEditAppointment={handleEditAppointment}
        />
      </main>

      <AppointmentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        patients={patients || []}
        selectedDate={selectedDate}
        editingAppointmentId={editingAppointment}
        appointments={appointments || []}
      />
    </div>
  );
};

export default Appointments;
