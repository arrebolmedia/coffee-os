/**
 * CoffeeOS POS Web - Login Page
 * Página de inicio de sesión para el POS
 */

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@/lib/logger';

// Only accept relative paths as callbackUrl to prevent open-redirect attacks
// (e.g. ?callbackUrl=https://evil.com/phish, ?callbackUrl=//evil.com or
// ?callbackUrl=/\evil.com — browsers treat "/\" like "//").
function sanitizeCallbackUrl(raw: string | null): string {
  if (!raw) return '/dashboard';
  const ok =
    raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\');
  return ok ? raw : '/dashboard';
}

// In production we ship empty credentials; in dev we prefill demo creds for
// convenience.
const IS_DEV = process.env.NODE_ENV !== 'production';
const DEV_EMAIL_DEFAULT = IS_DEV ? 'owner@coffeedemo.mx' : '';
const DEV_PASSWORD_DEFAULT = IS_DEV ? 'password123' : '';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'));

  const [email, setEmail] = useState(DEV_EMAIL_DEFAULT);
  const [password, setPassword] = useState(DEV_PASSWORD_DEFAULT);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Hasta que React hidrate, el botón no manda nada.
  //
  // Sin esto, pulsarlo antes de que el manejador esté enganchado dispara el
  // envío NATIVO del formulario: el navegador recarga /login y el cajero ve la
  // pantalla parpadear con los campos otra vez vacíos, sin ningún mensaje. La
  // ventana es corta pero real —se veía en los e2e de WebKit, que es más
  // lento— y quien teclea rápido cae dentro.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error('Credenciales inválidas');
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        toast.success('¡Bienvenido a CoffeeOS!');
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      logger.error('Login error:', err);
      toast.error('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const demoLogins = [
    { email: 'owner@coffeedemo.mx', password: 'password123', role: 'Dueño' },
    {
      email: 'manager@coffeedemo.mx',
      password: 'password123',
      role: 'Gerente',
    },
    {
      email: 'barista@coffeedemo.mx',
      password: 'password123',
      role: 'Barista',
    },
  ];

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-xl">
            <Coffee className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CoffeeOS</h1>
          <p className="text-gray-600">Punto de Venta</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message - Now using toast instead */}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !montado}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión...
                </span>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Demo Accounts — only shown in development */}
          {IS_DEV && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-4">
                Cuentas de demostración:
              </p>
              <div className="space-y-2">
                {demoLogins.map((demo) => (
                  <button
                    key={demo.email}
                    onClick={() => handleDemoLogin(demo.email, demo.password)}
                    className="w-full px-4 py-2 text-left border-2 border-gray-200 rounded-lg hover:border-amber-500 hover:bg-amber-50 transition-all text-sm"
                  >
                    <div className="font-medium text-gray-900">{demo.role}</div>
                    <div className="text-gray-500 text-xs">{demo.email}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                Contraseña para todas:{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  password123
                </code>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          ¿Problemas para ingresar?{' '}
          <a
            href="#"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Contacta soporte
          </a>
        </p>
      </div>
    </div>
  );
}

// useSearchParams() obliga a Next 15 a renderizar del lado del cliente, y el
// build falla si no hay un limite de Suspense encima. El fallback replica el
// fondo y el logo para que no haya salto visual al hidratar.
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-xl">
              <Coffee className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">CoffeeOS</h1>
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin mx-auto mt-4" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
