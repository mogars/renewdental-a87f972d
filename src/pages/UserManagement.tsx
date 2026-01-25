import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Users, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  id: string;
  email: string;
  created_at: string;
  roles: AppRole[];
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full system access and user management' },
  { value: 'staff', label: 'Staff', description: 'Patient and appointment management' },
  { value: 'dentist', label: 'Dentist', description: 'Clinical access and chart records' },
];

const UserManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  // Fetch all users with their roles using an edge function
  const { data: users, isLoading, error } = useQuery({
    queryKey: ["usersWithRoles"],
    queryFn: async () => {
      // Get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      
      if (rolesError) throw rolesError;

      // Group roles by user_id
      const rolesByUser = rolesData.reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, AppRole[]>);

      // Get unique user IDs
      const userIds = [...new Set(rolesData.map(r => r.user_id))];
      
      // For users without roles, we need to get them from auth
      // Since we can't query auth.users directly, we'll work with what we have
      const users: UserWithRoles[] = userIds.map(userId => ({
        id: userId,
        email: `User ${userId.slice(0, 8)}...`, // Placeholder - will be enriched if possible
        created_at: new Date().toISOString(),
        roles: rolesByUser[userId] || [],
      }));

      return users;
    },
    enabled: isAdmin,
  });

  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: AppRole; action: 'add' | 'remove' }) => {
      setUpdatingUser(userId);
      
      if (action === 'add') {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
    },
    onSuccess: (_, { action, role }) => {
      queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] });
      toast({
        title: action === 'add' ? "Role added" : "Role removed",
        description: `Successfully ${action === 'add' ? 'assigned' : 'removed'} the ${role} role.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update user role. You may not have permission.",
        variant: "destructive",
      });
      console.error("Role update error:", error);
    },
    onSettled: () => {
      setUpdatingUser(null);
    },
  });

  const handleRoleToggle = (userId: string, role: AppRole, currentlyHasRole: boolean) => {
    updateUserRole.mutate({
      userId,
      role,
      action: currentlyHasRole ? 'remove' : 'add',
    });
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Card className="border-destructive/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground text-center max-w-md">
                You don't have permission to access this page. Only administrators can manage user roles.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            User Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Assign roles to control user access and permissions
          </p>
        </div>

        {/* Role Legend */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-start gap-3 rounded-lg border p-3">
                  <Badge variant={role.value === 'admin' ? 'default' : 'secondary'}>
                    {role.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Users
            </CardTitle>
            <CardDescription>
              Click the checkboxes to assign or remove roles from users
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="py-8 text-center text-destructive">
                Failed to load users. Please try again.
              </div>
            ) : users && users.length > 0 ? (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4">
                      {AVAILABLE_ROLES.map((role) => {
                        const hasRole = user.roles.includes(role.value);
                        const isUpdating = updatingUser === user.id;
                        
                        return (
                          <label
                            key={role.value}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <Checkbox
                              checked={hasRole}
                              onCheckedChange={() => handleRoleToggle(user.id, role.value, hasRole)}
                              disabled={isUpdating}
                            />
                            <span className="text-sm">{role.label}</span>
                            {isUpdating && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No users with roles found.</p>
                <p className="text-sm mt-2">
                  Users will appear here once they are assigned at least one role.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add User Role Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Add Role to New User</CardTitle>
            <CardDescription>
              Enter a user ID to assign roles to a user who doesn't appear in the list above
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddUserRoleForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] })} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// Separate component for adding roles to new users
const AddUserRoleForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("staff");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId.trim(), role: selectedRole });
      
      if (error) throw error;
      
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
        <input
          id="userId"
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="Enter user UUID"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

export default UserManagement;
