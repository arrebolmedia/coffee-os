import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse } from '@/types';

// TODO: Restore environment variable when Next.js build-time injection is fixed
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if exists
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add organization/location context
        const orgId = this.getOrganizationId();
        const locId = this.getLocationId();
        
        if (orgId) {
          config.headers['X-Organization-Id'] = orgId;
        }
        if (locId) {
          config.headers['X-Location-Id'] = locId;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (refreshed && error.config) {
            // Retry original request
            return this.client(error.config);
          } else {
            // Redirect to login
            this.logout();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private getOrganizationId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('organization_id');
  }

  private getLocationId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('location_id');
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) return false;

      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      // Support both snake_case and camelCase and also handle responses
      // wrapped under `data` or plain body.
      const payload = response.data && (response.data.data ?? response.data);

      const accessToken = payload?.access_token ?? payload?.accessToken;
      const newRefreshToken = payload?.refresh_token ?? payload?.refreshToken;

      if (accessToken) this.setAuthToken(accessToken);
      if (newRefreshToken) this.setRefreshToken(newRefreshToken);

      return !!accessToken;
    } catch (error) {
      return false;
    }
  }

  private logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('organization_id');
      localStorage.removeItem('location_id');
      window.location.href = '/login';
    }
  }

  // HTTP Methods
  // Generic HTTP helpers that tolerate responses wrapped in { data: ... }
  // or responses that return the payload at the top-level.
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, { params });
    return (response.data && (response.data.data ?? response.data)) as T;
  }

  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data);
    return (response.data && (response.data.data ?? response.data)) as T;
  }

  async put<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data);
    return (response.data && (response.data.data ?? response.data)) as T;
  }

  async patch<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data);
    return (response.data && (response.data.data ?? response.data)) as T;
  }

  async delete<T = any>(url: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url);
    return (response.data && (response.data.data ?? response.data)) as T;
  }

  // File upload
  async upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data as T;
  }

  // Upload FormData (for multi-field forms with files)
  async uploadFormData<T = any>(url: string, formData: FormData, method: 'POST' | 'PUT' = 'POST', onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.client.request<ApiResponse<T>>({
      url,
      method,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
