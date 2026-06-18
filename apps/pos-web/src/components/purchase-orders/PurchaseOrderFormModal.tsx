/**
 * CoffeeOS - Purchase Order Form Modal
 * Modal para crear órdenes de compra.
 *
 * Payload alineado al CreatePurchaseOrderDto real del backend (vía
 * useCreatePurchaseOrder, que inyecta organization_id + requested_by):
 * { supplier_id, items: [{ inventory_item_id, quantity_ordered, unit_price, notes? }],
 *   expected_delivery_date?, notes? }
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  FileText,
  Loader2,
  Plus,
  Save,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  useCreatePurchaseOrder,
  useFormatCurrency,
} from '@/hooks/use-purchase-orders';
import { useSuppliers } from '@/hooks/use-suppliers';
import { useInventory } from '@/hooks/use-inventory';

interface PurchaseOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LineItem {
  inventory_item_id: string;
  quantity_ordered: string;
  unit_price: string;
  notes: string;
}

const emptyLine = (): LineItem => ({
  inventory_item_id: '',
  quantity_ordered: '1',
  unit_price: '',
  notes: '',
});

const initialLines = (): LineItem[] => [emptyLine()];

export function PurchaseOrderFormModal({
  isOpen,
  onClose,
}: PurchaseOrderFormModalProps) {
  const createPurchaseOrder = useCreatePurchaseOrder();
  const formatCurrency = useFormatCurrency();
  const isPending = (createPurchaseOrder as { isPending?: boolean }).isPending;

  const { data: suppliers } = useSuppliers({ active: true });
  const { data: inventory } = useInventory();

  const [supplierId, setSupplierId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>(initialLines());

  // Reset whenever the modal opens or closes.
  useEffect(() => {
    setSupplierId('');
    setExpectedDeliveryDate('');
    setNotes('');
    setLines(initialLines());
  }, [isOpen]);

  const handleSelectItem = (index: number, inventoryItemId: string) => {
    const item = inventory?.find((it) => it.id === inventoryItemId);
    setLines((prev) =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              inventory_item_id: inventoryItemId,
              // Pre-llena el precio con el costo del insumo (editable).
              unit_price:
                item != null
                  ? String(item.cost_per_unit ?? '')
                  : line.unit_price,
            }
          : line,
      ),
    );
  };

  const handleLineChange = (
    index: number,
    field: 'quantity_ordered' | 'unit_price' | 'notes',
    value: string,
  ) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);

  const removeLine = (index: number) =>
    setLines((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );

  const lineSubtotal = (line: LineItem) => {
    const qty = Number(line.quantity_ordered);
    const price = Number(line.unit_price);
    if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
    return qty * price;
  };

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + lineSubtotal(line), 0),
    [lines],
  );

  const validLines = lines.filter((line) => {
    const qty = Number(line.quantity_ordered);
    const price = Number(line.unit_price);
    return (
      line.inventory_item_id !== '' &&
      Number.isFinite(qty) &&
      qty > 0 &&
      Number.isFinite(price) &&
      price >= 0
    );
  });

  const isValid = supplierId !== '' && validLines.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isPending) return;

    const payload = {
      supplier_id: supplierId,
      items: validLines.map((line) => ({
        inventory_item_id: line.inventory_item_id,
        quantity_ordered: Number(line.quantity_ordered),
        unit_price: Number(line.unit_price),
        ...(line.notes ? { notes: line.notes } : {}),
      })),
      ...(expectedDeliveryDate
        ? { expected_delivery_date: expectedDeliveryDate }
        : {}),
      ...(notes ? { notes } : {}),
    };

    createPurchaseOrder.mutate(payload, {
      onSuccess: () => {
        setSupplierId('');
        setExpectedDeliveryDate('');
        setNotes('');
        setLines(initialLines());
        onClose();
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">
              Nueva Orden de Compra
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Datos Generales */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Datos Generales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="supplier_id"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Proveedor *
                </label>
                <select
                  id="supplier_id"
                  name="supplier_id"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">Selecciona un proveedor</option>
                  {suppliers?.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="expected_delivery_date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Entrega Esperada
                  </span>
                </label>
                <input
                  id="expected_delivery_date"
                  type="date"
                  name="expected_delivery_date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Ítems
              </h3>
              <button
                type="button"
                onClick={addLine}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-indigo-300 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar ítem
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="pb-2 pr-2">Insumo</th>
                    <th className="pb-2 px-2 w-28">Cantidad</th>
                    <th className="pb-2 px-2 w-32">Precio Unit.</th>
                    <th className="pb-2 px-2 w-32 text-right">Subtotal</th>
                    <th className="pb-2 pl-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="align-top">
                      <td className="py-2 pr-2">
                        <select
                          aria-label={`Insumo ${index + 1}`}
                          value={line.inventory_item_id}
                          onChange={(e) =>
                            handleSelectItem(index, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="">Selecciona un insumo</option>
                          {inventory?.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                              {item.sku ? ` (${item.sku})` : ''}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Cantidad ${index + 1}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={line.quantity_ordered}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              'quantity_ordered',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          aria-label={`Precio unitario ${index + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_price}
                          onChange={(e) =>
                            handleLineChange(
                              index,
                              'unit_price',
                              e.target.value,
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                        {formatCurrency(lineSubtotal(line))}
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 1}
                          aria-label={`Eliminar ítem ${index + 1}`}
                          className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notas
            </label>
            <textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Notas para el proveedor (opcional)"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Total:{' '}
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(total)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isPending}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!isValid || isPending}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Crear Orden</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
