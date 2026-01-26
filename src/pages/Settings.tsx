import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Plus, Pencil, Trash2, Loader2, Stethoscope, Users, Settings2, Bell, Clock, MessageSquare } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import { UsersTab } from "@/components/user-management/UsersTab";
import { SmsTemplateSettings } from "@/components/settings/SmsTemplateSettings";
import TreatmentTypesSettings from "@/components/settings/TreatmentTypesSettings";

type Doctor = Tables<"doctors">;

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { settings, updateSettings } = useAppSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    specialty: "",
    phone: "",
    email: "",
  });

  const { data: doctors, isLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("*")
        .order("last_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createDoctor = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("doctors").insert({
        first_name: formData.first_name,
        last_name: formData.last_name,
        specialty: formData.specialty || null,
        phone: formData.phone || null,
        email: formData.email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Doctor added", description: "The doctor has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add doctor.", variant: "destructive" });
    },
  });

  const updateDoctor = useMutation({
    mutationFn: async () => {
      if (!editingDoctor) return;
      const { error } = await supabase
        .from("doctors")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          specialty: formData.specialty || null,
          phone: formData.phone || null,
          email: formData.email || null,
        })
        .eq("id", editingDoctor.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Doctor updated", description: "The doctor has been updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update doctor.", variant: "destructive" });
    },
  });

  const toggleDoctorActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("doctors")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update doctor status.", variant: "destructive" });
    },
  });

  const deleteDoctor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctors"] });
      toast({ title: "Doctor deleted", description: "The doctor has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete doctor.", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ first_name: "", last_name: "", specialty: "", phone: "", email: "" });
    setEditingDoctor(null);
  };

  const handleOpenDialog = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      setFormData({
        first_name: doctor.first_name,
        last_name: doctor.last_name,
        specialty: doctor.specialty || "",
        phone: doctor.phone || "",
        email: doctor.email || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDoctor) {
      updateDoctor.mutate();
    } else {
      createDoctor.mutate();
    }
  };

  const isSubmitting = createDoctor.isPending || updateDoctor.isPending;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Clinic Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your clinic's configuration and users</p>
        </div>

        <Tabs defaultValue={isAdmin ? "general" : "doctors"} className="space-y-6">
          <TabsList>
            {isAdmin && (
              <>
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="doctors" className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Doctors
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="doctors">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    Doctors
                  </CardTitle>
                  <CardDescription>Manage the doctors in your clinic</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenDialog()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Doctor
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingDoctor ? "Edit Doctor" : "Add Doctor"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="first_name">First Name *</Label>
                          <Input
                            id="first_name"
                            value={formData.first_name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, first_name: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="last_name">Last Name *</Label>
                          <Input
                            id="last_name"
                            value={formData.last_name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, last_name: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input
                          id="specialty"
                          value={formData.specialty}
                          onChange={(e) => setFormData((prev) => ({ ...prev, specialty: e.target.value }))}
                          placeholder="e.g., General Dentistry, Orthodontics"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting || !formData.first_name || !formData.last_name}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {editingDoctor ? "Update" : "Add"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : doctors && doctors.length > 0 ? (
                  <div className="space-y-3">
                    {doctors.map((doctor) => (
                      <div
                        key={doctor.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Stethoscope className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Dr. {doctor.first_name} {doctor.last_name}
                            </p>
                            {doctor.specialty && (
                              <p className="text-sm text-muted-foreground">{doctor.specialty}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Active</span>
                            <Switch
                              checked={doctor.is_active}
                              onCheckedChange={(checked) =>
                                toggleDoctorActive.mutate({ id: doctor.id, isActive: checked })
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(doctor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDoctor.mutate(doctor.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No doctors added yet. Click "Add Doctor" to get started.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="users">
                <UsersTab />
              </TabsContent>

              <TabsContent value="general">
                <Card>
                  <CardHeader>
                    <CardTitle>Setări Generale</CardTitle>
                    <CardDescription>
                      Configurează setările aplicației
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full">
                      <AccordionItem value="notifications">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <p className="font-medium">Notificări</p>
                              <p className="text-sm text-muted-foreground font-normal">
                                Configurează durata notificărilor
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="toast-duration" className="text-base">
                                  Durata Notificărilor
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  Cât timp rămân vizibile ({(settings.toastDuration / 1000).toFixed(1)} secunde)
                                </p>
                              </div>
                              <span className="text-sm font-medium text-muted-foreground">
                                {(settings.toastDuration / 1000).toFixed(1)}s
                              </span>
                            </div>
                            <Slider
                              id="toast-duration"
                              value={[settings.toastDuration]}
                              onValueChange={(value) => updateSettings({ toastDuration: value[0] })}
                              min={1000}
                              max={15000}
                              step={500}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>1 secundă</span>
                              <span>15 secunde</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "Test Notificare",
                                  description: "Această notificare va dispărea după durata configurată.",
                                });
                              }}
                            >
                              Testează Notificare
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="treatments">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <p className="font-medium">Tipuri de Tratament</p>
                              <p className="text-sm text-muted-foreground font-normal">
                                Configurează tratamentele și duratele lor
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <TreatmentTypesSettings />
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="sms">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            <div className="text-left">
                              <p className="font-medium">Șablon SMS</p>
                              <p className="text-sm text-muted-foreground font-normal">
                                Personalizează mesajele de reminder
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <SmsTemplateSettings />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
