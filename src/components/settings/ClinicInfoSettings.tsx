import { useState, useEffect } from "react";
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

const DEFAULT_INFO: ClinicInfo = {
  name: "",
  address: "",
  phone: "",
  email: "",
  website: "",
};

const STORAGE_KEY = "clinic_info_settings";

export const ClinicInfoSettings = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<ClinicInfo>(DEFAULT_INFO);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFormData({ ...DEFAULT_INFO, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Failed to load clinic info:", e);
    }
    setIsLoading(false);
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      toast({ title: "Saved", description: "Clinic information updated successfully." });
    } catch (e) {
      toast({ title: "Error", description: "Failed to save clinic information.", variant: "destructive" });
    }
    setIsSaving(false);
  };

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
        onClick={handleSave} 
        disabled={isSaving}
        className="w-full"
      >
        {isSaving ? (
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
