import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const chartRecordSchema = z.object({
  record_date: z.date({ required_error: "Date is required" }),
  treatment_type: z.string().min(1, "Treatment type is required").max(100),
  tooth_number: z.string().max(20).optional().or(z.literal("")),
  description: z.string().max(1000).optional().or(z.literal("")),
  dentist_name: z.string().max(100).optional().or(z.literal("")),
  cost: z.string().optional().or(z.literal("")),
  status: z.string().default("completed"),
});

export type ChartRecordFormData = z.infer<typeof chartRecordSchema>;

interface ChartRecordFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ChartRecordFormData) => Promise<void>;
  defaultValues?: Partial<ChartRecordFormData>;
  isEditing?: boolean;
  isLoading?: boolean;
}

const treatmentTypes = [
  "Cleaning",
  "Filling",
  "Crown",
  "Root Canal",
  "Extraction",
  "Whitening",
  "X-Ray",
  "Examination",
  "Orthodontics",
  "Implant",
  "Bridge",
  "Dentures",
  "Periodontal Treatment",
  "Other",
];

const ChartRecordForm = ({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  isEditing = false,
  isLoading = false,
}: ChartRecordFormProps) => {
  // Fetch active doctors for the dropdown
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, first_name, last_name")
        .eq("is_active", true)
        .order("last_name");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<ChartRecordFormData>({
    resolver: zodResolver(chartRecordSchema),
    defaultValues: {
      record_date: defaultValues?.record_date || new Date(),
      treatment_type: defaultValues?.treatment_type || "",
      tooth_number: defaultValues?.tooth_number || "",
      description: defaultValues?.description || "",
      dentist_name: defaultValues?.dentist_name || "",
      cost: defaultValues?.cost || "",
      status: defaultValues?.status || "completed",
    },
  });

  const handleSubmit = async (data: ChartRecordFormData) => {
    await onSubmit(data);
    if (!isEditing) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {isEditing ? "Edit Chart Record" : "Add Chart Record"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="record_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatment_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select treatment type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {treatmentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tooth_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tooth Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 14, 15" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="150.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dentist_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dentist</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select dentist" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem
                          key={doctor.id}
                          value={`Dr. ${doctor.first_name} ${doctor.last_name}`}
                        >
                          Dr. {doctor.first_name} {doctor.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Treatment notes and observations..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Save Changes" : "Add Record"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ChartRecordForm;
