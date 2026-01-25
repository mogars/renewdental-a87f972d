import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import PatientCard from "@/components/PatientCard";
import PatientForm, { PatientFormData } from "@/components/PatientForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Patients = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients, isLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createPatient = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const { error } = await supabase.from("patients").insert({
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

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsFormOpen(false);
      toast({
        title: "Patient added",
        description: "The patient has been successfully added.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add patient. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating patient:", error);
    },
  });

  const filteredPatients = patients?.filter((patient) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      patient.first_name.toLowerCase().includes(searchLower) ||
      patient.last_name.toLowerCase().includes(searchLower) ||
      patient.email?.toLowerCase().includes(searchLower) ||
      patient.phone?.includes(searchQuery)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Patients</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your patient records and information
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)} className="sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Patient
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : filteredPatients && filteredPatients.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPatients.map((patient) => (
              <PatientCard
                key={patient.id}
                id={patient.id}
                firstName={patient.first_name}
                lastName={patient.last_name}
                phone={patient.phone}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold text-foreground">No patients found</h3>
            <p className="mb-6 text-muted-foreground">
              {searchQuery
                ? "No patients match your search criteria."
                : "Get started by adding your first patient."}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Patient
              </Button>
            )}
          </div>
        )}
      </main>

      <PatientForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={createPatient.mutateAsync}
        isLoading={createPatient.isPending}
      />
    </div>
  );
};

export default Patients;
