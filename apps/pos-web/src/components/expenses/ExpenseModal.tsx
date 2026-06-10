/**
 * CoffeeOS - Expense Modal
 * Modal para crear/editar gastos operativos
 */

'use client';

import { useEffect, useState } from 'react';
import { Calendar, CreditCard, DollarSign, User, X } from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
} from '@/types';

interface ExpenseFormData {
  category: ExpenseCategory;
  description: string;
  amount: number;
  tax_amount?: number;
  due_date?: string;
  status: ExpenseStatus;
  vendor_name?: string;
  vendor_rfc?: string;
  invoice_number?: string;
  payment_method?: ExpensePaymentMethod;
  paid_date?: string;
  payment_reference?: string;
  notes?: string;
  location_id?: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Expense>) => void;
  expense?: Expense | null;
  title?: string;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.RENT]: 'Renta',
  [ExpenseCategory.UTILITIES]: 'Servicios (Luz, Agua, Gas)',
  [ExpenseCategory.LABOR]: 'Nómina y Prestaciones',
  [ExpenseCategory.SUPPLIES]: 'Insumos Operativos',
  [ExpenseCategory.MARKETING]: 'Marketing y Publicidad',
  [ExpenseCategory.EQUIPMENT]: 'Equipo y Mantenimiento',
  [ExpenseCategory.INSURANCE]: 'Seguros',
  [ExpenseCategory.TAXES]: 'Impuestos',
  [ExpenseCategory.PROFESSIONAL_SERVICES]: 'Servicios Profesionales',
  [ExpenseCategory.PERMITS_LICENSES]: 'Permisos y Licencias',
  [ExpenseCategory.WASTE_MANAGEMENT]: 'Manejo de Residuos',
  [ExpenseCategory.SECURITY]: 'Seguridad',
  [ExpenseCategory.OTHER]: 'Otros',
};

const PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  [ExpensePaymentMethod.CASH]: 'Efectivo',
  [ExpensePaymentMethod.TRANSFER]: 'Transferencia',
  [ExpensePaymentMethod.CHECK]: 'Cheque',
  [ExpensePaymentMethod.CARD]: 'Tarjeta',
  [ExpensePaymentMethod.CREDIT]: 'Crédito',
};

export function ExpenseModal({
  isOpen,
  onClose,
  onSave,
  expense = null,
  title,
}: ExpenseModalProps) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category: ExpenseCategory.OTHER,
    description: '',
    amount: 0,
    tax_amount: 0,
    due_date: '',
    status: ExpenseStatus.PENDING,
    vendor_name: '',
    vendor_rfc: '',
    invoice_number: '',
    payment_method: undefined,
    paid_date: '',
    payment_reference: '',
    notes: '',
    location_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (expense) {
      setFormData({
        category: expense.category,
        description: expense.description || '',
        amount: expense.amount || 0,
        tax_amount: expense.tax_amount || 0,
        due_date: expense.due_date
          ? new Date(expense.due_date).toISOString().split('T')[0]
          : '',
        status: expense.status,
        vendor_name: expense.vendor_name || '',
        vendor_rfc: expense.vendor_rfc || '',
        invoice_number: expense.invoice_number || '',
        payment_method: expense.payment_method,
        paid_date: expense.paid_date
          ? new Date(expense.paid_date).toISOString().split('T')[0]
          : '',
        payment_reference: expense.payment_reference || '',
        notes: expense.notes || '',
        location_id: expense.location_id || '',
      });
    } else {
      setFormData({
        category: ExpenseCategory.OTHER,
        description: '',
        amount: 0,
        tax_amount: 0,
        due_date: '',
        status: ExpenseStatus.PENDING,
        vendor_name: '',
        vendor_rfc: '',
        invoice_number: '',
        payment_method: undefined,
        paid_date: '',
        payment_reference: '',
        notes: '',
        location_id: '',
      });
    }
    setErrors({});
  }, [expense, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const numValue = value === '' ? 0 : parseFloat(value);
    setFormData((prev) => ({ ...prev, [name]: numValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.description?.trim()) {
      newErrors.description = 'La descripción es requerida';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (!formData.category) {
      newErrors.category = 'La categoría es requerida';
    }

    if (
      formData.vendor_rfc &&
      !/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(formData.vendor_rfc.toUpperCase())
    ) {
      newErrors.vendor_rfc = 'RFC inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      const dataToSave: Partial<Expense> = {
        ...formData,
        total_amount: formData.amount + (formData.tax_amount || 0),
        due_date: formData.due_date ? new Date(formData.due_date) : undefined,
        paid_date: formData.paid_date
          ? new Date(formData.paid_date)
          : undefined,
        vendor_rfc: formData.vendor_rfc?.toUpperCase(),
      };
      onSave(dataToSave);
    }
  };

  if (!isOpen) return null;

  const totalAmount = formData.amount + (formData.tax_amount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {title || (expense ? 'Editar Gasto' : 'Nuevo Gasto')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Información del Gasto */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Información del Gasto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Estado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value={ExpenseStatus.PENDING}>Pendiente</option>
                    <option value={ExpenseStatus.PAID}>Pagado</option>
                    <option value={ExpenseStatus.OVERDUE}>Vencido</option>
                    <option value={ExpenseStatus.CANCELLED}>Cancelado</option>
                  </select>
                </div>

                {/* Descripción */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción/Concepto <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Ej: Compra de café en grano - Blend Casa"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Montos */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Montos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Subtotal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={formData.amount || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.amount ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                  )}
                </div>

                {/* IVA */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    IVA (16%)
                  </label>
                  <input
                    type="number"
                    name="tax_amount"
                    value={formData.tax_amount || ''}
                    onChange={handleNumberChange}
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        tax_amount: prev.amount * 0.16,
                      }))
                    }
                    className="mt-1 text-xs text-green-600 hover:underline"
                  >
                    Calcular automático
                  </button>
                </div>

                {/* Total */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-green-600">
                    $
                    {totalAmount.toLocaleString('es-MX', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Proveedor */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Información del Proveedor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    name="vendor_name"
                    value={formData.vendor_name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RFC
                  </label>
                  <input
                    type="text"
                    name="vendor_rfc"
                    value={formData.vendor_rfc}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase ${
                      errors.vendor_rfc ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="XAXX010101000"
                    maxLength={13}
                  />
                  {errors.vendor_rfc && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.vendor_rfc}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Factura
                  </label>
                  <input
                    type="text"
                    name="invoice_number"
                    value={formData.invoice_number}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="A-1234"
                  />
                </div>
              </div>
            </div>

            {/* Pago */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Información de Pago
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    name="due_date"
                    value={formData.due_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    name="payment_method"
                    value={formData.payment_method || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                {formData.status === ExpenseStatus.PAID && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Pago
                      </label>
                      <input
                        type="date"
                        name="paid_date"
                        value={formData.paid_date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Referencia de Pago
                      </label>
                      <input
                        type="text"
                        name="payment_reference"
                        value={formData.payment_reference}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Núm. de confirmación"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas Adicionales
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Notas internas, términos especiales, etc."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {expense ? 'Guardar Cambios' : 'Crear Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
