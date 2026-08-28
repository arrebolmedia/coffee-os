'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateTemperatureLog } from '@/hooks/use-quality-control';
import { useAuth } from '@/hooks/use-auth';

/**
 * Registrar una toma de temperatura.
 *
 * La pantalla de calidad leía los registros y las alertas pero no había forma
 * de crear uno: el hook `useCreateTemperatureLog` existía y no lo llamaba
 * nadie. Para una cafetería mexicana esto no es un extra — la NOM-251 exige
 * llevar control de las temperaturas de conservación, y sin pantalla el
 * registro no se hacía.
 *
 * Los rangos que se muestran son los de referencia habituales; el sistema no
 * bloquea nada por ellos, sólo avisa mientras se teclea para que quien toma la
 * medida vea si está fuera antes de guardarla.
 */

const TIPOS = [
  {
    valor: 'REFRIGERATOR',
    etiqueta: 'Refrigerador',
    min: 0,
    max: 4,
    ayuda: 'Entre 0 y 4 °C',
  },
  {
    valor: 'FREEZER',
    etiqueta: 'Congelador',
    min: -22,
    max: -18,
    ayuda: 'Entre −22 y −18 °C',
  },
  {
    valor: 'HOT_HOLDING',
    etiqueta: 'Mantenimiento en caliente',
    min: 60,
    max: 100,
    ayuda: '60 °C o más',
  },
  {
    valor: 'COLD_HOLDING',
    etiqueta: 'Mantenimiento en frío',
    min: 0,
    max: 7,
    ayuda: '7 °C o menos',
  },
  {
    valor: 'COOKING',
    etiqueta: 'Cocción',
    min: 74,
    max: 100,
    ayuda: '74 °C o más en el centro',
  },
  {
    valor: 'COOLING',
    etiqueta: 'Enfriamiento',
    min: 0,
    max: 21,
    ayuda: 'De 60 a 21 °C en 2 horas',
  },
  {
    valor: 'RECEIVING',
    etiqueta: 'Recepción de mercancía',
    min: 0,
    max: 4,
    ayuda: 'Refrigerados a 4 °C o menos',
  },
] as const;

interface Props {
  abierto: boolean;
  onClose: () => void;
}

export function TemperaturaModal({ abierto, onClose }: Props) {
  const { user } = useAuth();
  const registrar = useCreateTemperatureLog();

  const [tipo, setTipo] = useState<string>('REFRIGERATOR');
  const [equipo, setEquipo] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [notas, setNotas] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const etiqueta = 'mb-1 block text-sm font-medium text-gray-700';

  const seleccionado = TIPOS.find((t) => t.valor === tipo)!;
  const grados = temperatura === '' ? null : Number(temperatura);
  const fueraDeRango =
    grados !== null &&
    Number.isFinite(grados) &&
    (grados < seleccionado.min || grados > seleccionado.max);

  const guardar = async () => {
    setError(null);
    if (!equipo.trim()) return setError('Escribe qué equipo se midió.');
    if (temperatura === '' || !Number.isFinite(Number(temperatura)))
      return setError('Escribe la temperatura.');
    if (!user?.locationId)
      return setError('El usuario no tiene una sucursal asignada.');

    try {
      await registrar.mutateAsync({
        location_id: user.locationId,
        type: tipo as never,
        temperature: Number(temperatura),
        unit: 'CELSIUS' as never,
        equipment_name: equipo.trim(),
        notes: notas.trim() || undefined,
      });
      setEquipo('');
      setTemperatura('');
      setNotas('');
      onClose();
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo registrar la temperatura.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-temperatura"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="titulo-temperatura"
            className="text-lg font-semibold text-gray-900"
          >
            Registrar temperatura
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

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className={etiqueta} htmlFor="temp-tipo">
              Qué se midió
            </label>
            <select
              id="temp-tipo"
              className={campo}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">{seleccionado.ayuda}</p>
          </div>

          <div>
            <label className={etiqueta} htmlFor="temp-equipo">
              Equipo
            </label>
            <input
              id="temp-equipo"
              className={campo}
              value={equipo}
              onChange={(e) => setEquipo(e.target.value)}
              placeholder="Refrigerador de barra"
            />
          </div>

          <div>
            <label className={etiqueta} htmlFor="temp-grados">
              Temperatura (°C)
            </label>
            <input
              id="temp-grados"
              type="number"
              step="0.1"
              className={campo}
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
            />
            {fueraDeRango && (
              <p className="mt-1 text-xs font-medium text-amber-700">
                Fuera del rango de referencia ({seleccionado.ayuda}). Se
                registra igual: el dato real es el que sirve.
              </p>
            )}
          </div>

          <div>
            <label className={etiqueta} htmlFor="temp-notas">
              Notas (opcional)
            </label>
            <input
              id="temp-notas"
              className={campo}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Se dejó la puerta abierta durante la carga"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
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
            disabled={registrar.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {registrar.isPending ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
