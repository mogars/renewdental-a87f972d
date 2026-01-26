import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { apiGet } from '@/services/api';
import type { AppRole } from '@/types/database';

interface UserRoleResponse {
  role: AppRole;
}

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const data = await apiGet<UserRoleResponse[]>(`/users/${user.id}/roles`);
      return data.map(r => r.role);
    },
    enabled: !!user?.id,
  });

  const hasRole = (role: AppRole) => roles?.includes(role) ?? false;
  const isAdmin = hasRole('admin');
  const isStaff = hasRole('staff');
  const isDentist = hasRole('dentist');

  return {
    roles: roles ?? [],
    isLoading,
    hasRole,
    isAdmin,
    isStaff,
    isDentist,
  };
};
