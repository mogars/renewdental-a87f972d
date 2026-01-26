import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { PatientCombobox } from "./PatientCombobox";

type Patient = Tables<"patients">;
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

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patients: Patient[];
  selectedDate: Date;
  selectedTime?: string | null;
  editingAppointmentId: string | null;
  appointments: AppointmentWithPatient[];
}

type TreatmentType = {
  id: string;
  name: string;
  duration_minutes: number;
  is_active: boolean;
};

export const AppointmentForm = ({
  open,
  onOpenChange,
  patients,
  selectedDate,
  selectedTime,
  editingAppointmentId,
  appointments,
}: AppointmentFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const editingAppointment = editingAppointmentId
    ? appointments.find((apt) => apt.id === editingAppointmentId)
    : null;

  const [formData, setFormData] = useState({
    patientId: "",
    date: selectedDate,
    startTime: "09:00",
    endTime: "10:00",
    treatmentType: "",
    doctorId: "",
    notes: "",
    status: "scheduled",
  });

  // Fetch active doctors for the dropdown
  const { data: doctors } = useQuery({
    queryKey: ["doctors", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .eq("is_active", true)
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data as Doctor[];
    },
  });

  // Fetch treatment types with durations
  const { data: treatmentTypes } = useQuery({
    queryKey: ["treatmentTypes", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_types")
        .select("id, name, duration_minutes, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as TreatmentType[];
    },
  });

  // Helper function to calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Handle treatment type change - auto-calculate end time
  const handleTreatmentTypeChange = (treatmentName: string) => {
    const selectedType = treatmentTypes?.find(t => t.name === treatmentName);
    const duration = selectedType?.duration_minutes || 60;
    const newEndTime = calculateEndTime(formData.startTime, duration);
    setFormData(prev => ({
      ...prev,
      treatmentType: treatmentName,
      endTime: newEndTime,
    }));
  };

  // Handle start time change - recalculate end time based on selected treatment
  const handleStartTimeChange = (newStartTime: string) => {
    const selectedType = treatmentTypes?.find(t => t.name === formData.treatmentType);
    const duration = selectedType?.duration_minutes || 60;
    const newEndTime = calculateEndTime(newStartTime, duration);
    setFormData(prev => ({
      ...prev,
      startTime: newStartTime,
      endTime: newEndTime,
    }));
  };

  useEffect(() => {
    if (editingAppointment) {
      setFormData({
        patientId: editingAppointment.patient_id,
        date: new Date(editingAppointment.appointment_date),
        startTime: editingAppointment.start_time.slice(0, 5),
        endTime: editingAppointment.end_time.slice(0, 5),
        treatmentType: editingAppointment.treatment_type || "",
        doctorId: editingAppointment.doctor_id || "",
        notes: editingAppointment.notes || "",
        status: editingAppointment.status || "scheduled",
      });
    } else {
      // Calculate end time (1 hour after start time)
      const startTime = selectedTime || "09:00";
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHours = hours + 1;
      const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      setFormData((prev) => ({
        ...prev,
        patientId: "",
        date: selectedDate,
        startTime: startTime,
        endTime: endTime,
        treatmentType: "",
        doctorId: "",
        notes: "",
        status: "scheduled",
      }));
    }
  }, [editingAppointment, selectedDate, selectedTime, open]);

  const createAppointment = useMutation({
    mutationFn: async () => {
      const selectedDoctor = doctors?.find((d) => d.id === formData.doctorId);
      const dentistName = selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : null;
      const appointmentDate = format(formData.date, "yyyy-MM-dd");

      // Create appointment
      const { error: appointmentError } = await supabase.from("appointments").insert({
        patient_id: formData.patientId,
        title: formData.treatmentType,
        appointment_date: appointmentDate,
        start_time: formData.startTime,
        end_time: formData.endTime,
        treatment_type: formData.treatmentType,
        doctor_id: formData.doctorId || null,
        dentist_name: dentistName,
        notes: formData.notes || null,
        status: formData.status,
      });

      if (appointmentError) throw appointmentError;

      // Also create a chart record for this appointment
      const { error: chartError } = await supabase.from("chart_records").insert({
        patient_id: formData.patientId,
        record_date: appointmentDate,
        treatment_type: formData.treatmentType,
        description: formData.notes || null,
        dentist_name: dentistName,
        status: formData.status === "completed" ? "completed" : "scheduled",
      });

      if (chartError) throw chartError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["chartRecords"] });
      onOpenChange(false);
      toast({
        title: "Appointment created",
        description: "The appointment and chart record have been saved.",
      });
    },
    onError: (error) => {
      console.error("Error creating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to create appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async () => {
      if (!editingAppointmentId || !editingAppointment) return;

      const selectedDoctor = doctors?.find((d) => d.id === formData.doctorId);
      const dentistName = selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : null;
      const newAppointmentDate = format(formData.date, "yyyy-MM-dd");

      // Update appointment
      const { error: appointmentError } = await supabase
        .from("appointments")
        .update({
          patient_id: formData.patientId,
          title: formData.treatmentType,
          appointment_date: newAppointmentDate,
          start_time: formData.startTime,
          end_time: formData.endTime,
          treatment_type: formData.treatmentType,
          doctor_id: formData.doctorId || null,
          dentist_name: dentistName,
          notes: formData.notes || null,
          status: formData.status,
        })
        .eq("id", editingAppointmentId);

      if (appointmentError) throw appointmentError;

      // Try to find and update the corresponding chart record
      // Match by original patient_id, record_date, and treatment_type
      const originalDate = editingAppointment.appointment_date;
      const originalTreatmentType = editingAppointment.treatment_type;

      const { data: existingRecord } = await supabase
        .from("chart_records")
        .select("id")
        .eq("patient_id", editingAppointment.patient_id)
        .eq("record_date", originalDate)
        .eq("treatment_type", originalTreatmentType || "")
        .maybeSingle();

      if (existingRecord) {
        // Update existing chart record
        const { error: chartError } = await supabase
          .from("chart_records")
          .update({
            patient_id: formData.patientId,
            record_date: newAppointmentDate,
            treatment_type: formData.treatmentType,
            description: formData.notes || null,
            dentist_name: dentistName,
            status: formData.status === "completed" ? "completed" : formData.status === "cancelled" ? "cancelled" : "scheduled",
          })
          .eq("id", existingRecord.id);

        if (chartError) throw chartError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["chartRecords"] });
      onOpenChange(false);
      toast({
        title: "Appointment updated",
        description: "The appointment and chart record have been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async () => {
      if (!editingAppointmentId) return;

      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", editingAppointmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onOpenChange(false);
      toast({
        title: "Appointment deleted",
        description: "The appointment has been deleted.",
      });
    },
    onError: (error) => {
      console.error("Error deleting appointment:", error);
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAppointmentId) {
      updateAppointment.mutate();
    } else {
      createAppointment.mutate();
    }
  };

  const isLoading = createAppointment.isPending || updateAppointment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display">
            {editingAppointmentId ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Patient *</Label>
            <PatientCombobox
              patients={patients}
              value={formData.patientId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, patientId: value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Treatment Type *</Label>
            <Select
              value={formData.treatmentType}
              onValueChange={handleTreatmentTypeChange}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectează tipul de tratament" />
              </SelectTrigger>
              <SelectContent>
                {treatmentTypes && treatmentTypes.length > 0 ? (
                  treatmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name} ({type.duration_minutes} min)
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-types" disabled>
                    Nu există tipuri de tratament. Adaugă din Setări.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => date && setFormData((prev) => ({ ...prev, date }))}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Doctor *</Label>
            <Select
              value={formData.doctorId}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, doctorId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors && doctors.length > 0 ? (
                  doctors.map((doctor) => (
                    <SelectItem key={doctor.id} value={doctor.id}>
                      Dr. {doctor.first_name} {doctor.last_name}
                      {doctor.specialty && ` (${doctor.specialty})`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-doctors" disabled>
                    No doctors available. Add doctors in Settings.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {editingAppointmentId && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no-show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            {editingAppointmentId && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteAppointment.mutate()}
                disabled={deleteAppointment.isPending}
              >
                {deleteAppointment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="ml-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.patientId || !formData.treatmentType || !formData.doctorId}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAppointmentId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
