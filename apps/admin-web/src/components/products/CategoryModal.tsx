'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Category } from '@/types';

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  color: z.string().min(1, 'Selecciona un color'),
  icon: z.string().optional(),
  sortOrder: z
    .number()
    .min(0, 'El orden debe ser mayor o igual a 0')
    .optional(),
  active: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: Category;
}

const PRESET_COLORS = [
  { name: 'Rojo', value: '#EF4444', bg: 'bg-red-500' },
  { name: 'Naranja', value: '#F97316', bg: 'bg-orange-500' },
  { name: 'Ámbar', value: '#F59E0B', bg: 'bg-purple-500' },
  { name: 'Amarillo', value: '#EAB308', bg: 'bg-yellow-500' },
  { name: 'Lima', value: '#84CC16', bg: 'bg-lime-500' },
  { name: 'Verde', value: '#22C55E', bg: 'bg-green-500' },
  { name: 'Esmeralda', value: '#10B981', bg: 'bg-emerald-500' },
  { name: 'Cyan', value: '#06B6D4', bg: 'bg-cyan-500' },
  { name: 'Azul', value: '#3B82F6', bg: 'bg-blue-500' },
  { name: 'Índigo', value: '#6366F1', bg: 'bg-indigo-500' },
  { name: 'Violeta', value: '#8B5CF6', bg: 'bg-violet-500' },
  { name: 'Púrpura', value: '#A855F7', bg: 'bg-purple-500' },
  { name: 'Fucsia', value: '#D946EF', bg: 'bg-fuchsia-500' },
  { name: 'Rosa', value: '#EC4899', bg: 'bg-pink-500' },
  { name: 'Gris', value: '#6B7280', bg: 'bg-gray-500' },
  { name: 'Negro', value: '#1F2937', bg: 'bg-gray-800' },
];

const PRESET_ICONS = [
  '☕',
  '🍰',
  '🥐',
  '🥪',
  '🍕',
  '🍔',
  '🌮',
  '🍜',
  '🍦',
  '🧃',
  '🥤',
  '🍵',
  '🥗',
  '🍲',
  '🍱',
  '🍛',
];

export default function CategoryModal({
  isOpen,
  onClose,
  category,
}: CategoryModalProps) {
  const [selectedColor, setSelectedColor] = useState(
    category?.color || PRESET_COLORS[0].value,
  );
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || '☕');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      color: category?.color || PRESET_COLORS[0].value,
      icon: category?.icon || '☕',
      sortOrder: category?.sortOrder || 0,
      active: category?.active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const payload = {
        ...data,
        color: selectedColor,
        icon: selectedIcon,
      };

      if (category?.id) {
        return apiClient.put(`/categories/${category.id}`, payload);
      } else {
        return apiClient.post('/categories', payload);
      }
    },
    onSuccess: () => {
      toast.success(
        category
          ? 'Categoría actualizada exitosamente'
          : 'Categoría creada exitosamente',
      );
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al guardar la categoría',
      );
    },
  });

  const handleClose = () => {
    reset();
    setSelectedColor(PRESET_COLORS[0].value);
    setSelectedIcon('☕');
    onClose();
  };

  const onSubmit = (data: CategoryFormData) => {
    mutation.mutate(data);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {category ? 'Editar Categoría' : 'Nueva Categoría'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="rounded-lg p-1 hover:bg-gray-100"
                    onClick={handleClose}
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-6"
                >
                  {/* Basic Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      {...register('name')}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Descripción
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  {/* Color Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Color de la Categoría *
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color.value);
                            setValue('color', color.value);
                          }}
                          className={`relative h-10 w-10 rounded-lg ${color.bg} hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2`}
                          title={color.name}
                        >
                          {selectedColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Check className="h-5 w-5 text-white drop-shadow-lg" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Icon Picker */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Ícono de la Categoría
                    </label>
                    <div className="grid grid-cols-8 gap-2">
                      {PRESET_ICONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setSelectedIcon(icon);
                            setValue('icon', icon);
                          }}
                          className={`relative h-10 w-10 rounded-lg border-2 text-2xl hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                            selectedIcon === icon
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vista Previa
                    </label>
                    <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl text-white"
                        style={{ backgroundColor: selectedColor }}
                      >
                        {selectedIcon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {register('name').name
                            ? 'Nueva Categoría'
                            : 'Vista Previa'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Color y ícono seleccionados
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Orden de Visualización
                    </label>
                    <input
                      type="number"
                      {...register('sortOrder', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Menor número aparece primero en el menú
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...register('active')}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Categoría Activa
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={mutation.isPending}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {mutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {category ? 'Actualizar' : 'Crear'} Categoría
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
