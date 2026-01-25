import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";
import { UserCard } from "./UserCard";
import { AddUserRoleForm } from "./AddUserRoleForm";
import { CreateUserForm } from "./CreateUserForm";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  email: string;
  roles: AppRole[];
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full system access and user management" },
  { value: "staff", label: "Staff", description: "Patient and appointment management" },
  { value: "dentist", label: "Dentist", description: "Clinical access and chart records" },
];

export const UsersTab = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ["usersWithRoles"],
    queryFn: async () => {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch profiles for email addresses
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, email");

      if (profilesError) throw profilesError;

      // Create email lookup map
      const emailByUser = profilesData.reduce((acc, { user_id, email }) => {
        acc[user_id] = email;
        return acc;
      }, {} as Record<string, string>);

      // Group roles by user
      const rolesByUser = rolesData.reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, AppRole[]>);

      const userIds = [...new Set(rolesData.map((r) => r.user_id))];

      const users: UserWithRoles[] = userIds.map((userId) => ({
        id: userId,
        email: emailByUser[userId] || `User ${userId.slice(0, 8)}...`,
        roles: rolesByUser[userId] || [],
      }));

      return users;
    },
  });

  return (
    <div className="space-y-6">
      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Role Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {AVAILABLE_ROLES.map((role) => (
              <div key={role.value} className="flex items-start gap-3 rounded-lg border p-3">
                <Badge variant={role.value === "admin" ? "default" : "secondary"}>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registered Users
            </CardTitle>
            <CardDescription>
              Click the edit button to manage user roles
            </CardDescription>
          </div>
          <CreateUserForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] })} />
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
                Click "Create User" to add a new user.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Role Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Role to Existing User</CardTitle>
          <CardDescription>
            Enter a user ID to assign roles to a user who doesn't appear in the list above
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddUserRoleForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["usersWithRoles"] })} />
        </CardContent>
      </Card>
    </div>
  );
};
