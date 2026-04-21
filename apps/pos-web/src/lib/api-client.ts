/**
 * CoffeeOS POS Web - API Client
 * Cliente HTTP para comunicación con el backend
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { ApiResponse, ApiError } from '@/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
const API_TIMEOUT = 30000; // 30 seconds

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  // ============================================================================
  // SETUP & CONFIGURATION
  // ============================================================================

  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 - Try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      },
    );
  }

  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    this.accessToken = null;
    this.refreshToken = null;
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async login(email: string, password: string): Promise<ApiResponse<any>> {
    const response = await this.client.post('/auth/login', { email, password });
    // API devuelve camelCase (accessToken) no snake_case (access_token)
    const { accessToken, refreshToken } = response.data;
    this.saveTokensToStorage(accessToken, refreshToken);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/auth/refresh', {
      refreshToken: this.refreshToken,
    });

    const { accessToken, refreshToken } = response.data;
    this.saveTokensToStorage(accessToken, refreshToken);
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // ============================================================================
  // HTTP METHODS
  // ============================================================================

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T> & Record<string, any>> {
    const response = await this.client.get(url, config);
    return this.normalizeResponse<T>(response.data);
  }

  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T> & Record<string, any>> {
    const response = await this.client.post(url, data, config);
    return this.normalizeResponse<T>(response.data);
  }

  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T> & Record<string, any>> {
    const response = await this.client.put(url, data, config);
    return this.normalizeResponse<T>(response.data);
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T> & Record<string, any>> {
    const response = await this.client.patch(url, data, config);
    return this.normalizeResponse<T>(response.data);
  }

  async delete<T>(
    url: string,
    config?: AxiosRequestConfig,
  ): Promise<ApiResponse<T> & Record<string, any>> {
    const response = await this.client.delete(url, config);
    return this.normalizeResponse<T>(response.data);
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const apiError: ApiError = {
        message: (error.response.data as any)?.message || 'Error del servidor',
        statusCode: error.response.status,
        error: (error.response.data as any)?.error,
        details: (error.response.data as any)?.details,
      };
      return apiError;
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'No se pudo conectar con el servidor',
        statusCode: 0,
        error: 'NETWORK_ERROR',
      };
    } else {
      // Error setting up request
      return {
        message: error.message || 'Error desconocido',
        statusCode: 0,
        error: 'UNKNOWN_ERROR',
      };
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  getBaseURL(): string {
    return API_BASE_URL;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  private normalizeResponse<T>(
    payload: any,
  ): ApiResponse<T> & Record<string, any> {
    if (Array.isArray(payload)) {
      return {
        data: payload as unknown as T,
        success: true,
      };
    }

    if (payload && typeof payload === 'object') {
      const { data, message, success, ...rest } = payload as Record<
        string,
        any
      >;

      if (data !== undefined) {
        return {
          data: data as T,
          message,
          success: typeof success === 'boolean' ? success : true,
          ...rest,
        };
      }

      return {
        data: payload as T,
        success: true,
      };
    }

    return {
      data: payload as T,
      success: true,
    };
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export default ApiClient;
