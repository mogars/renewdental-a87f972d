// Simplified auth hook - no authentication required for local MySQL setup

export interface AuthUser {
  id: string;
  email: string;
}

// Local admin user - always authenticated
const LOCAL_ADMIN: AuthUser = {
  id: 'local-admin',
  email: 'admin@local',
};

export const useAuth = () => {
  // For local MySQL setup, we're always "authenticated" as local admin
  const user = LOCAL_ADMIN;
  const loading = false;

  const signIn = async (_email: string, _password: string) => {
    // No authentication needed for local setup
    return { data: { user: LOCAL_ADMIN }, error: null };
  };

  const signUp = async (_email: string, _password: string) => {
    // No authentication needed for local setup
    return { data: { userConfirmed: true }, error: null };
  };

  const signOut = async () => {
    // No authentication needed for local setup
    return { error: null };
  };

  const confirmSignUp = async (_email: string, _code: string) => {
    // No authentication needed for local setup
    return { data: true, error: null };
  };

  const refreshAuth = () => {
    // No-op for local setup
  };

  return { 
    user, 
    session: { user }, 
    loading, 
    signIn, 
    signUp, 
    signOut,
    confirmSignUp,
    refreshAuth,
  };
};
