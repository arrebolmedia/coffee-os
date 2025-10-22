'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Upload, Trash2, Loader2 } from 'lucide-react';
import { useCreateProduct, useUpdateProduct, useUploadProductImage, useDeleteProductImage, useActiveCategories } from '@/hooks/useApi';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

// Validation schema
const productSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['SIMPLE', 'COMBO', 'VARIABLE']),
  category_id: z.string().optional(),
  price: z.number().min(0, 'El precio debe ser mayor a 0'),
  cost: z.number().min(0).optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  track_inventory: z.boolean().default(false),
  current_stock: z.number().int().min(0).optional(),
  min_stock: z.number().int().min(0).optional(),
  max_stock: z.number().int().min(0).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSuccess?: () => void;
}

export function ProductFormModal({ isOpen, onClose, product, onSuccess }: ProductFormModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.image_url || null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      name: product.name,
      description: product.description || '',
      type: product.type,
      category_id: product.category_id || '',
      price: product.price,
      cost: product.cost || 0,
      sku: product.sku || '',
      barcode: product.barcode || '',
      track_inventory: product.track_inventory,
      current_stock: product.current_stock || 0,
      min_stock: product.min_stock || 0,
      max_stock: product.max_stock || 0,
    } : {
      type: 'SIMPLE',
      price: 0,
      track_inventory: false,
    },
  });

  const trackInventory = watch('track_inventory');

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const uploadImageMutation = useUploadProductImage();
  const deleteImageMutation = useDeleteProductImage();
  const { data: categories, isLoading: categoriesLoading } = useActiveCategories();

  useEffect(() => {
    if (product) {
      setImagePreview(product.image_url || null);
    }
  }, [product]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setImageFile(null);
      setImagePreview(product?.image_url || null);
      setUploadProgress(0);
    }
  }, [isOpen, reset, product]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
      toast.error('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB');
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    if (isEditing && product?.image_url) {
      try {
        await deleteImageMutation.mutateAsync(product.id);
        toast.success('Imagen eliminada');
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Error al eliminar imagen');
      }
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const onSubmit = async (data: ProductFormData) => {
    try {
      let savedProduct: Product;

      if (isEditing) {
        // Update existing product
        savedProduct = await updateProductMutation.mutateAsync({
          id: product.id,
          data,
        });
        toast.success('Producto actualizado');
      } else {
        // Create new product
        savedProduct = await createProductMutation.mutateAsync(data);
        toast.success('Producto creado');
      }

      // Upload image if selected
      if (imageFile && savedProduct) {
        await uploadImageMutation.mutateAsync({
          productId: savedProduct.id,
          file: imageFile,
          onProgress: (progress) => setUploadProgress(progress),
        });
        toast.success('Imagen subida correctamente');
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el producto';
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
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
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
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen del Producto
              </label>
              
              {imagePreview ? (
                <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                      <div
                        className="h-full bg-coffee-600 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-coffee-500 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">
                    Haz clic para subir una imagen
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    JPG, PNG o WebP (max. 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  placeholder="Café Americano"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  placeholder="Descripción del producto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  {...register('type')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                >
                  <option value="SIMPLE">Simple</option>
                  <option value="COMBO">Combo</option>
                  <option value="VARIABLE">Variable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  {...register('category_id')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  disabled={categoriesLoading}
                >
                  <option value="">Sin categoría</option>
                  {categories?.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio de Venta *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    {...register('price', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                {errors.price && (
                  <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    $
                  </span>
                  <input
                    {...register('cost', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* SKU & Barcode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <input
                  {...register('sku')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  placeholder="CAF-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Barras
                </label>
                <input
                  {...register('barcode')}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                  placeholder="7501234567890"
                />
              </div>
            </div>

            {/* Inventory Tracking */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <input
                  {...register('track_inventory')}
                  type="checkbox"
                  id="track_inventory"
                  className="w-4 h-4 rounded border-gray-300 text-coffee-600 focus:ring-coffee-500"
                />
                <label htmlFor="track_inventory" className="ml-2 text-sm font-medium text-gray-700">
                  Rastrear inventario
                </label>
              </div>

              {trackInventory && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Actual
                    </label>
                    <input
                      {...register('current_stock', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Mínimo
                    </label>
                    <input
                      {...register('min_stock', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Máximo
                    </label>
                    <input
                      {...register('max_stock', { valueAsNumber: true })}
                      type="number"
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
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
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
                className="px-6 py-2 bg-coffee-600 hover:bg-coffee-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {(createProductMutation.isPending || updateProductMutation.isPending) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {isEditing ? 'Actualizar' : 'Crear'} Producto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
