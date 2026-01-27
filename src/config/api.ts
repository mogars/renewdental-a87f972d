// API Configuration - Using local MySQL backend
// The app is configured to use the Express/MySQL backend

export const config = {
  // MySQL Backend URL (Express server)
  get awsApiUrl() {
    const saved = localStorage.getItem("mysql_database_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.awsApiUrl) return parsed.awsApiUrl;
      } catch (e) {
        console.error("Failed to parse saved config", e);
      }
    }
    return import.meta.env.VITE_AWS_API_URL || 'http://localhost:3001';
  }
};

export type BackendType = 'mysql';

export function getActiveBackend(): BackendType {
  return 'mysql';
}
