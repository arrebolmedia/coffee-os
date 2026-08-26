import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { logger } from '@/lib/logger';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      organizationId: string;
      locationId?: string;
      isSuperAdmin: boolean;
    };
    accessToken: string;
    error?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    locationId?: string;
    isSuperAdmin: boolean;
    accessToken: string;
    refreshToken: string;
    expiresIn?: number; // seconds until accessToken expires (from backend)
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
    organizationId: string;
    locationId?: string;
    isSuperAdmin: boolean;
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    error?: string;
  }
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Fallback used only when neither the backend response nor the JWT itself
// expose an expiry — kept short to fail fast.
const DEFAULT_ACCESS_TTL_MS = 15 * 60 * 1000;

/**
 * Resolve the absolute expiry timestamp (epoch ms) for an access token.
 * Priority:
 *   1. `expiresIn` (seconds) from the backend response.
 *   2. `exp` (epoch seconds) decoded from the JWT payload.
 *   3. Short default fallback.
 */
function resolveAccessTokenExpires(
  accessToken: string,
  expiresInSeconds?: number,
): number {
  if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
    return Date.now() + expiresInSeconds * 1000;
  }
  const payload = decodeJwtPayload(accessToken);
  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000;
  }
  return Date.now() + DEFAULT_ACCESS_TTL_MS;
}

function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    // base64url → base64
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
} | null> {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken ?? refreshToken,
      accessTokenExpires: resolveAccessTokenExpires(
        data.accessToken,
        data.expiresIn,
      ),
    };
  } catch {
    return null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'correo@ejemplo.com',
        },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email y contraseña son requeridos');
        }

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Credenciales inválidas');
          }

          const data = await response.json();

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            organizationId: data.user.organizationId,
            locationId: data.user.locationId,
            isSuperAdmin: data.user.isSuperAdmin || false,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
          };
        } catch (error) {
          logger.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          locationId: user.locationId,
          isSuperAdmin: user.isSuperAdmin,
          accessToken: user.accessToken,
          refreshToken: user.refreshToken,
          accessTokenExpires: resolveAccessTokenExpires(
            user.accessToken,
            user.expiresIn,
          ),
        };
      }

      if (Date.now() < token.accessTokenExpires) {
        return token;
      }

      const refreshed = await refreshAccessToken(token.refreshToken);
      if (!refreshed) {
        return { ...token, error: 'RefreshAccessTokenError' };
      }

      return { ...token, ...refreshed };
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        role: token.role,
        organizationId: token.organizationId,
        locationId: token.locationId,
        isSuperAdmin: token.isSuperAdmin,
      };
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/dashboard',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
