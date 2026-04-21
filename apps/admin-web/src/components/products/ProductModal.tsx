'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Loader2, Link as LinkIcon } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { Product, Category, Modifier } from '@/types';
import ImageUpload from './ImageUpload';

const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  cost: z.number().min(0, 'El costo debe ser mayor o igual a 0').optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().min(1, 'La categoría es requerida'),
  stock: z.number().min(0, 'El stock debe ser mayor o igual a 0').optional(),
  minStock: z
    .number()
    .min(0, 'El stock mínimo debe ser mayor o igual a 0')
    .optional(),
  maxStock: z
    .number()
    .min(0, 'El stock máximo debe ser mayor o igual a 0')
    .optional(),
  taxRate: z
    .number()
    .min(0)
    .max(100, 'La tasa de impuesto debe estar entre 0 y 100')
    .optional(),
  isActive: z.boolean(),
  trackInventory: z.boolean(),
  modifierIds: z.array(z.string()).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  categories: Category[];
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  categories,
}: ProductModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    product?.image || null,
  );
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>(
    product?.modifiers?.map((m) => m.id) || [],
  );
  const queryClient = useQueryClient();

  // Fetch modifier groups
  const { data: modifiersData } = useQuery<{ data: Modifier[] }>({
    queryKey: ['modifiers'],
    queryFn: async () => {
      const response = await apiClient.get('/modifiers');
      return response.data;
    },
  });

  const modifierGroups = modifiersData?.data || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      description: product?.description || '',
      price: product?.price || 0,
      cost: product?.cost || 0,
      sku: product?.sku || '',
      barcode: product?.barcode || '',
      categoryId: product?.categoryId || '',
      stock: product?.stockQuantity || 0,
      minStock: product?.minimumStock || 0,
      maxStock: 0,
      taxRate: product?.taxRate || 16,
      isActive: product ? product.status === 'ACTIVE' : true,
      trackInventory: product?.trackInventory ?? true,
      modifierIds: product?.modifiers?.map((m) => m.id) || [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const formData = new FormData();

      // Append all fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'modifierIds') {
          // Handle array of modifier IDs
          if (Array.isArray(value) && value.length > 0) {
            formData.append('modifierIds', JSON.stringify(value));
          }
        } else if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Append image if present
      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (product?.id) {
        // Update existing product
        return apiClient.uploadFormData(
          `/products/${product.id}`,
          formData,
          'PUT',
        );
      } else {
        // Create new product
        return apiClient.uploadFormData('/products', formData, 'POST');
      }
    },
    onSuccess: () => {
      toast.success(
        product
          ? 'Producto actualizado exitosamente'
          : 'Producto creado exitosamente',
      );
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al guardar el producto',
      );
    },
  });

  const handleClose = () => {
    reset();
    setImageFile(null);
    setImagePreview(product?.image || null);
    setSelectedModifiers(product?.modifiers?.map((m) => m.id) || []);
    onClose();
  };

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
  };

  const handleImagePreviewChange = (preview: string | null) => {
    setImagePreview(preview);
  };

  const toggleModifier = (modifierId: string) => {
    setSelectedModifiers((prev) => {
      if (prev.includes(modifierId)) {
        return prev.filter((id) => id !== modifierId);
      } else {
        return [...prev, modifierId];
      }
    });
  };

  const onSubmit = (data: ProductFormData) => {
    mutation.mutate({
      ...data,
      modifierIds: selectedModifiers,
    });
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {product ? 'Editar Producto' : 'Nuevo Producto'}
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
                  {/* Image Upload */}
                  <ImageUpload
                    value={imagePreview}
                    onChange={handleImageChange}
                    onPreviewChange={handleImagePreviewChange}
                  />

                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
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

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        SKU
                      </label>
                      <input
                        type="text"
                        {...register('sku')}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Código de Barras
                      </label>
                      <input
                        type="text"
                        {...register('barcode')}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Categoría *
                      </label>
                      <select
                        {...register('categoryId')}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Selecciona una categoría</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {errors.categoryId && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.categoryId.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tasa de Impuesto (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('taxRate', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Precio *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('price', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.price.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Costo
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        {...register('cost', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...register('trackInventory')}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Rastrear Inventario
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock Actual
                      </label>
                      <input
                        type="number"
                        {...register('stock', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock Mínimo
                      </label>
                      <input
                        type="number"
                        {...register('minStock', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Stock Máximo
                      </label>
                      <input
                        type="number"
                        {...register('maxStock', { valueAsNumber: true })}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        {...register('isActive')}
                        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <label className="text-sm font-medium text-gray-700">
                        Producto Activo
                      </label>
                    </div>
                  </div>

                  {/* Modifiers Section */}
                  {modifierGroups.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-gray-700">
                          Modificadores Opcionales
                        </label>
                        <a
                          href="/dashboard/modifiers"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Gestionar grupos
                        </a>
                      </div>

                      <p className="text-xs text-gray-500">
                        Selecciona los grupos de opciones que aplican a este
                        producto
                      </p>

                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-2">
                        {modifierGroups.map((group) => (
                          <label
                            key={group.id}
                            className={`flex items-start gap-3 rounded-lg border-2 p-3 cursor-pointer transition-all ${
                              selectedModifiers.includes(group.id)
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedModifiers.includes(group.id)}
                              onChange={() => toggleModifier(group.id)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {group.name}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    group.type === 'SINGLE'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-purple-100 text-purple-700'
                                  }`}
                                >
                                  {group.type === 'SINGLE' ? 'Una' : 'Múltiple'}
                                </span>
                                {group.required && (
                                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                    Req.
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-gray-500">
                                {group.options.length} opciones
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>

                      {selectedModifiers.length > 0 && (
                        <p className="text-xs text-purple-600 font-medium">
                          {selectedModifiers.length} grupo(s) seleccionado(s)
                        </p>
                      )}
                    </div>
                  )}

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
                      {product ? 'Actualizar' : 'Crear'} Producto
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
