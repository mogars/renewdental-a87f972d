import { useState } from "react";
import { apiPost } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { AppRole } from "@/types/database";

const AVAILABLE_ROLES: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "dentist", label: "Dentist" },
];

interface AddUserRoleFormProps {
  onSuccess: () => void;
}

export const AddUserRoleForm = ({ onSuccess }: AddUserRoleFormProps) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsSubmitting(true);
    try {
      await apiPost(`/users/${userId.trim()}/roles`, { role: selectedRole });

      toast({
        title: "Role assigned",
        description: `Successfully assigned ${selectedRole} role to user.`,
      });
      setUserId("");
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign role. Make sure the user ID is valid.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-2">
        <label htmlFor="userId" className="text-sm font-medium">
          User ID
        </label>
        <Input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user UUID"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as AppRole)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {AVAILABLE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isSubmitting || !userId.trim()}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Assign Role
      </Button>
    </form>
  );
};
