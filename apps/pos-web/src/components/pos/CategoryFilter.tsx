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

export function CategoryFilter({
  selectedCategoryId,
  onSelectCategory,
}: CategoryFilterProps) {
  const { data: categories, isLoading, error } = useCategories();

  const resolveCategoryKey = (category: Category) => {
    const cat: any = category;
    return (
      category.id ||
      (typeof cat.slug === 'string' && cat.slug) ||
      (typeof category.name === 'string' && category.name) ||
      undefined
    );
  };

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

  const activeCategories = categories?.filter((cat) => cat.active) || [];

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
      {activeCategories.map((category) => {
        const categoryKey = resolveCategoryKey(category);
        const buttonKey =
          categoryKey ?? `${category.name}-${category.sortOrder}`;

        return (
          <button
            key={buttonKey}
            onClick={() => onSelectCategory(categoryKey)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
              ${
                selectedCategoryId === categoryKey
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }
            `}
            style={{
              backgroundColor:
                selectedCategoryId === categoryKey && category.color
                  ? category.color
                  : undefined,
            }}
          >
            {category.icon && <span className="text-lg">{category.icon}</span>}
            <span className="font-medium">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}
