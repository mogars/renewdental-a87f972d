import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiPost } from "@/services/api";
import { Button } from "@/components/ui/button";
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
import { Loader2, Pencil } from "lucide-react";
import type { AppRole } from "@/types/database";

interface UserRoleEditorProps {
  userId: string;
  userEmail: string;
  currentRoles: AppRole[];
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full system access and user management" },
  { value: "staff", label: "Staff", description: "Patient and appointment management" },
  { value: "dentist", label: "Dentist", description: "Clinical access and chart records" },
];

export const UserRoleEditor = ({ userId, userEmail, currentRoles }: UserRoleEditorProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>(currentRoles);
  const [isSaving, setIsSaving] = useState(false);

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async () => {
    setIsSaving(true);
    try {
      // Find roles to add and remove
      const rolesToAdd = selectedRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !selectedRoles.includes(r));

      // Remove roles
      for (const role of rolesToRemove) {
        await apiDelete(`/users/${userId}/roles/${role}`);
      }

      // Add roles
      for (const role of rolesToAdd) {
        await apiPost(`/users/${userId}/roles`, { role });
      }

      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
      toast({
        title: "Roles updated",
        description: "User roles have been successfully updated.",
      });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update roles. You may not have permission.",
        variant: "destructive",
      });
      console.error("Role update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    selectedRoles.length !== currentRoles.length ||
    selectedRoles.some((r) => !currentRoles.includes(r));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit user roles</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User Roles</DialogTitle>
          <DialogDescription>
            Manage roles for {userEmail}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {AVAILABLE_ROLES.map((role) => (
            <label
              key={role.value}
              className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedRoles.includes(role.value)}
                onCheckedChange={() => handleRoleToggle(role.value)}
                disabled={isSaving}
              />
              <div className="space-y-1">
                <span className="font-medium">{role.label}</span>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={saveRoles} disabled={isSaving || !hasChanges}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
