/**
 * CoffeeOS Admin - Authentication Service
 * Handles login, register, token refresh, and session management
 */

import { apiClient } from '@/lib/api-client';
import { AuthResponse, User } from '@/types';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
}

class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      
      // Store tokens and user info
      this.setSession(response);
      
      return response;
    } catch (error) {
      console.error('[AuthService] Login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      
      // Store tokens and user info
      this.setSession(response);
      
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });

      // Update tokens
      this.setSession(response);

      return response;
    } catch (error) {
      console.error('Refresh token error:', error);
      this.logout();
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      
      // Update cached user info
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_user', JSON.stringify(response));
      }
      
      return response;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      await apiClient.post('/auth/change-password', data);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Call backend logout endpoint (if exists)
      await apiClient.post('/auth/logout').catch(() => {
        // Ignore errors on logout
      });
    } finally {
      // Clear local session
      this.clearSession();
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    
    const token = localStorage.getItem('auth_token');
    return !!token;
  }

  /**
   * Get stored auth token
   */
  getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  /**
   * Get cached user info
   */
  getCachedUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userJson = localStorage.getItem('current_user');
    if (!userJson) return null;
    
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  }

  /**
   * Store session data
   */
  private setSession(authResponse: AuthResponse | any): void {
    if (typeof window === 'undefined') return;

    // Accept both snake_case and camelCase token names, and support
    // responses that may be wrapped under `data`.
    const payload = authResponse?.data ?? authResponse;

    const accessToken = payload?.accessToken ?? payload?.access_token;
    const refreshToken = payload?.refreshToken ?? payload?.refresh_token;
    const user = payload?.user;

    if (accessToken) {
      localStorage.setItem('auth_token', accessToken);
      // Store in cookie for Next.js middleware authentication
      document.cookie = `auth_token=${accessToken}; path=/; max-age=${7 * 24 * 60 * 60}`; // 7 days
    }
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    if (user) localStorage.setItem('current_user', JSON.stringify(user));

    // Store organization and location if available (support both keys)
    const orgId = user?.organizationId ?? user?.organization_id;
    const locId = user?.locationId ?? user?.location_id;

    if (orgId) localStorage.setItem('organization_id', orgId);
    if (locId) localStorage.setItem('location_id', locId);
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('location_id');
    
    // Clear auth_token cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

export const authService = new AuthService();
