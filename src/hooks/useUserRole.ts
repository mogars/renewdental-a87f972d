import type { AppRole } from '@/types/database';

// Local admin user - full access without authentication
export const useUserRole = () => {
  const roles: AppRole[] = ['admin', 'staff', 'dentist'];

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = true;
  const isStaff = true;
  const isDentist = true;

  return {
    roles,
    isLoading: false,
    hasRole,
    isAdmin,
    isStaff,
    isDentist,
  };
};
