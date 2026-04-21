/**
 * CoffeeOS POS Web - Ingredients List Component
 * Componente para gestión dinámica de ingredientes en recetas
 */

import { Plus, Trash2 } from 'lucide-react';
import { SelectField, InputField } from '@/components/ui/FormField';

export interface RecipeIngredientInput {
  inventoryItemId: string;
  quantity: number;
  unit: string;
  notes?: string;
}

interface IngredientsListProps {
  ingredients: RecipeIngredientInput[];
  onChange: (ingredients: RecipeIngredientInput[]) => void;
  inventoryItems: Array<{ id: string; name: string; unitOfMeasure: string }>;
  errors?: Record<number, string>;
}

const UNITS = [
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'unit', label: 'Unidades' },
  { value: 'oz', label: 'Onzas (oz)' },
  { value: 'cup', label: 'Tazas' },
  { value: 'tbsp', label: 'Cucharadas' },
  { value: 'tsp', label: 'Cucharaditas' },
];

export function IngredientsList({
  ingredients,
  onChange,
  inventoryItems,
  errors = {},
}: IngredientsListProps) {
  const handleAddIngredient = () => {
    onChange([
      ...ingredients,
      {
        inventoryItemId: '',
        quantity: 0,
        unit: 'g',
        notes: '',
      },
    ]);
  };

  const handleRemoveIngredient = (index: number) => {
    onChange(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdateIngredient = (
    index: number,
    field: keyof RecipeIngredientInput,
    value: string | number,
  ) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Ingredientes <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleAddIngredient}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Agregar Ingrediente
        </button>
      </div>

      {ingredients.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 text-sm">
            No hay ingredientes. Haz clic en "Agregar Ingrediente" para
            comenzar.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {ingredients.map((ingredient, index) => (
          <div
            key={index}
            className="grid grid-cols-12 gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
          >
            {/* Inventory Item Selection */}
            <div className="col-span-5">
              <SelectField
                label=""
                value={ingredient.inventoryItemId}
                onChange={(e) =>
                  handleUpdateIngredient(
                    index,
                    'inventoryItemId',
                    e.target.value,
                  )
                }
                options={[
                  { value: '', label: 'Seleccionar producto...' },
                  ...inventoryItems.map((item) => ({
                    value: item.id,
                    label: `${item.name} (${item.unitOfMeasure})`,
                  })),
                ]}
                error={errors[index]}
              />
            </div>

            {/* Quantity */}
            <div className="col-span-2">
              <InputField
                label=""
                type="number"
                step="0.01"
                min="0"
                value={ingredient.quantity || ''}
                onChange={(e) =>
                  handleUpdateIngredient(
                    index,
                    'quantity',
                    parseFloat(e.target.value) || 0,
                  )
                }
                placeholder="Cantidad"
              />
            </div>

            {/* Unit */}
            <div className="col-span-2">
              <SelectField
                label=""
                value={ingredient.unit}
                onChange={(e) =>
                  handleUpdateIngredient(index, 'unit', e.target.value)
                }
                options={UNITS}
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <InputField
                label=""
                value={ingredient.notes || ''}
                onChange={(e) =>
                  handleUpdateIngredient(index, 'notes', e.target.value)
                }
                placeholder="Notas"
              />
            </div>

            {/* Remove Button */}
            <div className="col-span-1 flex items-start">
              <button
                type="button"
                onClick={() => handleRemoveIngredient(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Eliminar ingrediente"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {ingredients.length > 0 && (
        <p className="text-xs text-gray-500">
          Total de ingredientes: {ingredients.length}
        </p>
      )}
    </div>
  );
}
