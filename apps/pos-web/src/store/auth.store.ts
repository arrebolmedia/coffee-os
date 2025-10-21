/**
 * CoffeeOS POS Web - Auth Store
 * Estado global de autenticación usando Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, OrganizationContext } from '@/types';
import { apiClient } from '@/lib/api-client';

interface AuthState {
  user: User | null;
  context: OrganizationContext | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setContext: (context: OrganizationContext) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      context: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ============================================================================
      // LOGIN
      // ============================================================================
      login: async (email, password) => {
        set({ isLoading: true, error: null });

        try {
          const response = await apiClient.login(email, password);
          const user = response.data.user;

          // Set default context to user's organization and location
          const context: OrganizationContext = {
            organization_id: user.organization_id,
            location_id: user.location_id || '',
          };

          set({
            user,
            context,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            user: null,
            context: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Error al iniciar sesión',
          });
          throw error;
        }
      },

      // ============================================================================
      // LOGOUT
      // ============================================================================
      logout: async () => {
        set({ isLoading: true });

        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Error durante logout:', error);
        } finally {
          set({
            user: null,
            context: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // ============================================================================
      // SET USER
      // ============================================================================
      setUser: (user) => {
        const context: OrganizationContext = {
          organization_id: user.organization_id,
          location_id: user.location_id || '',
        };

        set({
          user,
          context,
          isAuthenticated: true,
        });
      },

      // ============================================================================
      // SET CONTEXT
      // ============================================================================
      setContext: (context) => {
        set({ context });
      },

      // ============================================================================
      // CLEAR ERROR
      // ============================================================================
      clearError: () => {
        set({ error: null });
      },

      // ============================================================================
      // CHECK AUTH
      // ============================================================================
      checkAuth: async () => {
        const token = apiClient.getAccessToken();
        
        if (!token) {
          set({
            user: null,
            context: null,
            isAuthenticated: false,
          });
          return;
        }

        try {
          // Verify token is still valid by making a request
          // This will trigger token refresh if needed
          const response = await apiClient.get<User>('/auth/me');
          
          const user = response.data;
          const context: OrganizationContext = {
            organization_id: user.organization_id,
            location_id: user.location_id || '',
          };

          set({
            user,
            context,
            isAuthenticated: true,
          });
        } catch (error) {
          set({
            user: null,
            context: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'coffeeos-auth',
      partialize: (state) => ({
        user: state.user,
        context: state.context,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
