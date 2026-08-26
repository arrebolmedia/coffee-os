/**
 * InventoryItemModal - Create/Edit inventory items
 */

'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import {
  InputField,
  SelectField,
  TextareaField,
} from '@/components/ui/FormField';
import { Save } from 'lucide-react';
import { CategoryModal } from './CategoryModal';

// Predefined categories for inventory (can be extended).
// A nivel de módulo a propósito: si se declara dentro del componente se recrea en
// cada render, y al añadirla a las deps del useEffect de reset el formulario se
// limpiaría solo en cada render.
const PREDEFINED_CATEGORIES = [
  'Café en Grano',
  'Lácteos',
  'Jarabes',
  'Bebidas',
  'Insumos',
  'Desechables',
  'Otros',
];

export interface InventoryItem {
  id?: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unitOfMeasure: string;
  costPerUnit: number;
  parLevel: number;
  reorderPoint: number;
  active: boolean;
}

interface InventoryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => Promise<void>;
  item?: InventoryItem | null;
  isLoading?: boolean;
  organizationId: string; // Required for loading categories
}

const UNITS = [
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'oz', label: 'Onzas (oz)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'fl_oz', label: 'Onzas fluidas (fl oz)' },
  { value: 'gal', label: 'Galones (gal)' },
  { value: 'unit', label: 'Unidades' },
  { value: 'piece', label: 'Piezas' },
  { value: 'box', label: 'Cajas' },
  { value: 'bag', label: 'Bolsas' },
  { value: 'bottle', label: 'Botellas' },
  { value: 'can', label: 'Latas' },
];

export function InventoryItemModal({
  isOpen,
  onClose,
  onSave,
  item,
  isLoading = false,
  organizationId,
}: InventoryItemModalProps) {
  const [formData, setFormData] = useState<InventoryItem>({
    code: '',
    name: '',
    description: '',
    category: '',
    unitOfMeasure: 'unit',
    costPerUnit: 0,
    parLevel: 0,
    reorderPoint: 0,
    active: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Build category options including current item's category if it exists
  const categoryOptions = PREDEFINED_CATEGORIES.map((cat) => ({
    value: cat,
    label: cat,
  }));

  // Add current category if it's not in predefined list (for edit mode)
  if (formData.category && !PREDEFINED_CATEGORIES.includes(formData.category)) {
    categoryOptions.unshift({
      value: formData.category,
      label: formData.category,
    });
  }

  // Add "Create new" option
  const categoriesWithCreate = [
    ...categoryOptions,
    { value: '__CREATE_NEW__', label: '+ Crear nueva categoría' },
  ];

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else {
      // Reset to empty form for new items
      // Set first predefined category as default
      setFormData({
        code: '',
        name: '',
        description: '',
        category: PREDEFINED_CATEGORIES[0], // Default to first category
        unitOfMeasure: 'unit',
        costPerUnit: 0,
        parLevel: 0,
        reorderPoint: 0,
        active: true,
      });
    }
    setErrors({});
  }, [item, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Solo validar código si no estamos editando (el código no se puede cambiar al editar)
    if (!item) {
      if (!formData.code || !formData.code.trim()) {
        newErrors.code = 'El código es requerido';
      } else if (!/^[A-Z0-9-]+$/.test(formData.code)) {
        newErrors.code =
          'El código debe contener solo MAYÚSCULAS, números y guiones';
      } else if (formData.code.length > 50) {
        newErrors.code = 'El código debe tener máximo 50 caracteres';
      }
    }

    if (!formData.name || !formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.category) {
      newErrors.category = 'Debes seleccionar una categoría';
    }

    if (formData.costPerUnit < 0) {
      newErrors.costPerUnit = 'El costo debe ser mayor o igual a 0';
    }
    if (formData.parLevel < 0) {
      newErrors.parLevel = 'El nivel par debe ser mayor o igual a 0';
    }
    if (formData.reorderPoint < 0) {
      newErrors.reorderPoint = 'El punto de reorden debe ser mayor o igual a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate organizationId
    if (!organizationId || organizationId.trim() === '') {
      setErrors({
        ...errors,
        name: 'Error: No hay organización configurada. Por favor inicia sesión correctamente.',
      });
      return;
    }

    if (validateForm()) {
      // Transform data to match backend validation - only send required/accepted fields
      const backendData: any = {
        ...(item?.id ? { id: item.id } : {}),
        organization_id: organizationId,
        sku: formData.code?.toUpperCase() || formData.code,
        name: formData.name,
        description: formData.description || '',
        unit_of_measure: formData.unitOfMeasure,
        cost_per_unit: Number(formData.costPerUnit) || 0,
        par_level: Number(formData.parLevel) || 0,
      };

      await onSave(backendData);
    }
  };

  const handleChange = (
    field: keyof InventoryItem,
    value: string | number | boolean,
  ) => {
    // Auto-transform code to uppercase
    if (field === 'code' && typeof value === 'string') {
      value = value.toUpperCase();
    }

    // Handle category selection
    if (field === 'category' && value === '__CREATE_NEW__') {
      setShowCreateCategory(true);
      return; // Don't update form data
    }

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

  const handleCreateCategory = async (categoryName: string) => {
    // Simply set the category name - it will be saved with the inventory item
    // (category is a plain string field, not a relation)
    setFormData((prev) => ({ ...prev, category: categoryName }));
    setShowCreateCategory(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          item
            ? 'Editar Producto de Inventario'
            : 'Nuevo Producto de Inventario'
        }
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Código"
              placeholder="COFF-001"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              error={errors.code}
              required
              disabled={!!item} // No se puede cambiar el código al editar
              helperText="Solo MAYÚSCULAS, números y guiones"
            />

            <InputField
              label="Nombre"
              placeholder="Café en Grano Premium"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              required
            />
          </div>

          <TextareaField
            label="Descripción"
            placeholder="Descripción del producto..."
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <SelectField
                label="Categoría"
                options={categoriesWithCreate}
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                required
                error={errors.category}
                helperText={
                  errors.category || 'Selecciona o crea una categoría'
                }
              />
            </div>

            <SelectField
              label="Unidad de Medida"
              options={UNITS}
              value={formData.unitOfMeasure}
              onChange={(e) => handleChange('unitOfMeasure', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <InputField
              label="Costo por Unidad"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.costPerUnit}
              onChange={(e) =>
                handleChange('costPerUnit', parseFloat(e.target.value) || 0)
              }
              error={errors.costPerUnit}
              required
              helperText="MXN"
            />

            <InputField
              label="Nivel Par"
              type="number"
              placeholder="100"
              value={formData.parLevel}
              onChange={(e) =>
                handleChange('parLevel', parseInt(e.target.value) || 0)
              }
              error={errors.parLevel}
              required
              helperText="Stock ideal"
            />

            <InputField
              label="Punto de Reorden"
              type="number"
              placeholder="20"
              value={formData.reorderPoint}
              onChange={(e) =>
                handleChange('reorderPoint', parseInt(e.target.value) || 0)
              }
              error={errors.reorderPoint}
              required
              helperText="Alerta stock bajo"
            />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => handleChange('active', e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="active"
              className="text-sm font-medium text-gray-700"
            >
              Producto activo
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              isLoading={isLoading}
              leftIcon={<Save className="w-4 h-4" />}
            >
              {item ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Creation Modal */}
      <CategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        onSave={handleCreateCategory}
      />
    </>
  );
}
