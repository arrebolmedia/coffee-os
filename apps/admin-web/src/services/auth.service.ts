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
      console.error('Login error:', error);
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
  private setSession(authResponse: AuthResponse): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem('auth_token', authResponse.access_token);
    localStorage.setItem('refresh_token', authResponse.refresh_token);
    localStorage.setItem('current_user', JSON.stringify(authResponse.user));

    // Store organization and location if available
    if (authResponse.user.organization_id) {
      localStorage.setItem('organization_id', authResponse.user.organization_id);
    }
    if (authResponse.user.location_id) {
      localStorage.setItem('location_id', authResponse.user.location_id);
    }
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
  }
}

export const authService = new AuthService();
