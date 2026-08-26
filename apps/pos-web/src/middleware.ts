/**
 * CoffeeOS POS Web - NextAuth Middleware
 * Protección de rutas con autenticación
 */

import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// Bypass para los smoke tests de Playwright, que corren con `next dev`.
//
// Va gateado por NODE_ENV a propósito: en un build de producción la condición
// es estáticamente falsa y desaparece del bundle, así que no hay forma de
// activarla en runtime. La versión anterior usaba NEXT_PUBLIC_E2E_BYPASS_AUTH,
// que se inlinea en el bundle del cliente y habría dejado la app entera sin
// autenticación si esa variable se colaba en un build de producción.
const DISABLE_AUTH =
  process.env.NODE_ENV !== 'production' &&
  process.env.E2E_BYPASS_AUTH === 'true';

export default withAuth(
  function middleware(_req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        if (DISABLE_AUTH) return true;
        // Si el refresh del token falló, la sesión es inválida
        if (
          token &&
          (token as { error?: string }).error === 'RefreshAccessTokenError'
        )
          return false;
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
     * - images/ (assets estaticos de public/)
     *
     * `images` no estaba excluido, y eso rompia next/image para CUALQUIER
     * imagen local: el optimizador se pide la imagen a si mismo, sin cookie de
     * sesion; el middleware le devolvia un 307 al login y el optimizador
     * respondia 400 "isn't a valid image ... received null". No era solo que
     * faltara el placeholder: ninguna foto de producto habria cargado.
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|manifest.json|sw.js|images/|workbox-.*\\.js).*)',
  ],
};
