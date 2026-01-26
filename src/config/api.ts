// API Configuration - Now using PostgreSQL/AWS RDS backend
// The app is configured to use the Express/RDS backend with Cognito auth

export const config = {
  // AWS Backend is now the default
  useAwsBackend: true,
  
  // AWS Backend URL (Express server)
  awsApiUrl: import.meta.env.VITE_AWS_API_URL || 'http://localhost:3001',
  
  // AWS Cognito configuration
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
  },
  
  // Supabase configuration (legacy - kept for reference)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
};

export type BackendType = 'supabase' | 'aws';

export function getActiveBackend(): BackendType {
  return config.useAwsBackend ? 'aws' : 'supabase';
}
