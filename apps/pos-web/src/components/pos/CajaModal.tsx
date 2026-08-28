'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import {
  useCloseCashRegister,
  useCurrentCashRegister,
  useOpenCashRegister,
} from '@/hooks/use-pos';
import type { CierreDeCaja } from '@/services/pos.service';

/**
 * Abrir y cerrar la caja del turno.
 *
 * La API, el cliente y los hooks existían desde hacía tiempo; lo que no había
 * era pantalla, así que el cajero no podía abrir la caja ni hacer el arqueo sin
 * llamar a la API a mano. Es lo primero y lo último que se hace cada día.
 *
 * Al cerrar se enseña el desglose completo —fondo, ventas en efectivo, lo que
 * debería haber, lo contado y la diferencia— porque una diferencia sin desglose
 * es un número que nadie puede comprobar.
 */

const dinero = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(n);

interface Props {
  abierto: boolean;
  onClose: () => void;
}

export function CajaModal({ abierto, onClose }: Props) {
  const { data: caja, isLoading } = useCurrentCashRegister();
  const abrir = useOpenCashRegister();
  const cerrar = useCloseCashRegister();

  const [fondo, setFondo] = useState('');
  const [contado, setContado] = useState('');
  const [notas, setNotas] = useState('');
  const [resultado, setResultado] = useState<CierreDeCaja | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!abierto) return null;

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const etiqueta = 'mb-1 block text-sm font-medium text-gray-700';

  // El backend calcula el esperado al vuelo; `expectedCash` a secas era sólo el
  // fondo de apertura.
  const fondoActual = caja?.opening_float ?? 0;
  const ventasEfectivo = caja?.cash_sales ?? 0;
  const esperado = caja?.expected_cash ?? fondoActual;
  const diferenciaPrevia = contado ? Number(contado) - esperado : null;

  const hacerApertura = async () => {
    setError(null);
    const monto = Number(fondo);
    if (!fondo || monto < 0) return setError('Escribe el fondo de apertura.');
    try {
      // El hook saca la sucursal y el usuario de la sesión.
      await abrir.mutateAsync(monto);
      setFondo('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo abrir la caja.');
    }
  };

  const hacerCierre = async () => {
    setError(null);
    if (!contado) return setError('Escribe cuánto contaste en el cajón.');
    try {
      const r = await cerrar.mutateAsync({
        registerId: caja!.id,
        finalAmount: Number(contado),
        notes: notas.trim() || undefined,
      });
      setResultado(r);
      setContado('');
      setNotas('');
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo cerrar la caja.');
    }
  };

  const cerrarTodo = () => {
    setResultado(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-caja"
        className="w-full max-w-md rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="titulo-caja" className="text-lg font-semibold text-gray-900">
            Caja
          </h2>
          <button
            type="button"
            onClick={cerrarTodo}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {isLoading && <p className="text-sm text-gray-500">Consultando…</p>}

          {/* Resultado del arqueo */}
          {resultado && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Caja cerrada. Así quedó el arqueo:
              </p>
              <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 p-4 text-sm">
                {[
                  ['Fondo de apertura', resultado.opening_float],
                  ['Ventas en efectivo', resultado.cash_sales],
                  ['Debería haber', resultado.expected_cash],
                  ['Contaste', resultado.counted_cash],
                ].map(([texto, valor]) => (
                  <div
                    key={String(texto)}
                    className="flex justify-between py-1"
                  >
                    <dt className="text-gray-600">{texto}</dt>
                    <dd className="font-medium text-gray-900">
                      {dinero(Number(valor))}
                    </dd>
                  </div>
                ))}
                <div className="flex justify-between pt-2">
                  <dt className="font-semibold text-gray-900">Diferencia</dt>
                  <dd
                    className={`font-bold ${
                      resultado.difference === 0
                        ? 'text-emerald-700'
                        : 'text-red-600'
                    }`}
                  >
                    {resultado.difference === 0
                      ? 'Sin diferencia'
                      : dinero(resultado.difference)}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Caja abierta: arqueo */}
          {!resultado && !isLoading && caja && (
            <div className="space-y-4">
              <dl className="divide-y divide-gray-100 rounded-lg bg-gray-50 p-4 text-sm">
                <div className="flex justify-between py-1">
                  <dt className="text-gray-600">Fondo de apertura</dt>
                  <dd className="font-medium">{dinero(fondoActual)}</dd>
                </div>
                <div className="flex justify-between py-1">
                  <dt className="text-gray-600">Ventas en efectivo</dt>
                  <dd className="font-medium">{dinero(ventasEfectivo)}</dd>
                </div>
                <div className="flex justify-between pt-2">
                  <dt className="font-semibold text-gray-900">
                    Debería haber en el cajón
                  </dt>
                  <dd className="font-bold text-gray-900">
                    {dinero(esperado)}
                  </dd>
                </div>
              </dl>

              <div>
                <label className={etiqueta} htmlFor="caja-contado">
                  ¿Cuánto contaste?
                </label>
                <input
                  id="caja-contado"
                  type="number"
                  step="0.01"
                  min="0"
                  className={campo}
                  value={contado}
                  onChange={(e) => setContado(e.target.value)}
                />
                {diferenciaPrevia !== null && (
                  <p
                    className={`mt-1 text-xs ${
                      Math.abs(diferenciaPrevia) < 0.005
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {Math.abs(diferenciaPrevia) < 0.005
                      ? 'Cuadra exactamente.'
                      : `${diferenciaPrevia > 0 ? 'Sobran' : 'Faltan'} ${dinero(Math.abs(diferenciaPrevia))}.`}
                  </p>
                )}
              </div>

              <div>
                <label className={etiqueta} htmlFor="caja-notas">
                  Notas (opcional)
                </label>
                <input
                  id="caja-notas"
                  className={campo}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Se pagó un pedido de leche del cajón"
                />
              </div>
            </div>
          )}

          {/* Sin caja abierta: apertura */}
          {!resultado && !isLoading && !caja && (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                No hay ninguna caja abierta. Abre una con el dinero que dejas de
                fondo para dar cambio.
              </p>
              <label className={etiqueta} htmlFor="caja-fondo">
                Fondo de apertura
              </label>
              <input
                id="caja-fondo"
                type="number"
                step="0.01"
                min="0"
                className={campo}
                value={fondo}
                onChange={(e) => setFondo(e.target.value)}
                placeholder="1000"
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={cerrarTodo}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            {resultado ? 'Listo' : 'Cancelar'}
          </button>
          {!resultado && !isLoading && !caja && (
            <button
              type="button"
              onClick={hacerApertura}
              disabled={abrir.isPending}
              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {abrir.isPending ? 'Abriendo…' : 'Abrir caja'}
            </button>
          )}
          {!resultado && !isLoading && caja && (
            <button
              type="button"
              onClick={hacerCierre}
              disabled={cerrar.isPending}
              className="rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {cerrar.isPending ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
