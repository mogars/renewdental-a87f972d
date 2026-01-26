// API Configuration - Using local MySQL backend
// The app is configured to use the Express/MySQL backend

export const config = {
  // MySQL Backend URL (Express server)
  awsApiUrl: import.meta.env.VITE_AWS_API_URL || 'http://localhost:3001',
};

export type BackendType = 'mysql';

export function getActiveBackend(): BackendType {
  return 'mysql';
}
