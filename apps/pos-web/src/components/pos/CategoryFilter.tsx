/**
 * CoffeeOS POS Web - Category Filter Component
 * Filtro de categorías para el catálogo de productos
 */

'use client';

import { Category } from '@/types';
import { useCategories } from '@/hooks/use-products';
import { Coffee, Loader2 } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategoryId?: string;
  onSelectCategory: (categoryId: string | undefined) => void;
}

export function CategoryFilter({ selectedCategoryId, onSelectCategory }: CategoryFilterProps) {
  const { data: categories, isLoading, error } = useCategories();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600">
        Error al cargar categorías
      </div>
    );
  }

  const activeCategories = categories?.filter((cat) => cat.is_active) || [];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
      {/* All Categories */}
      <button
        onClick={() => onSelectCategory(undefined)}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
          ${
            !selectedCategoryId
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
          }
        `}
      >
        <Coffee className="w-4 h-4" />
        <span className="font-medium">Todos</span>
      </button>

      {/* Category Buttons */}
      {activeCategories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelectCategory(category.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
            ${
              selectedCategoryId === category.id
                ? 'bg-amber-500 text-white shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }
          `}
          style={{
            backgroundColor: selectedCategoryId === category.id && category.color ? category.color : undefined,
          }}
        >
          {category.icon && <span className="text-lg">{category.icon}</span>}
          <span className="font-medium">{category.name}</span>
        </button>
      ))}
    </div>
  );
}
