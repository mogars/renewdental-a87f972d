import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface ClinicInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

export const ClinicInfoSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ClinicInfo>({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["clinic-info-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["clinic_name", "clinic_address", "clinic_phone", "clinic_email", "clinic_website"]);
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      
      return {
        name: settingsMap.clinic_name || "",
        address: settingsMap.clinic_address || "",
        phone: settingsMap.clinic_phone || "",
        email: settingsMap.clinic_email || "",
        website: settingsMap.clinic_website || "",
      };
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: "clinic_name", value: formData.name, description: "Clinic name" },
        { key: "clinic_address", value: formData.address, description: "Clinic address" },
        { key: "clinic_phone", value: formData.phone, description: "Clinic phone number" },
        { key: "clinic_email", value: formData.email, description: "Clinic email" },
        { key: "clinic_website", value: formData.website, description: "Clinic website" },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("app_settings")
          .upsert(update, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-info-settings"] });
      toast({ title: "Saved", description: "Clinic information updated successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save clinic information.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="clinic-name">Numele Clinicii</Label>
        <Input
          id="clinic-name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="ex: Clinica Dentară Smile"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clinic-address">Adresa</Label>
        <Textarea
          id="clinic-address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="ex: Str. Exemplu nr. 10, București"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="clinic-phone">Telefon</Label>
          <Input
            id="clinic-phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="ex: 0721 123 456"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clinic-email">Email</Label>
          <Input
            id="clinic-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="ex: contact@clinica.ro"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="clinic-website">Website</Label>
        <Input
          id="clinic-website"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          placeholder="ex: www.clinica.ro"
        />
      </div>

      <Button 
        onClick={() => saveMutation.mutate()} 
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Salvează
      </Button>
    </div>
  );
};

export default ClinicInfoSettings;
