'use client';

import { Modal } from '@/components/ui/Modal';

/**
 * Ficha de un producto, en solo lectura.
 *
 * El botón del ojo de la tabla de productos no tenía `onClick`: estaba pintado
 * y no hacía nada. Enseña lo que la fila recorta —la descripción, el código de
 * barras, el régimen fiscal completo, el margen— sin pretender ser el editor de
 * productos que sigue faltando.
 */

export interface ProductoDetalle {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  margin: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  barcode: string;
  trackInventory: boolean;
  stockQuantity: number;
  taxRate: number;
  taxIncluded: boolean;
}

const ESTADOS: Record<ProductoDetalle['status'], string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  DRAFT: 'Borrador',
  ARCHIVED: 'Archivado',
};

interface Props {
  producto: ProductoDetalle | null;
  onClose: () => void;
}

export function ProductoDetalleModal({ producto, onClose }: Props) {
  if (!producto) return null;

  const dinero = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(n);

  const iva =
    producto.taxRate === 0
      ? 'Tasa 0'
      : `${(producto.taxRate * 100).toFixed(0)} %`;

  const filas: Array<[string, string]> = [
    ['SKU', producto.sku || '—'],
    ['Categoría', producto.category],
    ['Código de barras', producto.barcode || '—'],
    ['Precio de venta', dinero(producto.price)],
    ['Costo', dinero(producto.cost)],
    ['Margen', `${producto.margin.toFixed(1)} %`],
    [
      'IVA',
      producto.taxIncluded
        ? `${iva}, incluido en el precio`
        : `${iva}, por fuera`,
    ],
    [
      'Inventario',
      producto.trackInventory
        ? `${producto.stockQuantity} unidades`
        : 'No se rastrea',
    ],
    ['Estado', ESTADOS[producto.status]],
  ];

  return (
    <Modal isOpen onClose={onClose} title={producto.name} size="md">
      <div className="space-y-4">
        {producto.description && (
          <p className="text-sm text-gray-600">{producto.description}</p>
        )}

        <dl className="divide-y divide-gray-100">
          {filas.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="flex justify-between py-2 text-sm">
              <dt className="text-gray-500">{etiqueta}</dt>
              <dd className="font-medium text-gray-900">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}
