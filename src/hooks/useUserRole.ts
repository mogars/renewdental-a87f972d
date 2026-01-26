import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types/database';

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ['userRoles', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      // First get the Supabase user_id from profiles using email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', user.email)
        .maybeSingle();
      
      if (profileError || !profile) {
        console.error('Profile lookup failed:', profileError);
        return [];
      }
      
      // Then get roles for that user_id
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id);
      
      if (rolesError) {
        console.error('Roles lookup failed:', rolesError);
        return [];
      }
      
      return userRoles.map(r => r.role as AppRole);
    },
    enabled: !!user?.email,
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
