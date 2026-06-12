/**
 * CoffeeOS - Customer Modal
 * Modal para crear/editar clientes con programa de lealtad
 */

'use client';

import { useEffect, useState } from 'react';
import { Calendar, Gift, Heart, MapPin, Phone, User, X } from 'lucide-react';
import { Customer } from '@/types';

interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  preferences?: string;
  allergies?: string;
  notes?: string;
  // LFPDPPP — el backend exige estos booleanos al crear
  consent_marketing: boolean;
  consent_whatsapp: boolean;
  consent_email: boolean;
  consent_sms: boolean;
}

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Customer>) => void;
  customer?: Customer | null;
  title?: string;
}

export function CustomerModal({
  isOpen,
  onClose,
  onSave,
  customer = null,
  title,
}: CustomerModalProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    preferences: '',
    allergies: '',
    notes: '',
    consent_marketing: false,
    consent_whatsapp: false,
    consent_email: false,
    consent_sms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setFormData({
        name:
          [customer.firstName, customer.lastName].filter(Boolean).join(' ') ||
          '',
        email: customer.email || '',
        phone: customer.phone || '',
        date_of_birth: customer.dateOfBirth
          ? new Date(customer.dateOfBirth).toISOString().split('T')[0]
          : '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        preferences: customer.dietaryRestrictions || '',
        allergies: customer.allergies || '',
        notes: customer.notes || '',
        consent_marketing: customer.consentMarketing ?? false,
        consent_whatsapp: customer.consentWhatsapp ?? false,
        consent_email: customer.consentEmail ?? false,
        consent_sms: customer.consentSms ?? false,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        preferences: '',
        allergies: '',
        notes: '',
        consent_marketing: false,
        consent_whatsapp: false,
        consent_email: false,
        consent_sms: false,
      });
    }
    setErrors({});
  }, [customer, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().split(/\s+/).length < 2) {
      // El backend (CreateCustomerDto) exige first_name Y last_name no vacíos
      newErrors.name = 'Ingresa nombre y apellido';
    }

    if (!formData.phone?.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'El teléfono debe tener 10 dígitos';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // El servicio mapea estos campos camelCase al DTO snake_case del backend
      // (CreateCustomerDto exige first_name/last_name + consent_* booleanos).
      const nameParts = (formData.name || '').trim().split(/\s+/);
      const dataToSave: Partial<Customer> = {
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.date_of_birth || undefined,
        dietaryRestrictions: formData.preferences,
        allergies: formData.allergies,
        notes: formData.notes,
        consentMarketing: formData.consent_marketing,
        consentWhatsapp: formData.consent_whatsapp,
        consentEmail: formData.consent_email,
        consentSms: formData.consent_sms,
      };
      onSave(dataToSave);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800">
            {title || (customer ? 'Editar Cliente' : 'Nuevo Cliente')}
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
            {/* Información Personal */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Juan Pérez García"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Fecha de Nacimiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="date"
                      name="date_of_birth"
                      value={formData.date_of_birth}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Para campañas de cumpleaños
                  </p>
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contacto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="5512345678"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Requerido para programa de lealtad
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="juan@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Dirección
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Dirección */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calle y Número
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Av. Reforma 123"
                  />
                </div>

                {/* Ciudad, Estado, CP */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="CDMX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CP
                    </label>
                    <input
                      type="text"
                      name="postal_code"
                      value={formData.postal_code}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="06600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Preferencias */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                Preferencias
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {/* Preferencias */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferencias de Café
                  </label>
                  <input
                    type="text"
                    name="preferences"
                    value={formData.preferences}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Americano, sin azúcar, leche de almendra"
                  />
                </div>

                {/* Alergias */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alergias
                  </label>
                  <input
                    type="text"
                    name="allergies"
                    value={formData.allergies}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Lactosa, nueces"
                  />
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Cliente frecuente, prefiere mesa junto a la ventana..."
                  />
                </div>
              </div>
            </div>

            {/* Consentimientos LFPDPPP */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Consentimientos de Contacto (LFPDPPP)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="consent_marketing"
                    checked={formData.consent_marketing}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Acepta comunicaciones de marketing
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="consent_whatsapp"
                    checked={formData.consent_whatsapp}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Acepta mensajes por WhatsApp
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="consent_email"
                    checked={formData.consent_email}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Acepta comunicaciones por email
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="consent_sms"
                    checked={formData.consent_sms}
                    onChange={handleChange}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  Acepta mensajes SMS
                </label>
              </div>
            </div>

            {/* Loyalty Info (solo en edición) */}
            {customer && (
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-lg border border-pink-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-600" />
                  Programa de Lealtad
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Puntos Actuales</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {customer.loyaltyPoints || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Segmento RFM</p>
                    <p className="text-sm font-semibold text-purple-600">
                      {customer.rfmSegment || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Gastado</p>
                    <p className="text-lg font-semibold text-gray-700">
                      ${(customer.totalSpent || 0).toLocaleString('es-MX')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Visitas</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {customer.totalVisits || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              {customer ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
