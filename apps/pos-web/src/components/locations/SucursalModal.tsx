'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateLocation } from '@/hooks/use-locations';

/**
 * Alta de una sucursal.
 *
 * La pantalla las listaba y no había forma de crear una: no existía siquiera un
 * hook, sólo el de actualizar. Una cafetería que abre su segundo local no podía
 * darlo de alta desde la interfaz.
 *
 * La zona horaria importa más de lo que parece: con ella se recorta el día del
 * corte de caja y del estado de resultados. Un local en Tijuana cierra la caja
 * una hora antes que uno en Ciudad de México, y el sistema tiene que saberlo.
 */

/** Las zonas de México, que es donde opera esto. */
const ZONAS = [
  ['America/Mexico_City', 'Centro (Ciudad de México)'],
  ['America/Cancun', 'Sureste (Cancún)'],
  ['America/Chihuahua', 'Pacífico (Chihuahua)'],
  ['America/Hermosillo', 'Sonora (Hermosillo)'],
  ['America/Tijuana', 'Noroeste (Tijuana)'],
] as const;

interface Props {
  abierto: boolean;
  onClose: () => void;
}

export function SucursalModal({ abierto, onClose }: Props) {
  const crear = useCreateLocation();

  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    phone: '',
    email: '',
    timezone: 'America/Mexico_City',
  });
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const etiqueta = 'mb-1 block text-sm font-medium text-gray-700';

  const guardar = async () => {
    setError(null);
    if (!form.name.trim()) return setError('La sucursal necesita un nombre.');

    try {
      await crear.mutateAsync({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        postal_code: form.postal_code.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        timezone: form.timezone,
      });
      setForm({ ...form, name: '', address: '', city: '', postal_code: '' });
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo crear la sucursal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-sucursal"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="titulo-sucursal"
            className="text-lg font-semibold text-gray-900"
          >
            Nueva sucursal
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="suc-nombre">
              Nombre
            </label>
            <input
              id="suc-nombre"
              className={campo}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sucursal Roma Norte"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="suc-direccion">
              Dirección
            </label>
            <input
              id="suc-direccion"
              className={campo}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Av. Álvaro Obregón 100"
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="suc-ciudad">
              Ciudad
            </label>
            <input
              id="suc-ciudad"
              className={campo}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="suc-estado">
              Estado
            </label>
            <input
              id="suc-estado"
              className={campo}
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="suc-cp">
              Código postal
            </label>
            <input
              id="suc-cp"
              className={campo}
              value={form.postal_code}
              onChange={(e) =>
                setForm({ ...form, postal_code: e.target.value })
              }
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="suc-telefono">
              Teléfono
            </label>
            <input
              id="suc-telefono"
              className={campo}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="suc-correo">
              Correo
            </label>
            <input
              id="suc-correo"
              type="email"
              className={campo}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={etiqueta} htmlFor="suc-zona">
              Zona horaria
            </label>
            <select
              id="suc-zona"
              className={campo}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {ZONAS.map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Con esto se recorta el día del corte de caja y del estado de
              resultados.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 sm:col-span-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={crear.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {crear.isPending ? 'Creando…' : 'Crear sucursal'}
          </button>
        </div>
      </div>
    </div>
  );
}
