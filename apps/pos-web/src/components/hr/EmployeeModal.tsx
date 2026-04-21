/**
 * CoffeeOS POS Web - Employee Modal Component
 * Modal para crear/editar empleados con datos completos de RH
 */

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  InputField,
  SelectField,
  TextareaField,
} from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import {
  User,
  Briefcase,
  FileText,
  MapPin,
  Heart,
  AlertCircle,
} from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeFormData) => Promise<void>;
  employee?: EmployeeFormData | null;
  roles: Array<{ id: string; name: string }>;
  locations: Array<{ id: string; name: string }>;
}

export interface EmployeeFormData {
  id?: string;
  // Datos básicos (del modelo User)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string;
  organizationId?: string;
  avatar?: string;
  active: boolean;

  // Datos personales adicionales
  dateOfBirth?: string;
  gender?: string;
  bloodType?: string;
  allergies?: string;

  // Datos laborales
  position: string;
  department: string;
  hireDate: string;
  salary?: number;
  locationIds: string[]; // Multiple locations

  // Documentos oficiales (México)
  curp?: string;
  rfc?: string;
  nss?: string; // Número de Seguro Social

  // Contacto de emergencia
  emergencyContact?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Dirección
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;

  // Notas
  notes?: string;
}

const DEPARTMENTS = [
  { value: 'OPERATIONS', label: 'Operaciones' },
  { value: 'KITCHEN', label: 'Cocina' },
  { value: 'BAR', label: 'Barra' },
  { value: 'MANAGEMENT', label: 'Gerencia' },
  { value: 'HR', label: 'Recursos Humanos' },
  { value: 'FINANCE', label: 'Finanzas' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'MAINTENANCE', label: 'Mantenimiento' },
  { value: 'OTHER', label: 'Otro' },
];

const POSITIONS = [
  'Barista',
  'Barista Senior',
  'Cajero',
  'Supervisor de Turno',
  'Gerente de Tienda',
  'Gerente Regional',
  'Asistente Administrativo',
  'Contador',
  'Chef',
  'Ayudante de Cocina',
  'Limpieza',
  'Mantenimiento',
  'Community Manager',
  'Otro',
];

const GENDER_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'NB', label: 'No binario' },
  { value: 'NA', label: 'Prefiero no decir' },
];

const BLOOD_TYPES = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATES_MEXICO = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Coahuila',
  'Colima',
  'Ciudad de México',
  'Durango',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'México',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

export function EmployeeModal({
  isOpen,
  onClose,
  onSave,
  employee,
  roles,
  locations,
}: EmployeeModalProps) {
  const [activeTab, setActiveTab] = useState<
    'personal' | 'laboral' | 'documentos' | 'direccion'
  >('personal');
  const [formData, setFormData] = useState<EmployeeFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleId: '',
    active: true,
    position: '',
    department: 'OPERATIONS',
    hireDate: new Date().toISOString().split('T')[0],
    locationIds: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData(employee);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        roleId: '',
        active: true,
        position: '',
        department: 'OPERATIONS',
        hireDate: new Date().toISOString().split('T')[0],
        locationIds: [],
      });
    }
    setErrors({});
    setActiveTab('personal');
  }, [employee, isOpen]);

  const handleChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleLocationToggle = (locationId: string) => {
    const current = formData.locationIds || [];
    const updated = current.includes(locationId)
      ? current.filter((id) => id !== locationId)
      : [...current, locationId];
    handleChange('locationIds', updated);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields - Personal
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Los apellidos son requeridos';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es requerido';
    }

    // Required fields - Laboral
    if (!formData.roleId) {
      newErrors.roleId = 'El rol es requerido';
    }
    if (!formData.position.trim()) {
      newErrors.position = 'El puesto es requerido';
    }
    if (!formData.hireDate) {
      newErrors.hireDate = 'La fecha de ingreso es requerida';
    }
    if (formData.locationIds.length === 0) {
      newErrors.locationIds = 'Debe seleccionar al menos una sucursal';
    }

    // Validaciones específicas - Documentos
    if (formData.curp && formData.curp.length !== 18) {
      newErrors.curp = 'El CURP debe tener 18 caracteres';
    }
    if (
      formData.rfc &&
      (formData.rfc.length < 12 || formData.rfc.length > 13)
    ) {
      newErrors.rfc = 'El RFC debe tener 12 o 13 caracteres';
    }
    if (formData.nss && formData.nss.length !== 11) {
      newErrors.nss = 'El NSS debe tener 11 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Switch to tab with first error
      const errorFields = Object.keys(errors);
      if (
        errorFields.some((f) =>
          [
            'firstName',
            'lastName',
            'email',
            'phone',
            'gender',
            'dateOfBirth',
            'bloodType',
          ].includes(f),
        )
      ) {
        setActiveTab('personal');
      } else if (
        errorFields.some((f) =>
          [
            'roleId',
            'position',
            'department',
            'hireDate',
            'salary',
            'locationIds',
          ].includes(f),
        )
      ) {
        setActiveTab('laboral');
      } else if (
        errorFields.some((f) =>
          ['curp', 'rfc', 'nss', 'emergencyContact'].includes(f),
        )
      ) {
        setActiveTab('documentos');
      } else {
        setActiveTab('direccion');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving employee:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'personal' as const, label: 'Datos Personales', icon: User },
    { id: 'laboral' as const, label: 'Datos Laborales', icon: Briefcase },
    { id: 'documentos' as const, label: 'Documentos', icon: FileText },
    { id: 'direccion' as const, label: 'Dirección', icon: MapPin },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={employee?.id ? 'Editar Empleado' : 'Nuevo Empleado'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const hasError = Object.keys(errors).some((field) => {
                if (tab.id === 'personal')
                  return ['firstName', 'lastName', 'email', 'phone'].includes(
                    field,
                  );
                if (tab.id === 'laboral')
                  return [
                    'roleId',
                    'position',
                    'hireDate',
                    'locationIds',
                  ].includes(field);
                if (tab.id === 'documentos')
                  return ['curp', 'rfc', 'nss'].includes(field);
                if (tab.id === 'direccion')
                  return ['address', 'city', 'state'].includes(field);
                return false;
              });

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Nombre(s)"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  error={errors.firstName}
                  required
                  placeholder="Juan"
                />
                <InputField
                  label="Apellidos"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  error={errors.lastName}
                  required
                  placeholder="Pérez García"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  error={errors.email}
                  required
                  placeholder="empleado@coffeeos.com"
                />
                <InputField
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  error={errors.phone}
                  required
                  placeholder="5512345678"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="Fecha de Nacimiento"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                />
                <SelectField
                  label="Género"
                  value={formData.gender || ''}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  options={GENDER_OPTIONS}
                />
                <SelectField
                  label="Tipo de Sangre"
                  value={formData.bloodType || ''}
                  onChange={(e) => handleChange('bloodType', e.target.value)}
                  options={BLOOD_TYPES.map((type) => ({
                    value: type,
                    label: type || 'No especificado',
                  }))}
                />
              </div>

              <TextareaField
                label="Alergias o Condiciones Médicas"
                value={formData.allergies || ''}
                onChange={(e) => handleChange('allergies', e.target.value)}
                rows={2}
                placeholder="Ej: Alergia a mariscos, asma..."
              />
            </div>
          )}

          {/* Laboral Tab */}
          {activeTab === 'laboral' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Rol del Sistema"
                  value={formData.roleId}
                  onChange={(e) => handleChange('roleId', e.target.value)}
                  options={[
                    { value: '', label: 'Seleccionar rol...' },
                    ...roles.map((role) => ({
                      value: role.id,
                      label: role.name,
                    })),
                  ]}
                  error={errors.roleId}
                  required
                />
                <SelectField
                  label="Departamento"
                  value={formData.department}
                  onChange={(e) => handleChange('department', e.target.value)}
                  options={DEPARTMENTS}
                  required
                />
              </div>

              <InputField
                label="Puesto"
                value={formData.position}
                onChange={(e) => handleChange('position', e.target.value)}
                error={errors.position}
                required
                placeholder="Ej: Barista, Gerente..."
                list="positions-list"
              />
              <datalist id="positions-list">
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos} />
                ))}
              </datalist>

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Fecha de Ingreso"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => handleChange('hireDate', e.target.value)}
                  error={errors.hireDate}
                  required
                />
                <InputField
                  label="Salario Mensual (MXN)"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.salary || ''}
                  onChange={(e) =>
                    handleChange(
                      'salary',
                      parseFloat(e.target.value) || undefined,
                    )
                  }
                  placeholder="15000"
                  helperText="Opcional - Confidencial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sucursales Asignadas <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-gray-50">
                  {locations.map((location) => (
                    <label
                      key={location.id}
                      className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={formData.locationIds.includes(location.id)}
                        onChange={() => handleLocationToggle(location.id)}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm">{location.name}</span>
                    </label>
                  ))}
                </div>
                {errors.locationIds && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.locationIds}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Documentos Tab */}
          {activeTab === 'documentos' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Documentos Oficiales México</p>
                    <p className="text-blue-600 mt-1">
                      Información sensible - Manejo confidencial
                    </p>
                  </div>
                </div>
              </div>

              <InputField
                label="CURP"
                value={formData.curp || ''}
                onChange={(e) =>
                  handleChange('curp', e.target.value.toUpperCase())
                }
                error={errors.curp}
                placeholder="ABCD123456HDFRNN09"
                maxLength={18}
                helperText="18 caracteres - Clave Única de Registro de Población"
              />

              <InputField
                label="RFC"
                value={formData.rfc || ''}
                onChange={(e) =>
                  handleChange('rfc', e.target.value.toUpperCase())
                }
                error={errors.rfc}
                placeholder="ABCD123456ABC"
                maxLength={13}
                helperText="12 o 13 caracteres - Registro Federal de Contribuyentes"
              />

              <InputField
                label="NSS"
                value={formData.nss || ''}
                onChange={(e) =>
                  handleChange('nss', e.target.value.replace(/\D/g, ''))
                }
                error={errors.nss}
                placeholder="12345678901"
                maxLength={11}
                helperText="11 dígitos - Número de Seguro Social"
              />

              <div className="border-t pt-4 mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  Contacto de Emergencia
                </h3>
                <div className="space-y-4">
                  <InputField
                    label="Nombre Completo"
                    value={formData.emergencyContact || ''}
                    onChange={(e) =>
                      handleChange('emergencyContact', e.target.value)
                    }
                    placeholder="María Pérez"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Teléfono"
                      type="tel"
                      value={formData.emergencyContactPhone || ''}
                      onChange={(e) =>
                        handleChange('emergencyContactPhone', e.target.value)
                      }
                      placeholder="5512345678"
                    />
                    <InputField
                      label="Parentesco"
                      value={formData.emergencyContactRelation || ''}
                      onChange={(e) =>
                        handleChange('emergencyContactRelation', e.target.value)
                      }
                      placeholder="Esposa, Madre, Hermano..."
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dirección Tab */}
          {activeTab === 'direccion' && (
            <div className="space-y-4">
              <InputField
                label="Calle y Número"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Av. Insurgentes Sur 123, Col. Del Valle"
              />

              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="Ciudad"
                  value={formData.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ciudad de México"
                />
                <SelectField
                  label="Estado"
                  value={formData.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
                  options={[
                    { value: '', label: 'Seleccionar estado...' },
                    ...STATES_MEXICO.map((state) => ({
                      value: state,
                      label: state,
                    })),
                  ]}
                />
                <InputField
                  label="Código Postal"
                  value={formData.postalCode || ''}
                  onChange={(e) =>
                    handleChange(
                      'postalCode',
                      e.target.value.replace(/\D/g, ''),
                    )
                  }
                  placeholder="03100"
                  maxLength={5}
                />
              </div>

              <TextareaField
                label="Notas Adicionales"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
                placeholder="Información adicional sobre el empleado..."
              />
            </div>
          )}
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-2 pt-4 border-t">
          <input
            type="checkbox"
            id="active"
            checked={formData.active}
            onChange={(e) => handleChange('active', e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <label htmlFor="active" className="text-sm font-medium text-gray-700">
            Empleado activo
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {employee?.id ? 'Actualizar Empleado' : 'Crear Empleado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
