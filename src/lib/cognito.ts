import { supabase } from "@/integrations/supabase/client";

// Simple in-memory token storage for Cognito
let accessToken: string | null = null;
let idToken: string | null = null;
let refreshToken: string | null = null;
let userEmail: string | null = null;

interface CognitoUser {
  sub: string;
  email: string;
  email_verified: boolean;
  'cognito:groups'?: string[];
}

// Initialize from localStorage
function loadTokens() {
  accessToken = localStorage.getItem('cognito_access_token');
  idToken = localStorage.getItem('cognito_id_token');
  refreshToken = localStorage.getItem('cognito_refresh_token');
  userEmail = localStorage.getItem('cognito_user_email');
}

function saveTokens(tokens: { access?: string; id?: string; refresh?: string; email?: string }) {
  if (tokens.access) {
    accessToken = tokens.access;
    localStorage.setItem('cognito_access_token', tokens.access);
  }
  if (tokens.id) {
    idToken = tokens.id;
    localStorage.setItem('cognito_id_token', tokens.id);
  }
  if (tokens.refresh) {
    refreshToken = tokens.refresh;
    localStorage.setItem('cognito_refresh_token', tokens.refresh);
  }
  if (tokens.email) {
    userEmail = tokens.email;
    localStorage.setItem('cognito_user_email', tokens.email);
  }
}

function clearTokens() {
  accessToken = null;
  idToken = null;
  refreshToken = null;
  userEmail = null;
  localStorage.removeItem('cognito_access_token');
  localStorage.removeItem('cognito_id_token');
  localStorage.removeItem('cognito_refresh_token');
  localStorage.removeItem('cognito_user_email');
}

export function getAccessToken(): string | null {
  if (!accessToken) loadTokens();
  return accessToken;
}

export function getIdToken(): string | null {
  if (!idToken) loadTokens();
  return idToken;
}

// Parse JWT to get user info
function parseJwt(token: string): CognitoUser | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function getCurrentUser(): CognitoUser | null {
  const token = getIdToken();
  if (!token) return null;
  return parseJwt(token);
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  
  // Check if token is expired
  const payload = parseJwt(token);
  if (!payload) return false;
  
  const exp = (payload as any).exp;
  if (!exp) return false;
  
  return Date.now() < exp * 1000;
}

// Sign in with username and password using backend proxy
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('cognito-auth', {
      body: { action: 'signIn', email, password },
    });

    if (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message || 'Failed to sign in' };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    if (data.data?.AuthenticationResult) {
      saveTokens({
        access: data.data.AuthenticationResult.AccessToken,
        id: data.data.AuthenticationResult.IdToken,
        refresh: data.data.AuthenticationResult.RefreshToken,
        email: email,
      });
      return { success: true };
    }

    if (data.data?.ChallengeName) {
      return { success: false, error: `Challenge required: ${data.data.ChallengeName}` };
    }

    return { success: false, error: 'Authentication failed' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'Failed to sign in' };
  }
}

// Sign up a new user
export async function signUp(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; userConfirmed?: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke('cognito-auth', {
      body: { action: 'signUp', email, password },
    });

    if (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message || 'Failed to sign up' };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    if (data.data?.UserSub) {
      return { success: true, userConfirmed: data.data.UserConfirmed };
    }

    return { success: false, error: 'Sign up failed' };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'Failed to sign up' };
  }
}

// Confirm sign up with verification code
export async function confirmSignUp(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('cognito-auth', {
      body: { action: 'confirmSignUp', email, code },
    });

    if (error) {
      console.error('Confirm sign up error:', error);
      return { success: false, error: error.message || 'Failed to confirm sign up' };
    }

    if (data.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Confirm sign up error:', error);
    return { success: false, error: 'Failed to confirm sign up' };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  const token = getAccessToken();
  
  if (token) {
    try {
      await supabase.functions.invoke('cognito-auth', {
        body: { action: 'signOut', accessToken: token },
      });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }
  
  clearTokens();
}

// Refresh tokens
export async function refreshSession(): Promise<boolean> {
  if (!refreshToken) {
    loadTokens();
    if (!refreshToken) return false;
  }

  if (!userEmail) {
    loadTokens();
    if (!userEmail) return false;
  }

  try {
    const { data, error } = await supabase.functions.invoke('cognito-auth', {
      body: { action: 'refreshToken', refreshToken, email: userEmail },
    });

    if (error) {
      console.error('Refresh session error:', error);
      return false;
    }

    if (data.error) {
      return false;
    }

    if (data.data?.AuthenticationResult) {
      saveTokens({
        access: data.data.AuthenticationResult.AccessToken,
        id: data.data.AuthenticationResult.IdToken,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Refresh session error:', error);
    return false;
  }
}

// Initialize on load
loadTokens();
