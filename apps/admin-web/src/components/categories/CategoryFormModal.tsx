'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2 } from 'lucide-react';
import { useCreateCategory, useUpdateCategory } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import type { Category } from '@/types';

// Validation schema
const categorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color debe ser hexadecimal')
    .optional(),
  icon: z.string().optional(),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category | null;
  onSuccess?: () => void;
}

// Predefined colors
const PRESET_COLORS = [
  { name: 'Coffee', value: '#8B4513' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Gray', value: '#6B7280' },
];

export function CategoryFormModal({
  isOpen,
  onClose,
  category,
  onSuccess,
}: CategoryFormModalProps) {
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          description: category.description || '',
          color: category.color || '#6B7280',
          icon: category.icon || '',
          sortOrder: category.sortOrder,
          active: category.active,
        }
      : {
          name: '',
          description: '',
          color: '#6B7280',
          icon: '',
          sortOrder: 0,
          active: true,
        },
  });

  const selectedColor = watch('color');

  const createCategoryMutation = useCreateCategory();
  const updateCategoryMutation = useUpdateCategory();

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditing) {
        await updateCategoryMutation.mutateAsync({
          id: category.id,
          data,
        });
        toast.success('Categoría actualizada');
      } else {
        await createCategoryMutation.mutateAsync(data);
        toast.success('Categoría creada');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMessage =
        error.response?.data?.message || 'Error al guardar la categoría';
      toast.error(errorMessage);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                {...register('name')}
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                placeholder="Bebidas calientes"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                placeholder="Descripción de la categoría..."
              />
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>

              {/* Preset Colors */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setValue('color', color.value)}
                    className={`w-full h-12 rounded-lg transition-all ${
                      selectedColor === color.value
                        ? 'ring-2 ring-coffee-500 ring-offset-2'
                        : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-3">
                <input
                  {...register('color')}
                  type="color"
                  className="w-16 h-10 rounded-lg border border-gray-300 cursor-pointer"
                />
                <input
                  {...register('color')}
                  type="text"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent font-mono"
                  placeholder="#6B7280"
                />
              </div>
              {errors.color && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.color.message}
                </p>
              )}
            </div>

            {/* Sort Order & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden
                </label>
                <input
                  {...register('sortOrder', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    {...register('active')}
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-coffee-600 focus:ring-coffee-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Categoría activa
                  </span>
                </label>
              </div>
            </div>

            {/* Preview */}
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Vista Previa
              </label>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: selectedColor || '#6B7280' }}
                >
                  <span className="text-white font-semibold text-lg">
                    {watch('name')?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {watch('name') || 'Nombre de categoría'}
                  </p>
                  {watch('description') && (
                    <p className="text-sm text-gray-500">
                      {watch('description')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  createCategoryMutation.isPending ||
                  updateCategoryMutation.isPending
                }
                className="px-6 py-2 bg-coffee-600 hover:bg-coffee-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(createCategoryMutation.isPending ||
                  updateCategoryMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEditing ? 'Actualizar' : 'Crear'} Categoría
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
