import { config } from '@/config/api';
import { getAccessToken, refreshSession } from './cognito';

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

class AwsApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.awsApiUrl;
  }

  private async getHeaders(): Promise<HeadersInit> {
    let token = getAccessToken();
    
    // Try to refresh if no token
    if (!token) {
      const refreshed = await refreshSession();
      if (refreshed) {
        token = getAccessToken();
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.error || 'Request failed' };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('API GET error:', error);
      return { data: null, error: 'Network error' };
    }
  }

  async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.error || 'Request failed' };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('API POST error:', error);
      return { data: null, error: 'Network error' };
    }
  }

  async put<T>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.error || 'Request failed' };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('API PUT error:', error);
      return { data: null, error: 'Network error' };
    }
  }

  async delete<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        return { data: null, error: error.error || 'Request failed' };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('API DELETE error:', error);
      return { data: null, error: 'Network error' };
    }
  }
}

export const awsApi = new AwsApiClient();
