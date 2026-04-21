/**
 * CoffeeOS POS Web - NextAuth.js API Route
 * Configuración de autenticación con NextAuth
 */

import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { JWT } from 'next-auth/jwt';

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
          // Backend API URL (already includes /api/v1 prefix)
          const apiUrl =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

          // Return user object with tokens
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
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.organizationId = user.organizationId;
        token.locationId = user.locationId;
        token.isSuperAdmin = user.isSuperAdmin;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }

      // TODO: Implement token refresh logic
      // Check if token is expired and refresh if needed

      return token;
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
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
