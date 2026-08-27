'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useUpdateProduct } from '@/hooks/use-products';

/**
 * Editor del régimen fiscal de un producto.
 *
 * Hasta ahora la tasa de IVA sólo se podía tocar llamando a la API a mano: la
 * página de productos no tenía ningún formulario y los botones de la tabla no
 * llevaban `onClick`. Eso dejaba sin salida el caso que motivó esto — el pan
 * para llevar tributa a tasa 0 por el artículo 2-A de la LIVA y toda la
 * panadería estaba dada de alta al 16 %.
 *
 * Es deliberadamente estrecho: sólo la tasa y si el precio ya la lleva dentro.
 * No pretende ser el editor de productos que falta.
 */

/** Las tasas que existen en México. No hay más, así que no se teclean. */
const TASAS = [
  {
    valor: 0.16,
    etiqueta: '16 %',
    ayuda: 'Tasa general: bebidas preparadas, alimentos servidos en el local',
  },
  {
    valor: 0.08,
    etiqueta: '8 %',
    ayuda: 'Región fronteriza norte y sur, con registro previo ante el SAT',
  },
  {
    valor: 0,
    etiqueta: 'Tasa 0',
    ayuda:
      'Alimentos no preparados para llevar: pan, leche, fruta (art. 2-A LIVA)',
  },
] as const;

interface Props {
  producto: {
    id: string;
    name: string;
    price: number;
    taxRate: number;
    taxIncluded: boolean;
  } | null;
  onClose: () => void;
}

export function RegimenFiscalModal({ producto, onClose }: Props) {
  const actualizar = useUpdateProduct();
  const [tasa, setTasa] = useState(0.16);
  const [incluido, setIncluido] = useState(false);

  useEffect(() => {
    if (producto) {
      setTasa(producto.taxRate);
      setIncluido(producto.taxIncluded);
    }
  }, [producto]);

  if (!producto) return null;

  // Lo que verá el cliente, con la misma cuenta que hacen el carrito y el
  // backend. Enseñarlo aquí evita la duda de si «incluido» sube o baja el total.
  const base = incluido ? producto.price / (1 + tasa) : producto.price;
  const iva = incluido ? producto.price - base : producto.price * tasa;
  const totalCliente = base + iva;
  const dinero = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(n);

  const guardar = async () => {
    await actualizar.mutateAsync({
      id: producto.id,
      data: { tax_rate: tasa, tax_included: incluido },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-regimen-fiscal"
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2
              id="titulo-regimen-fiscal"
              className="text-lg font-semibold text-gray-900"
            >
              Régimen fiscal
            </h2>
            <p className="text-sm text-gray-500">{producto.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700">
              Tasa de IVA
            </legend>
            <div className="space-y-2">
              {TASAS.map((opcion) => (
                <label
                  key={opcion.etiqueta}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    tasa === opcion.valor
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tasa-iva"
                    className="mt-1"
                    checked={tasa === opcion.valor}
                    onChange={() => setTasa(opcion.valor)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900">
                      {opcion.etiqueta}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {opcion.ayuda}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={incluido}
              onChange={(e) => setIncluido(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">
                El precio ya lleva el IVA dentro
              </span>
              <span className="block text-xs text-gray-500">
                El cliente paga exactamente el precio de la carta; el impuesto
                se desglosa a partir de él en vez de sumarse encima.
              </span>
            </span>
          </label>

          <div className="rounded-lg bg-gray-50 p-4 text-sm">
            <p className="mb-2 font-medium text-gray-700">
              Lo que pagará el cliente
            </p>
            <div className="flex justify-between text-gray-600">
              <span>Base gravable</span>
              <span>{dinero(base)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>IVA</span>
              <span>{dinero(iva)}</span>
            </div>
            <div className="mt-1 flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-900">
              <span>Total</span>
              <span>{dinero(totalCliente)}</span>
            </div>
          </div>
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
            disabled={actualizar.isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {actualizar.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
