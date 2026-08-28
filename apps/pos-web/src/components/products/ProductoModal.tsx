'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  useCategories,
  useCreateProduct,
  useUpdateProduct,
} from '@/hooks/use-products';

/**
 * Alta y edición de un producto.
 *
 * Hasta ahora no existía: la pantalla de productos listaba y filtraba, y el
 * botón «Nuevo Producto» no tenía `onClick`. Sin esto no se puede cargar la
 * carta de la cafetería salvo llamando a la API a mano, que es lo que impedía
 * abrir el negocio con el sistema.
 *
 * Incluye el régimen fiscal —tasa y si el precio ya lleva el IVA dentro— con
 * las tres tasas que existen en México y una previsualización de lo que acabará
 * pagando el cliente, porque es donde más caro sale equivocarse.
 */

/** Las tasas de IVA que existen en México. No hay más, así que no se teclean. */
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

export interface ProductoEditable {
  id: string;
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  price: number;
  cost: number;
  barcode: string;
  trackInventory: boolean;
  taxRate: number;
  taxIncluded: boolean;
}

interface Props {
  /** `null` cierra el diálogo; `'nuevo'` abre un alta; un producto abre su edición. */
  producto: ProductoEditable | 'nuevo' | null;
  onClose: () => void;
}

const VACIO = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  price: '',
  cost: '',
  barcode: '',
  trackInventory: false,
  taxRate: 0.16,
  taxIncluded: false,
};

export function ProductoModal({ producto, onClose }: Props) {
  const crear = useCreateProduct();
  const actualizar = useUpdateProduct();
  const { data: categorias } = useCategories();

  const esAlta = producto === 'nuevo';
  const [form, setForm] = useState({ ...VACIO });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (producto === 'nuevo' || producto === null) {
      setForm({ ...VACIO });
    } else {
      setForm({
        name: producto.name,
        sku: producto.sku,
        description: producto.description,
        categoryId: producto.categoryId,
        price: String(producto.price),
        cost: String(producto.cost),
        barcode: producto.barcode,
        trackInventory: producto.trackInventory,
        taxRate: producto.taxRate,
        taxIncluded: producto.taxIncluded,
      });
    }
    setError(null);
  }, [producto]);

  if (producto === null) return null;

  const precio = Number(form.price) || 0;
  const base = form.taxIncluded ? precio / (1 + form.taxRate) : precio;
  const iva = form.taxIncluded ? precio - base : precio * form.taxRate;
  const dinero = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(n);

  const guardando = crear.isPending || actualizar.isPending;

  const guardar = async () => {
    setError(null);
    if (!form.name.trim()) return setError('El nombre es obligatorio.');
    if (!form.categoryId) return setError('Elige una categoría.');
    if (!form.price || Number(form.price) < 0)
      return setError('El precio de venta es obligatorio.');

    try {
      if (esAlta) {
        await crear.mutateAsync({
          category_id: form.categoryId,
          sku: form.sku.trim() || undefined,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          barcode: form.barcode.trim() || undefined,
          base_price: Number(form.price),
          cost: Number(form.cost) || 0,
          tax_rate: form.taxRate,
          tax_included: form.taxIncluded,
          track_inventory: form.trackInventory,
        });
      } else {
        await actualizar.mutateAsync({
          id: (producto as ProductoEditable).id,
          data: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            base_price: Number(form.price),
            cost: Number(form.cost) || 0,
            tax_rate: form.taxRate,
            tax_included: form.taxIncluded,
          },
        });
      }
      onClose();
    } catch (e: any) {
      // El mensaje del backend dice más que un «algo salió mal»: un SKU
      // repetido, una tasa fuera de rango.
      setError(e?.message ?? 'No se pudo guardar.');
    }
  };

  const campo = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';
  const etiqueta = 'mb-1 block text-sm font-medium text-gray-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-producto"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id="titulo-producto"
            className="text-lg font-semibold text-gray-900"
          >
            {esAlta
              ? 'Nuevo producto'
              : `Editar ${(producto as ProductoEditable).name}`}
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

        <div className="space-y-5 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={etiqueta} htmlFor="p-nombre">
                Nombre
              </label>
              <input
                id="p-nombre"
                className={campo}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Latte"
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="p-categoria">
                Categoría
              </label>
              <select
                id="p-categoria"
                className={campo}
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
                disabled={!esAlta}
              >
                <option value="">Elegir…</option>
                {(categorias ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={etiqueta} htmlFor="p-sku">
                SKU
              </label>
              <input
                id="p-sku"
                className={campo}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="CAF-LAT-001"
                disabled={!esAlta}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="p-precio">
                Precio de venta
              </label>
              <input
                id="p-precio"
                type="number"
                step="0.01"
                min="0"
                className={campo}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div>
              <label className={etiqueta} htmlFor="p-costo">
                Costo
              </label>
              <input
                id="p-costo"
                type="number"
                step="0.01"
                min="0"
                className={campo}
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={etiqueta} htmlFor="p-descripcion">
                Descripción
              </label>
              <textarea
                id="p-descripcion"
                rows={2}
                className={campo}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            {esAlta && (
              <div className="sm:col-span-2">
                <label className={etiqueta} htmlFor="p-barras">
                  Código de barras
                </label>
                <input
                  id="p-barras"
                  className={campo}
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({ ...form, barcode: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <fieldset className="border-t border-gray-200 pt-4">
            <legend className="mb-2 text-sm font-medium text-gray-700">
              IVA
            </legend>
            <div className="space-y-2">
              {TASAS.map((opcion) => (
                <label
                  key={opcion.etiqueta}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                    form.taxRate === opcion.valor
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tasa-iva"
                    className="mt-1"
                    checked={form.taxRate === opcion.valor}
                    onChange={() => setForm({ ...form, taxRate: opcion.valor })}
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

            <label className="mt-3 flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.taxIncluded}
                onChange={(e) =>
                  setForm({ ...form, taxIncluded: e.target.checked })
                }
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

            <div className="mt-3 rounded-lg bg-gray-50 p-4 text-sm">
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
                <span>{dinero(base + iva)}</span>
              </div>
            </div>
          </fieldset>

          {esAlta && (
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.trackInventory}
                onChange={(e) =>
                  setForm({ ...form, trackInventory: e.target.checked })
                }
              />
              <span className="text-sm text-gray-700">
                Rastrear inventario de este producto
              </span>
            </label>
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
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : esAlta ? 'Crear producto' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
