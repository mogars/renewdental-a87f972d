import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Users, AlertCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { UserCard } from "@/components/user-management/UserCard";
import { AddUserRoleForm } from "@/components/user-management/AddUserRoleForm";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  email: string;
  displayName: string | null;
  phone: string | null;
  roles: AppRole[];
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full system access and user management" },
  { value: "staff", label: "Staff", description: "Patient and appointment management" },
  { value: "dentist", label: "Dentist", description: "Clinical access and chart records" },
];

const UserManagement = () => {
  const queryClient = useQueryClient();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["usersWithRoles"],
    queryFn: async () => {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch profiles for email addresses, display names, and phone
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, phone");

      if (profilesError) throw profilesError;

      // Create profile lookup map
      const profileByUser = profilesData.reduce((acc, { user_id, email, display_name, phone }) => {
        acc[user_id] = { email, displayName: display_name, phone };
        return acc;
      }, {} as Record<string, { email: string; displayName: string | null; phone: string | null }>);

      // Group roles by user
      const rolesByUser = rolesData.reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, AppRole[]>);

      const userIds = [...new Set(rolesData.map((r) => r.user_id))];

      const users: UserWithRoles[] = userIds.map((userId) => ({
        id: userId,
        email: profileByUser[userId]?.email || `User ${userId.slice(0, 8)}...`,
        displayName: profileByUser[userId]?.displayName || null,
        phone: profileByUser[userId]?.phone || null,
        roles: rolesByUser[userId] || [],
      }));

      return users;
    },
    enabled: isAdmin,
  });

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
              Click the edit button to manage user roles
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
                  <UserCard key={user.id} user={user} />
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

export default UserManagement;
