import { getCognitoClientConfig } from "@/lib/cognitoClientConfig";

// Simple in-memory token storage for Cognito
let accessToken: string | null = null;
let idToken: string | null = null;
let refreshToken: string | null = null;

function getCognitoEndpoint(region: string) {
  return `https://cognito-idp.${region}.amazonaws.com`;
}

interface CognitoTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

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
}

function saveTokens(tokens: { access?: string; id?: string; refresh?: string }) {
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
}

function clearTokens() {
  accessToken = null;
  idToken = null;
  refreshToken = null;
  localStorage.removeItem('cognito_access_token');
  localStorage.removeItem('cognito_id_token');
  localStorage.removeItem('cognito_refresh_token');
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

// Sign in with username and password using Cognito USER_PASSWORD_AUTH flow
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { clientId, region } = await getCognitoClientConfig();
    const response = await fetch(getCognitoEndpoint(region), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      }),
    });

    const data = await response.json();

    if (data.AuthenticationResult) {
      saveTokens({
        access: data.AuthenticationResult.AccessToken,
        id: data.AuthenticationResult.IdToken,
        refresh: data.AuthenticationResult.RefreshToken,
      });
      return { success: true };
    }

    if (data.ChallengeName) {
      // Handle challenges like NEW_PASSWORD_REQUIRED, MFA, etc.
      return { success: false, error: `Challenge required: ${data.ChallengeName}` };
    }

    return { success: false, error: data.message || 'Authentication failed' };
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
    const { clientId, region } = await getCognitoClientConfig();
    const response = await fetch(getCognitoEndpoint(region), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
      },
      body: JSON.stringify({
        ClientId: clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
        ],
      }),
    });

    const data = await response.json();

    if (data.UserSub) {
      return { success: true, userConfirmed: data.UserConfirmed };
    }

    return { success: false, error: data.message || 'Sign up failed' };
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
    const { clientId, region } = await getCognitoClientConfig();
    const response = await fetch(getCognitoEndpoint(region), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
      },
      body: JSON.stringify({
        ClientId: clientId,
        Username: email,
        ConfirmationCode: code,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      return { success: true };
    }

    return { success: false, error: data.message || 'Confirmation failed' };
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
      const { region } = await getCognitoClientConfig();
      await fetch(getCognitoEndpoint(region), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.GlobalSignOut',
        },
        body: JSON.stringify({
          AccessToken: token,
        }),
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

  try {
    const { clientId, region } = await getCognitoClientConfig();
    const response = await fetch(getCognitoEndpoint(region), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify({
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        ClientId: clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }),
    });

    const data = await response.json();

    if (data.AuthenticationResult) {
      saveTokens({
        access: data.AuthenticationResult.AccessToken,
        id: data.AuthenticationResult.IdToken,
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
