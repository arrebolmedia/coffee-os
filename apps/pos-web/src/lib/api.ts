/**
 * CoffeeOS POS Web - API Fetch Wrapper
 * Cliente HTTP simple usando fetch con NextAuth
 */

import { getSession } from 'next-auth/react';
import toast from 'react-hot-toast';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Wrapper de fetch con manejo automático de autenticación
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {},
): Promise<T> {
  const { requiresAuth = true, ...fetchOptions } = options;

  // Obtener sesión si es necesario
  let session = null;
  if (requiresAuth) {
    try {
      session = await getSession();
    } catch (error) {
      console.error('Error getting session:', error);
    }
  }

  // Construir URL completa con organization_id automático
  let url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Agregar organization_id automáticamente a query params si no está presente
  if (session?.user?.organizationId && !url.includes('organization_id=')) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}organization_id=${session.user.organizationId}`;
  }

  // Headers por defecto
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Copiar headers adicionales
  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      headers[key] = String(value);
    });
  }

  // Agregar token de autenticación y headers de contexto
  if (requiresAuth && session) {
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }

    // Context de organización en headers también
    if (session?.user?.organizationId) {
      headers['X-Organization-Id'] = session.user.organizationId;
    }

    if (session?.user?.locationId) {
      headers['X-Location-Id'] = session.user.locationId;
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Manejar errores HTTP
    if (!response.ok) {
      await handleErrorResponse(response);
    }

    // Si es 204 No Content, retornar null
    if (response.status === 204) {
      return null as T;
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    // Solo loguear en consola, no mostrar toast (ya lo hizo handleErrorResponse)
    console.error('API Fetch error:', error);
    throw error;
  }
}

/**
 * Manejo de respuestas de error
 */
async function handleErrorResponse(response: Response): Promise<never> {
  let errorMessage = 'Error en la solicitud';

  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
  } catch {
    // Si no se puede parsear el JSON, usar el status text
    errorMessage = response.statusText || errorMessage;
  }

  // Manejo específico por código de estado (SOLO MOSTRAR TOAST PARA ERRORES CRÍTICOS)
  switch (response.status) {
    case 401:
      toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      break;

    case 403:
      toast.error('No tienes permisos para realizar esta acción.');
      break;

    case 404:
      // No mostrar toast para 404, solo loguear
      console.warn('Resource not found:', errorMessage);
      break;

    case 409:
      toast.error(errorMessage);
      break;

    case 422:
      // No mostrar toast para errores de validación, dejar que el componente los maneje
      console.warn('Validation error:', errorMessage);
      break;

    case 429:
      toast.error('Demasiadas solicitudes. Por favor, espera un momento.');
      break;

    case 500:
    case 502:
    case 503:
      toast.error('Error del servidor. Intenta de nuevo más tarde.');
      break;

    default:
      // Solo loguear otros errores
      console.error('API Error:', response.status, errorMessage);
      break;
  }

  throw new Error(errorMessage);
}

/**
 * Helper para construir query params
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Métodos HTTP helpers
 */
export const api = {
  get: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
