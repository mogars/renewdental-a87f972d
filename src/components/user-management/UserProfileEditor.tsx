import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPut, apiGet, apiPost, apiDelete } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCog } from "lucide-react";
import type { AppRole, UserRole } from "@/types/database";

const AVAILABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "dentist", label: "Dentist" },
];

interface UserProfileEditorProps {
  userId: string;
  currentDisplayName: string | null;
  currentPhone: string | null;
  currentRoles: AppRole[];
  userEmail: string;
}

interface ProfileFormData {
  displayName: string;
  phone: string;
  roles: AppRole[];
}

export const UserProfileEditor = ({
  userId,
  currentDisplayName,
  currentPhone,
  currentRoles,
  userEmail,
}: UserProfileEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: currentDisplayName || "",
    phone: currentPhone || "",
    roles: currentRoles || [],
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        displayName: currentDisplayName || "",
        phone: currentPhone || "",
        roles: currentRoles || [],
      });
    }
  }, [open, currentDisplayName, currentPhone, currentRoles]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      // Update profile
      await apiPut(`/users/${userId}/profile`, { 
        display_name: data.displayName.trim() || null,
        phone: data.phone.trim() || null,
      });

      // Get current roles to determine what to add/remove
      const existingRoles = await apiGet<UserRole[]>(`/users/${userId}/roles`);
      const existingRoleValues = existingRoles?.map(r => r.role) || [];
      const rolesToAdd = data.roles.filter(r => !existingRoleValues.includes(r));
      const rolesToRemove = existingRoleValues.filter(r => !data.roles.includes(r));

      // Remove roles
      for (const role of rolesToRemove) {
        await apiDelete(`/users/${userId}/roles/${role}`);
      }

      // Add new roles
      for (const role of rolesToAdd) {
        await apiPost(`/users/${userId}/roles`, { role });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
      toast({
        title: "Profile updated",
        description: "Profile and roles have been updated successfully.",
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.roles.length === 0) {
      toast({
        title: "Error",
        description: "User must have at least one role.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(formData);
  };

  const handleRoleToggle = (role: AppRole, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      roles: checked 
        ? [...prev.roles, role]
        : prev.roles.filter(r => r !== role)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Edit profile">
          <UserCog className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Update profile information and roles for {userEmail}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={userEmail}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="Enter display name"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to show email as the display name
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Enter phone number"
            />
          </div>

          <div className="space-y-2">
            <Label>Roles</Label>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={formData.roles.includes(role.value)}
                    onCheckedChange={(checked) => handleRoleToggle(role.value, checked as boolean)}
                  />
                  <label
                    htmlFor={`role-${role.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {role.label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              User must have at least one role
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
