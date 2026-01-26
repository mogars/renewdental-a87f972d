import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Users, Settings2, Bell, Clock, Building2, CalendarClock, Calendar, MessageCircle } from "lucide-react";
import { UsersTab } from "@/components/user-management/UsersTab";
import TreatmentTypesSettings from "@/components/settings/TreatmentTypesSettings";
import ClinicInfoSettings from "@/components/settings/ClinicInfoSettings";
import WorkingHoursSettings from "@/components/settings/WorkingHoursSettings";
import AppointmentDefaultsSettings from "@/components/settings/AppointmentDefaultsSettings";
import CalendarDisplaySettings from "@/components/settings/CalendarDisplaySettings";
import CustomerNotificationsSettings from "@/components/settings/CustomerNotificationsSettings";

const Settings = () => {
  const { toast } = useToast();
  const { isAdmin } = useUserRole();
  const { settings, updateSettings } = useAppSettings();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Clinic Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your clinic's configuration and users</p>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Setări Generale</CardTitle>
                  <CardDescription>
                    Configurează setările aplicației
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full" defaultValue={["clinic-info"]}>
                    <AccordionItem value="clinic-info">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Informații Clinică</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Numele, adresa și datele de contact
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <ClinicInfoSettings />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="working-hours">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <CalendarClock className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Program de Lucru</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Orele de funcționare pentru fiecare zi
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <WorkingHoursSettings />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="appointment-defaults">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Setări Programări</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Durate, intervale și limite implicite
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <AppointmentDefaultsSettings />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="calendar-display">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Afișare Calendar</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Personalizează vizualizarea calendarului
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <CalendarDisplaySettings />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="customer-notifications">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Notificări Pacienți</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Configurează reminder-ele SMS și șabloanele
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4">
                        <CustomerNotificationsSettings />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="notifications">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="font-medium">Notificări Aplicație</p>
                            <p className="text-sm text-muted-foreground font-normal">
                              Configurează durata notificărilor din aplicație
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

                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <UsersTab />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            You don't have permission to access settings.
          </div>
        )}
      </main>
    </div>
  );
};

export default Settings;
