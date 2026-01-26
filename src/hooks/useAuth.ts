import { useEffect, useState, useCallback } from 'react';
import * as cognito from '@/lib/cognito';

export interface AuthUser {
  id: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(() => {
    const cognitoUser = cognito.getCurrentUser();
    if (cognitoUser && cognito.isAuthenticated()) {
      setUser({
        id: cognitoUser.sub,
        email: cognitoUser.email,
      });
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Check auth state periodically (tokens might expire)
    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, [checkAuth]);

  const signIn = async (email: string, password: string) => {
    const result = await cognito.signIn(email, password);
    if (result.success) {
      checkAuth();
      return { data: { user: cognito.getCurrentUser() }, error: null };
    }
    return { data: null, error: { message: result.error || 'Sign in failed' } };
  };

  const signUp = async (email: string, password: string) => {
    const result = await cognito.signUp(email, password);
    if (result.success) {
      return { 
        data: { userConfirmed: result.userConfirmed }, 
        error: null 
      };
    }
    return { data: null, error: { message: result.error || 'Sign up failed' } };
  };

  const signOut = async () => {
    await cognito.signOut();
    setUser(null);
    return { error: null };
  };

  const confirmSignUp = async (email: string, code: string) => {
    const result = await cognito.confirmSignUp(email, code);
    if (result.success) {
      return { data: true, error: null };
    }
    return { data: null, error: { message: result.error || 'Confirmation failed' } };
  };

  return { 
    user, 
    session: user ? { user } : null, 
    loading, 
    signIn, 
    signUp, 
    signOut,
    confirmSignUp,
    refreshAuth: checkAuth,
  };
};
