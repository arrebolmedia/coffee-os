/**
 * CoffeeOS POS Web - API Fetch Wrapper
 * Cliente HTTP simple usando fetch con NextAuth
 */

import { getSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

// Body types that fetch can send raw without JSON.stringify and that should
// NOT have an explicit Content-Type set (the browser does it).
function isRawBody(body: unknown): boolean {
  if (body == null) return false;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true;
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true;
  if (
    typeof ArrayBuffer !== 'undefined' &&
    (body instanceof ArrayBuffer ||
      (ArrayBuffer.isView && ArrayBuffer.isView(body as any)))
  )
    return true;
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    return true;
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
    return true;
  return false;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  params?: Record<string, any>;
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
      logger.error('Error getting session:', error);
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  // Headers por defecto. NO setear Content-Type si el body es FormData/Blob —
  // el browser necesita generar el boundary correcto para multipart.
  const headers: Record<string, string> = {};
  if (!isRawBody(fetchOptions.body)) {
    headers['Content-Type'] = 'application/json';
  }

  // Copiar headers adicionales
  if (fetchOptions.headers) {
    Object.entries(fetchOptions.headers).forEach(([key, value]) => {
      headers[key] = String(value);
    });
  }

  if (requiresAuth) {
    if (session?.accessToken)
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    if (session?.user?.organizationId)
      headers['X-Organization-Id'] = session.user.organizationId;
    if (session?.user?.locationId)
      headers['X-Location-Id'] = session.user.locationId;
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

    // Cuerpo vacío -> null, sin intentar parsearlo.
    //
    // Antes sólo se contemplaba el 204, pero hay endpoints que responden 200
    // con el cuerpo vacío. Ahí `response.json()` lanza
    // "Unexpected end of JSON input", el error sube como fallo de red y la
    // query se queda en estado de error: es lo que llenaba la consola del POS
    // desde use-costing. Se mira el texto en vez del status porque el status
    // no basta para saber si viene algo.
    if (response.status === 204 || response.status === 205) {
      return null as T;
    }

    const text = await response.text();
    if (text.trim() === '') {
      return null as T;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    // Solo loguear en consola, no mostrar toast (ya lo hizo handleErrorResponse)
    logger.error('API Fetch error:', error);
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
        // Llamar a signOut limpia la sesión de NextAuth antes de redirigir,
        // evitando un loop donde el cliente sigue mandando el token expirado.
        try {
          await signOut({ callbackUrl: '/login', redirect: true });
        } catch {
          window.location.href = '/login';
        }
      }
      break;

    case 403:
      toast.error('No tienes permisos para realizar esta acción.');
      break;

    case 404:
      // No mostrar toast para 404, solo loguear
      logger.warn('Resource not found:', errorMessage);
      break;

    case 409:
      toast.error(errorMessage);
      break;

    case 422:
      // No mostrar toast para errores de validación, dejar que el componente los maneje
      logger.warn('Validation error:', errorMessage);
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
      logger.error('API Error:', response.status, errorMessage);
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
    // La cadena vacía se descarta igual que null/undefined: un filtro que el
    // usuario dejó en blanco significa "sin filtro", no "filtra por vacío".
    // Enviarla producía `?startDate=`, que el API rechaza — y antes de que P&L
    // validara sus fechas, construía `new Date('')` y devolvía 500 en sus
    // cuatro endpoints. Los arrays se respetan tal cual: ahí cada elemento es
    // una elección explícita.
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Serialize a body for the HTTP helpers: FormData/Blob/etc. are passed
 * through untouched; everything else is JSON.stringify'd.
 */
function serializeBody(data: any): BodyInit | undefined {
  if (data === undefined || data === null) return undefined;
  if (isRawBody(data)) return data as BodyInit;
  return JSON.stringify(data);
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
      body: serializeBody(data),
    }),

  put: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: serializeBody(data),
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: serializeBody(data),
    }),

  delete: <T = any>(endpoint: string, options?: FetchOptions) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
