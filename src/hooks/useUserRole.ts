import { useAuth } from './AuthContext';

export const useUserRole = () => {
  const { user, isLoading, isAdmin, isStaff, isCheckup: isDentist } = useAuth() as any;
  // Note: Adjusting type names to match useAuth names or adding them to useAuth

  const auth = useAuth();

  return {
    roles: auth.user?.role ? [auth.user.role] : [],
    isLoading: auth.isLoading,
    isAdmin: auth.isAdmin,
    isStaff: auth.isStaff,
    isDentist: auth.isDentist,
  };
};
