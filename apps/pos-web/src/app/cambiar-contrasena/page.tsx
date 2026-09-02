/**
 * Donde el empleado cambia la contraseña que le dictaron.
 *
 * Es la única salida de una sesión bloqueada: hasta que la cambie, el resto de
 * la API responde 403 porque la credencial la conocen dos personas. No existía
 * esta pantalla, y el backend mandaba a los empleados nuevos «a través del flujo
 * de recuperación» — que tampoco existía.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { logger } from '@/lib/logger';

const MINIMO = 8;

export default function CambiarContrasenaPage() {
  const router = useRouter();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hasta que React hidrate, el botón no manda nada.
  //
  // Sin esto, pulsarlo antes de que el manejador esté enganchado dispara el
  // envío NATIVO del formulario: el navegador recarga la página, y como los
  // campos no tienen `name`, ni siquiera manda los datos. El empleado ve la
  // pantalla parpadear y el formulario vacío otra vez, sin ningún mensaje. Es
  // una ventana corta, pero se abre justo después de una recarga dura —que es
  // exactamente como se llega aquí— y quien teclea rápido cae dentro.
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nueva.length < MINIMO) {
      return setError(
        `La contraseña nueva necesita al menos ${MINIMO} caracteres.`,
      );
    }
    if (nueva !== repetida) {
      return setError('Las dos contraseñas nuevas no coinciden.');
    }
    if (nueva === actual) {
      // El backend también lo rechaza; decirlo aquí ahorra el viaje.
      return setError('La nueva tiene que ser distinta de la que te dieron.');
    }

    setGuardando(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: actual,
        newPassword: nueva,
      });
      toast.success('Listo. Ya puedes usar el sistema.');
      router.push('/pos');
      router.refresh();
    } catch (err: any) {
      logger.error('Error al cambiar la contraseña:', err);
      setError(err?.message ?? 'No se pudo cambiar la contraseña.');
    } finally {
      setGuardando(false);
    }
  };

  const campo =
    'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-lg bg-amber-100 p-2 text-amber-700">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Elige tu contraseña
            </h1>
            <p className="text-sm text-gray-600">
              La que te dieron la conoce alguien más. Cámbiala para poder usar
              el sistema.
            </p>
          </div>
        </div>

        <form onSubmit={enviar} noValidate className="space-y-4">
          <div>
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="actual"
            >
              La contraseña que te dieron
            </label>
            <input
              id="actual"
              type="password"
              autoComplete="current-password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              required
              className={campo}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="nueva"
            >
              Tu contraseña nueva
            </label>
            <input
              id="nueva"
              type="password"
              autoComplete="new-password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              required
              minLength={MINIMO}
              className={campo}
            />
            <p className="mt-1 text-xs text-gray-500">
              Al menos {MINIMO} caracteres.
            </p>
          </div>

          <div>
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="repetida"
            >
              Repítela
            </label>
            <input
              id="repetida"
              type="password"
              autoComplete="new-password"
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              required
              className={campo}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={guardando || !montado}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
            {guardando ? 'Guardando…' : 'Guardar y entrar'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
