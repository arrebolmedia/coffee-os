/**
 * CoffeeOS POS Web - Recipe Modal Component
 * Modal para crear/editar recetas
 */

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import {
  InputField,
  SelectField,
  TextareaField,
} from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { IngredientsList, RecipeIngredientInput } from './IngredientsList';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recipe: RecipeFormData) => Promise<void>;
  recipe?: RecipeFormData | null;
  inventoryItems: Array<{ id: string; name: string; unitOfMeasure: string }>;
  categories: string[];
}

export interface RecipeFormData {
  id?: string;
  productId: string;
  name: string;
  description: string;
  instructions: string;
  category?: string;
  prepTime: number; // in minutes for UI, converted to seconds for API
  yield: number;
  yieldUnit: string;
  allergens: string[];
  videoUrl: string;
  active: boolean;
  ingredients: RecipeIngredientInput[];
}

const YIELD_UNITS = [
  { value: 'unit', label: 'Unidades' },
  { value: 'serving', label: 'Porciones' },
  { value: 'ml', label: 'Mililitros' },
  { value: 'l', label: 'Litros' },
  { value: 'g', label: 'Gramos' },
  { value: 'kg', label: 'Kilogramos' },
];

const ALLERGEN_OPTIONS = [
  'Gluten',
  'Lácteos',
  'Nueces',
  'Soya',
  'Huevo',
  'Pescado',
  'Mariscos',
  'Cacahuates',
  'Ajonjolí',
  'Sulfitos',
];

export function RecipeModal({
  isOpen,
  onClose,
  onSave,
  recipe,
  inventoryItems,
  categories,
}: RecipeModalProps) {
  const [formData, setFormData] = useState<RecipeFormData>({
    productId: '',
    name: '',
    description: '',
    instructions: '',
    category: '',
    prepTime: 0,
    yield: 1,
    yieldUnit: 'unit',
    allergens: [],
    videoUrl: '',
    active: true,
    ingredients: [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ingredientErrors, setIngredientErrors] = useState<
    Record<number, string>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (recipe) {
      setFormData({
        ...recipe,
        prepTime: recipe.prepTime || 0, // Already in minutes from parent
      });
    } else {
      setFormData({
        productId: '',
        name: '',
        description: '',
        instructions: '',
        category: categories.length > 0 ? categories[0] : '',
        prepTime: 0,
        yield: 1,
        yieldUnit: 'unit',
        allergens: [],
        videoUrl: '',
        active: true,
        ingredients: [],
      });
    }
    setErrors({});
    setIngredientErrors({});
  }, [recipe, isOpen]);

  const handleChange = (
    field: keyof RecipeFormData,
    value: string | number | boolean | string[] | RecipeIngredientInput[],
  ) => {
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

  const handleAllergenToggle = (allergen: string) => {
    const allergens = formData.allergens.includes(allergen)
      ? formData.allergens.filter((a) => a !== allergen)
      : [...formData.allergens, allergen];
    handleChange('allergens', allergens);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newIngredientErrors: Record<number, string> = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.productId) {
      newErrors.productId = 'El producto es requerido';
    }

    if (formData.prepTime <= 0) {
      newErrors.prepTime = 'El tiempo de preparación debe ser mayor a 0';
    }

    if (formData.yield <= 0) {
      newErrors.yield = 'El rendimiento debe ser mayor a 0';
    }

    // Validate ingredients
    if (formData.ingredients.length === 0) {
      newErrors.ingredients = 'Debe agregar al menos un ingrediente';
    } else {
      formData.ingredients.forEach((ingredient, index) => {
        if (!ingredient.inventoryItemId) {
          newIngredientErrors[index] = 'Seleccione un producto';
        } else if (ingredient.quantity <= 0) {
          newIngredientErrors[index] = 'La cantidad debe ser mayor a 0';
        }
      });
    }

    setErrors(newErrors);
    setIngredientErrors(newIngredientErrors);

    return (
      Object.keys(newErrors).length === 0 &&
      Object.keys(newIngredientErrors).length === 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // No conversion needed - prepTime is already in minutes
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={recipe?.id ? 'Editar Receta' : 'Nueva Receta'}
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          {/* Product ID - TODO: Convert to dropdown when products hook is available */}
          <InputField
            label="ID del Producto"
            value={formData.productId}
            onChange={(e) => handleChange('productId', e.target.value)}
            error={errors.productId}
            required
            placeholder="PRD-001"
            helperText="Ingrese el ID del producto asociado"
          />

          {/* Name */}
          <InputField
            label="Nombre de la Receta"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            required
            placeholder="Ej: Cappuccino Clásico"
          />
        </div>

        {/* Category */}
        <SelectField
          label="Categoría"
          value={formData.category || ''}
          onChange={(e) => handleChange('category', e.target.value)}
          options={[
            { value: '', label: 'Seleccione una categoría' },
            ...categories.map((cat) => ({ value: cat, label: cat })),
          ]}
          error={errors.category}
          helperText="Categoría de la receta"
        />

        {/* Description */}
        <TextareaField
          label="Descripción"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          placeholder="Describe brevemente la receta..."
        />

        {/* Instructions */}
        <TextareaField
          label="Instrucciones de Preparación"
          value={formData.instructions}
          onChange={(e) => handleChange('instructions', e.target.value)}
          rows={5}
          placeholder="1. Paso uno&#10;2. Paso dos&#10;3. Paso tres..."
          helperText="Detalla los pasos de preparación"
        />

        <div className="grid grid-cols-3 gap-4">
          {/* Prep Time */}
          <InputField
            label="Tiempo de Preparación (min)"
            type="number"
            min="1"
            value={formData.prepTime || ''}
            onChange={(e) =>
              handleChange('prepTime', parseInt(e.target.value) || 0)
            }
            error={errors.prepTime}
            required
            placeholder="5"
          />

          {/* Yield */}
          <InputField
            label="Rendimiento"
            type="number"
            step="0.1"
            min="0.1"
            value={formData.yield || ''}
            onChange={(e) =>
              handleChange('yield', parseFloat(e.target.value) || 1)
            }
            error={errors.yield}
            required
            placeholder="1"
          />

          {/* Yield Unit */}
          <SelectField
            label="Unidad de Rendimiento"
            value={formData.yieldUnit}
            onChange={(e) => handleChange('yieldUnit', e.target.value)}
            options={YIELD_UNITS}
          />
        </div>

        {/* Allergens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alérgenos
          </label>
          <div className="grid grid-cols-5 gap-2">
            {ALLERGEN_OPTIONS.map((allergen) => (
              <label
                key={allergen}
                className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={formData.allergens.includes(allergen)}
                  onChange={() => handleAllergenToggle(allergen)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-sm">{allergen}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Video URL */}
        <InputField
          label="URL del Video Tutorial"
          type="text"
          value={formData.videoUrl}
          onChange={(e) => handleChange('videoUrl', e.target.value)}
          placeholder="https://youtube.com/watch?v=..."
          helperText="Opcional: enlace a video de preparación"
        />

        {/* Ingredients List */}
        <div className="border-t pt-6">
          <IngredientsList
            ingredients={formData.ingredients}
            onChange={(ingredients) => handleChange('ingredients', ingredients)}
            inventoryItems={inventoryItems}
            errors={ingredientErrors}
          />
          {errors.ingredients && (
            <p className="text-sm text-red-600 mt-2">{errors.ingredients}</p>
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
            Receta activa
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {recipe?.id ? 'Actualizar Receta' : 'Crear Receta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
