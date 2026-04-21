/**
 * CoffeeOS POS Web - NextAuth Middleware
 * Protección de rutas con autenticación
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// Allow Playwright smoke tests to run without authentication when explicitly requested.
const DISABLE_AUTH =
  process.env.NEXT_PUBLIC_E2E_BYPASS_AUTH === 'true' ||
  process.env.E2E_TEST === 'true';

export default withAuth(
  function middleware(req) {
    // Si el modo de test está activo, bypass la autenticación
    if (DISABLE_AUTH) {
      return NextResponse.next();
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Si está en modo test, permitir acceso
        if (DISABLE_AUTH) return true;
        // De lo contrario, verificar que exista un token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (authentication endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - workbox-*.js (workbox files)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
};
