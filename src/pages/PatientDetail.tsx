import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/services/api";
import { useIsMobile } from "@/hooks/use-mobile";
import Header from "@/components/Header";
import PatientForm, { PatientFormData } from "@/components/PatientForm";
import ChartRecordForm, { ChartRecordFormData } from "@/components/ChartRecordForm";
import ChartRecordsTable from "@/components/ChartRecordsTable";
import ChartRecordCard from "@/components/ChartRecordCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
} from "lucide-react";
import { format, parse } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Patient, ChartRecord } from "@/types/database";

const PatientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [isEditPatientOpen, setIsEditPatientOpen] = useState(false);
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [isDeletePatientOpen, setIsDeletePatientOpen] = useState(false);
  const [isDeleteRecordOpen, setIsDeleteRecordOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [editRecordData, setEditRecordData] = useState<Partial<ChartRecordFormData> | null>(null);

  const { data: patient, isLoading: isLoadingPatient, error: patientError } = useQuery({
    queryKey: ["patient", id],
    queryFn: async () => {
      console.log(`[DEBUG] Fetching patient with ID: ${id}`);
      const data = await apiGet<Patient>(`/patients/${id}`);
      console.log(`[DEBUG] Patient data received:`, data);
      return data;
    },
  });

  const { data: chartRecords, isLoading: isLoadingRecords, error: recordsError } = useQuery({
    queryKey: ["chart_records", id],
    queryFn: async () => {
      console.log(`[DEBUG] Fetching chart records for ID: ${id}`);
      const data = await apiGet<ChartRecord[]>(`/chart-records?patient_id=${id}`);
      console.log(`[DEBUG] Chart records received:`, data);
      return data;
    },
  });

  if (patientError) console.error('[DEBUG] Patient Error:', patientError);
  if (recordsError) console.error('[DEBUG] Records Error:', recordsError);

  const updatePatient = useMutation({
    mutationFn: async (data: PatientFormData) => {
      return apiPut<Patient>(`/patients/${id}`, {
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email || null,
        phone: data.phone || null,
        date_of_birth: data.date_of_birth || null,
        address: data.address || null,
        insurance_provider: data.insurance_provider || null,
        insurance_id: data.insurance_id || null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
      setIsEditPatientOpen(false);
      toast({ title: "Patient updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating patient", variant: "destructive" });
    },
  });

  const deletePatient = useMutation({
    mutationFn: async () => {
      return apiDelete(`/patients/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Patient deleted successfully" });
      navigate("/patients");
    },
    onError: () => {
      toast({ title: "Error deleting patient", variant: "destructive" });
    },
  });

  const createChartRecord = useMutation({
    mutationFn: async (data: ChartRecordFormData) => {
      return apiPost<ChartRecord>("/chart-records", {
        patient_id: id,
        record_date: format(data.record_date, "yyyy-MM-dd"),
        treatment_type: data.treatment_type,
        tooth_number: data.tooth_number || null,
        description: data.description || null,
        dentist_name: data.dentist_name || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart_records", id] });
      setIsAddRecordOpen(false);
      toast({ title: "Chart record added successfully" });
    },
    onError: () => {
      toast({ title: "Error adding chart record", variant: "destructive" });
    },
  });

  const updateChartRecord = useMutation({
    mutationFn: async (data: ChartRecordFormData) => {
      return apiPut<ChartRecord>(`/chart-records/${selectedRecordId}`, {
        record_date: format(data.record_date, "yyyy-MM-dd"),
        treatment_type: data.treatment_type,
        tooth_number: data.tooth_number || null,
        description: data.description || null,
        dentist_name: data.dentist_name || null,
        cost: data.cost ? parseFloat(data.cost) : null,
        status: data.status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart_records", id] });
      setIsEditRecordOpen(false);
      setSelectedRecordId(null);
      setEditRecordData(null);
      toast({ title: "Chart record updated successfully" });
    },
    onError: () => {
      toast({ title: "Error updating chart record", variant: "destructive" });
    },
  });

  const deleteChartRecord = useMutation({
    mutationFn: async () => {
      return apiDelete(`/chart-records/${selectedRecordId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chart_records", id] });
      setIsDeleteRecordOpen(false);
      setSelectedRecordId(null);
      toast({ title: "Chart record deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error deleting chart record", variant: "destructive" });
    },
  });

  const handleEditRecord = (recordId: string) => {
    const record = chartRecords?.find((r) => r.id === recordId);
    if (record) {
      setSelectedRecordId(recordId);

      // Robust date parsing
      let parsedDate = new Date();
      try {
        if (record.record_date) {
          const dateStr = record.record_date.toString().split('T')[0];
          parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date(record.record_date);
          }
        }
      } catch (err) {
        console.error("[DEBUG] Failed to parse record date:", record.record_date, err);
        parsedDate = new Date();
      }

      setEditRecordData({
        record_date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
        treatment_type: record.treatment_type,
        tooth_number: record.tooth_number || "",
        description: record.description || "",
        dentist_name: record.dentist_name || "",
        cost: record.cost?.toString() || "",
        status: record.status || "completed",
      });
      setIsEditRecordOpen(true);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    setSelectedRecordId(recordId);
    setIsDeleteRecordOpen(true);
  };

  if (isLoadingPatient) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 rounded bg-muted" />
            <div className="h-64 rounded-lg bg-muted" />
          </div>
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Patient not found</h1>
            <Button onClick={() => navigate("/patients")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Patients
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/patients")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Patients
        </Button>

        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-180px)]">
          {/* Left Panel - Patient Info */}
          <div className="w-full lg:w-80 lg:shrink-0">
            <Card className="gradient-card border-border/50 shadow-card lg:h-full overflow-auto">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-semibold text-lg">
                    {patient.first_name?.charAt(0) || '?'}
                    {patient.last_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <CardTitle className="font-display text-lg">
                      {patient.first_name} {patient.last_name}
                    </CardTitle>
                    {patient.insurance_provider && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {patient.insurance_provider}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {patient.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>
                      {(() => {
                        try {
                          return format(new Date(patient.date_of_birth), "dd/MM/yyyy");
                        } catch {
                          return patient.date_of_birth;
                        }
                      })()}
                    </span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>{patient.address}</span>
                  </div>
                )}
                {patient.insurance_id && (
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>ID: {patient.insurance_id}</span>
                  </div>
                )}
                {patient.notes && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-muted-foreground">{patient.notes}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsEditPatientOpen(true)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => setIsDeletePatientOpen(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Chart Records Table */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-foreground">
                Chart Records
              </h2>
              <Button onClick={() => setIsAddRecordOpen(true)} size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Record
              </Button>
            </div>

            <div className="flex-1 overflow-auto space-y-3">
              {isLoadingRecords ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : isMobile ? (
                chartRecords && chartRecords.length > 0 ? (
                  chartRecords.map((record) => (
                    <ChartRecordCard
                      key={record.id}
                      id={record.id}
                      recordDate={record.record_date}
                      treatmentType={record.treatment_type}
                      toothNumber={record.tooth_number}
                      description={record.description}
                      dentistName={record.dentist_name}
                      cost={record.cost}
                      status={record.status}
                      onEdit={handleEditRecord}
                      onDelete={handleDeleteRecord}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No chart records yet
                  </div>
                )
              ) : (
                <ChartRecordsTable
                  records={chartRecords || []}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteRecord}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Patient Form */}
      <PatientForm
        open={isEditPatientOpen}
        onOpenChange={setIsEditPatientOpen}
        onSubmit={updatePatient.mutateAsync}
        defaultValues={{
          first_name: patient.first_name,
          last_name: patient.last_name,
          email: patient.email || "",
          phone: patient.phone || "",
          date_of_birth: patient.date_of_birth || "",
          address: patient.address || "",
          insurance_provider: patient.insurance_provider || "",
          insurance_id: patient.insurance_id || "",
          notes: patient.notes || "",
        }}
        isEditing
        isLoading={updatePatient.isPending}
      />

      {/* Add Chart Record Form */}
      <ChartRecordForm
        open={isAddRecordOpen}
        onOpenChange={setIsAddRecordOpen}
        onSubmit={createChartRecord.mutateAsync}
        isLoading={createChartRecord.isPending}
      />

      {/* Edit Chart Record Form */}
      {editRecordData && (
        <ChartRecordForm
          open={isEditRecordOpen}
          onOpenChange={setIsEditRecordOpen}
          onSubmit={updateChartRecord.mutateAsync}
          defaultValues={editRecordData}
          isEditing
          isLoading={updateChartRecord.isPending}
        />
      )}

      {/* Delete Patient Dialog */}
      <AlertDialog open={isDeletePatientOpen} onOpenChange={setIsDeletePatientOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this patient? This will also delete all
              associated chart records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePatient.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chart Record Dialog */}
      <AlertDialog open={isDeleteRecordOpen} onOpenChange={setIsDeleteRecordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chart Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chart record? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteChartRecord.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientDetail;
