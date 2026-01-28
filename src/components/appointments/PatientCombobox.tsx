import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PatientForm, { PatientFormData } from "@/components/PatientForm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { Patient } from "@/types/database";

interface PatientComboboxProps {
  patients: Patient[];
  value: string;
  onValueChange: (value: string) => void;
}

export const PatientCombobox = ({
  patients,
  value,
  onValueChange,
}: PatientComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const commandListRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search input (150ms delay)
  useEffect(() => {
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchValue);
    }, 150);

    return () => clearTimeout(searchTimeoutRef.current);
  }, [searchValue]);

  // Scroll list to top when debounced search value changes
  useEffect(() => {
    if (commandListRef.current) {
      commandListRef.current.scrollTop = 0;
    }
  }, [debouncedSearch]);

  const selectedPatient = patients.find((patient) => patient.id === value);

  const createPatient = useMutation({
    mutationFn: async (data: PatientFormData) => {
      return apiPost<Patient>("/patients", {
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
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsFormOpen(false);
      onValueChange(newPatient.id);
      toast({
        title: "Patient added",
        description: "The patient has been added and selected.",
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

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedPatient
              ? `${selectedPatient.first_name} ${selectedPatient.last_name}`
              : "Select patient..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search patients..."
              value={searchValue}
              onValueChange={setSearchValue}
              data-search={debouncedSearch}
            />
            <CommandList ref={commandListRef}>
              <CommandEmpty>No patient found.</CommandEmpty>
              <CommandGroup>
                {patients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={`${patient.first_name} ${patient.last_name}`}
                    onSelect={() => {
                      onValueChange(patient.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>
                        {patient.first_name} {patient.last_name}
                      </span>
                      {patient.phone && (
                        <span className="text-xs text-muted-foreground">
                          {patient.phone}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setIsFormOpen(true);
                  }}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add new patient
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <PatientForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={async (data) => {
          await createPatient.mutateAsync(data);
        }}
        isLoading={createPatient.isPending}
      />
    </>
  );
};
