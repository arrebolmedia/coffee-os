/**
 * CoffeeOS POS Web - Auth Store
 * Estado global de autenticación usando Zustand
 *
 * ⚠️ DEPRECATED: Este store está en proceso de deprecación.
 *
 * NextAuth (via useAuth hook) es ahora la FUENTE ÚNICA DE VERDAD para autenticación.
 *
 * MIGRATION PATH:
 * - OLD: useAuthStore((state) => state.context?.organization_id)
 * - NEW: const { user } = useAuth(); user?.organizationId
 *
 * Este archivo se mantiene temporalmente para compatibilidad legacy,
 * pero todos los nuevos componentes y hooks deben usar useAuth().
 *
 * TODO: Eliminar completamente una vez migrados todos los componentes legacy.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole, OrganizationContext } from '@/types';
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
          const response: any = await apiClient.login(email, password);
          // API devuelve user en camelCase, mapearlo a snake_case para el store
          const apiUser = response.user;

          const user: User = {
            id: apiUser.id,
            email: apiUser.email,
            name: `${apiUser.firstName} ${apiUser.lastName}`,
            role: 'BARISTA' as UserRole, // TODO: Obtener del API
            organization_id: apiUser.organizationId,
            location_id: 'demo-location-1', // TODO: Obtener del API
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          };

          // Set default context to user's organization and location
          const context: OrganizationContext = {
            organization_id: apiUser.organizationId,
            location_id: 'demo-location-1',
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
          const response = await apiClient.get<any>('/auth/me');
          const current = get().user;

          const apiUser = response.data;
          const organizationId =
            apiUser.organizationId || current?.organization_id || '';
          const locationId = apiUser.locationId || current?.location_id || '';

          const user: User = {
            id: apiUser.userId || apiUser.id || current?.id || 'current-user',
            email: apiUser.email || current?.email || '',
            name:
              apiUser.name ||
              `${apiUser.firstName ?? ''} ${apiUser.lastName ?? ''}`.trim() ||
              current?.name ||
              '',
            role: current?.role || UserRole.BARISTA,
            organization_id: organizationId,
            location_id: locationId,
            is_active: true,
            created_at: current?.created_at || new Date(),
            updated_at: new Date(),
          };

          const context: OrganizationContext = {
            organization_id: organizationId,
            location_id: locationId,
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
    },
  ),
);
