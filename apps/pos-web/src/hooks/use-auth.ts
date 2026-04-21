/**
 * CoffeeOS POS Web - useAuth Hook
 * Hook personalizado para acceder a la sesión de NextAuth
 */

'use client';

import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    accessToken: session?.accessToken,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    session,
  };
}
