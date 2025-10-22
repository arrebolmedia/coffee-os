'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Category } from '@/types';
import CategoryModal from './CategoryModal';

export default function CategoriesList() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>();
  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categoriesData, isLoading } = useQuery<{ data: Category[] }>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/categories');
      return response.data;
    },
  });

  const categories = categoriesData?.data || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return apiClient.delete(`/categories/${categoryId}`);
    },
    onSuccess: () => {
      toast.success('Categoría eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar la categoría');
    },
  });

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (window.confirm(`¿Estás seguro de eliminar la categoría "${category.name}"?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleNew = () => {
    setSelectedCategory(undefined);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Categorías ({categories.length})
        </h3>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          Nueva Categoría
        </button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
          <p className="text-sm text-gray-600">
            No hay categorías. Crea una para organizar tus productos.
          </p>
          <button
            onClick={handleNew}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Crear Primera Categoría
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {categories
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
              >
                {/* Drag Handle */}
                <button
                  type="button"
                  className="cursor-grab text-gray-400 hover:text-gray-600"
                >
                  <GripVertical className="h-5 w-5" />
                </button>

                {/* Icon & Color */}
                <div
                  className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg text-2xl text-white"
                  style={{ backgroundColor: category.color || '#6B7280' }}
                >
                  {category.icon || '📁'}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{category.name}</h4>
                    {!category.is_active && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Inactiva
                      </span>
                    )}
                  </div>
                  {category.description && (
                    <p className="mt-1 text-sm text-gray-500">{category.description}</p>
                  )}
                </div>

                {/* Sort Order */}
                <div className="text-sm text-gray-500">
                  Orden: {category.sort_order || 0}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(undefined);
        }}
        category={selectedCategory}
      />
    </div>
  );
}
