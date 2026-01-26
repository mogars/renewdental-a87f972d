// API Configuration for switching between Supabase and AWS RDS backend
// Set USE_AWS_BACKEND=true to use the Express/RDS backend instead of Supabase

export const config = {
  // Toggle this to switch between backends
  useAwsBackend: import.meta.env.VITE_USE_AWS_BACKEND === 'true',
  
  // AWS Backend URL (Express server)
  awsApiUrl: import.meta.env.VITE_AWS_API_URL || 'http://localhost:3001',
  
  // AWS Cognito configuration
  cognito: {
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
    region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
  },
  
  // Supabase configuration (existing)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  },
};

export type BackendType = 'supabase' | 'aws';

export function getActiveBackend(): BackendType {
  return config.useAwsBackend ? 'aws' : 'supabase';
}
