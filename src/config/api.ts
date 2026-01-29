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
    
    // Auto-detect backend URL from current page's hostname
    // Use same-origin /api in production to avoid exposing port 3001
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol; // http: or https:
      const hostname = window.location.hostname; // IP or hostname
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
      if (isLocalhost) {
        return `${protocol}//${hostname}:3001`;
      }
      return `${protocol}//${hostname}/api`;
    }
    
    // Fallback for SSR or non-browser environments
    return import.meta.env.VITE_AWS_API_URL || 'http://localhost:3001';
  }
};

export type BackendType = 'mysql';

export function getActiveBackend(): BackendType {
  return 'mysql';
}
