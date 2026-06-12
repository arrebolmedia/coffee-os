/**
 * CoffeeOS - Supplier Form Modal
 * Modal para crear y editar proveedores
 *
 * Campos alineados al CreateSupplierDto real del backend:
 * name, contact_person, email, phone, address, payment_terms,
 * lead_time_days, active.
 */

'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  DollarSign,
  Loader2,
  MapPin,
  Save,
  User,
  X,
} from 'lucide-react';
import { Supplier } from '@/services/suppliers.service';
import { useCreateSupplier, useUpdateSupplier } from '@/hooks/use-suppliers';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (data: any) => void;
  supplier?: Supplier | null;
  isLoading?: boolean;
}

const PAYMENT_TERMS = [
  'Contado',
  '15 días',
  '30 días',
  '45 días',
  '60 días',
  '90 días',
];

interface SupplierFormState {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  payment_terms: string;
  lead_time_days: string;
  active: boolean;
}

const EMPTY_FORM: SupplierFormState = {
  name: '',
  contact_person: '',
  email: '',
  phone: '',
  address: '',
  payment_terms: 'Contado',
  lead_time_days: '',
  active: true,
};

export function SupplierFormModal({
  isOpen,
  onClose,
  onSubmit,
  supplier,
  isLoading: isLoadingProp = false,
}: SupplierFormModalProps) {
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const isLoading =
    isLoadingProp ||
    (createSupplier as any).isPending ||
    (updateSupplier as any).isPending ||
    false;
  const [formData, setFormData] = useState<SupplierFormState>(EMPTY_FORM);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        payment_terms: supplier.payment_terms || 'Contado',
        lead_time_days:
          supplier.lead_time_days != null
            ? String(supplier.lead_time_days)
            : '',
        active: supplier.active,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [supplier, isOpen]);

  const buildPayload = () => ({
    name: formData.name,
    contact_person: formData.contact_person || undefined,
    email: formData.email || undefined,
    phone: formData.phone || undefined,
    address: formData.address || undefined,
    payment_terms: formData.payment_terms || undefined,
    lead_time_days:
      formData.lead_time_days !== ''
        ? Number(formData.lead_time_days)
        : undefined,
    active: formData.active,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (onSubmit) {
      // El padre es responsable de la mutación (evita doble submit).
      onSubmit(payload);
      return;
    }
    if (supplier?.id) {
      updateSupplier.mutate({ id: supplier.id, data: payload });
    } else {
      createSupplier.mutate(payload as any);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800">
              {supplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información General */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nombre *
                </label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Café del Sur"
                />
              </div>
              <div className="flex items-end pb-2">
                <label
                  htmlFor="active"
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer"
                >
                  <input
                    id="active"
                    type="checkbox"
                    name="active"
                    checked={formData.active}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        active: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  Proveedor activo
                </label>
              </div>
            </div>
          </div>

          {/* Información de Contacto */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información de Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="contact_person"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Persona de Contacto
                </label>
                <input
                  id="contact_person"
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Teléfono
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="555-123-4567"
                />
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="contacto@cafedelsur.com"
                />
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Dirección
            </h3>
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Dirección
              </label>
              <input
                id="address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Av. Insurgentes Sur 123, Ciudad de México"
              />
            </div>
          </div>

          {/* Términos Comerciales */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Términos Comerciales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="payment_terms"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Términos de Pago
                </label>
                <select
                  id="payment_terms"
                  name="payment_terms"
                  value={formData.payment_terms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="lead_time_days"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Tiempo de Entrega (días)
                </label>
                <input
                  id="lead_time_days"
                  type="number"
                  min="0"
                  name="lead_time_days"
                  value={formData.lead_time_days}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="3"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {!isLoading && <Save className="w-4 h-4" />}
              <span>{supplier ? 'Guardar Cambios' : 'Crear Proveedor'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
