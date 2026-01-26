import { useAuth } from '@/contexts/AuthContext';

export const useUserRole = () => {
  const auth = useAuth();

  return {
    roles: auth.user?.role ? [auth.user.role] : [],
    isLoading: auth.isLoading,
    isAdmin: auth.isAdmin,
    isStaff: auth.isStaff,
    isDentist: auth.isDentist,
  };
};
