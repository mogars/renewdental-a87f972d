import { Badge } from "@/components/ui/badge";
import { Phone, Users } from "lucide-react";
import { UserRoleEditor } from "./UserRoleEditor";
import { UserProfileEditor } from "./UserProfileEditor";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserCardProps {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    phone: string | null;
    roles: AppRole[];
  };
}

export const UserCard = ({ user }: UserCardProps) => {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {user.displayName || user.email}
          </p>
          {user.displayName && (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          )}
          {user.phone && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {user.phone}
            </p>
          )}
          <p className="text-xs text-muted-foreground">ID: {user.id.slice(0, 8)}...</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-wrap gap-2">
          {user.roles.length > 0 ? (
            user.roles.map((role) => (
              <Badge
                key={role}
                variant={role === "admin" ? "default" : "secondary"}
              >
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No roles assigned</span>
          )}
        </div>
        <UserProfileEditor
          userId={user.id}
          currentDisplayName={user.displayName}
          currentPhone={user.phone}
          userEmail={user.email}
        />
        <UserRoleEditor
          userId={user.id}
          userEmail={user.displayName || user.email}
          currentRoles={user.roles}
        />
      </div>
    </div>
  );
};
