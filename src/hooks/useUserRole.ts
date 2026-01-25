import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
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
