'use client';

import { useState } from 'react';
import {
  Trash2,
  FolderInput,
  Download,
  ToggleLeft,
  ToggleRight,
  X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import type { Product, Category } from '@/types';

interface BulkActionsBarProps {
  selectedProducts: Product[];
  onClearSelection: () => void;
  categories: Category[];
}

export default function BulkActionsBar({
  selectedProducts,
  onClearSelection,
  categories,
}: BulkActionsBarProps) {
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const queryClient = useQueryClient();

  const selectedCount = selectedProducts.length;
  const selectedIds = selectedProducts.map((p) => p.id);

  // Bulk delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (productIds: string[]) => {
      return apiClient.post('/products/bulk-delete', { productIds });
    },
    onSuccess: () => {
      toast.success(`${selectedCount} producto(s) eliminado(s)`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al eliminar productos',
      );
    },
  });

  // Bulk update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      productIds,
      isActive,
    }: {
      productIds: string[];
      isActive: boolean;
    }) => {
      return apiClient.post('/products/bulk-update-status', {
        productIds,
        isActive,
      });
    },
    onSuccess: (
      _data: any,
      variables: { productIds: string[]; isActive: boolean },
    ) => {
      const status = variables.isActive ? 'activados' : 'desactivados';
      toast.success(`${selectedCount} producto(s) ${status}`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar productos',
      );
    },
  });

  // Bulk update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      productIds,
      categoryId,
    }: {
      productIds: string[];
      categoryId: string;
    }) => {
      return apiClient.post('/products/bulk-update-category', {
        productIds,
        categoryId,
      });
    },
    onSuccess: () => {
      toast.success(`Categoría actualizada para ${selectedCount} producto(s)`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowCategorySelector(false);
      onClearSelection();
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Error al actualizar categoría',
      );
    },
  });

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `¿Estás seguro de eliminar ${selectedCount} producto(s)?\n\nEsta acción no se puede deshacer.`,
      )
    ) {
      deleteMutation.mutate(selectedIds);
    }
  };

  const handleBulkActivate = () => {
    updateStatusMutation.mutate({ productIds: selectedIds, isActive: true });
  };

  const handleBulkDeactivate = () => {
    updateStatusMutation.mutate({ productIds: selectedIds, isActive: false });
  };

  const handleBulkUpdateCategory = (categoryId: string) => {
    updateCategoryMutation.mutate({ productIds: selectedIds, categoryId });
  };

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['SKU', 'Nombre', 'Categoría', 'Precio', 'Stock', 'Estado'];
    const rows = selectedProducts.map((product) => [
      product.sku || '',
      product.name,
      product.category?.name || 'Sin categoría',
      product.price.toFixed(2),
      product.stockQuantity || 0,
      product.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\uFEFF' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `productos_${new Date().toISOString().split('T')[0]}.csv`,
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`${selectedCount} producto(s) exportado(s) a CSV`);
  };

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 text-white rounded-full shadow-2xl px-6 py-4 flex items-center gap-6">
        {/* Selection Count */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-sm font-bold">
            {selectedCount}
          </div>
          <span className="font-medium">
            {selectedCount} producto{selectedCount > 1 ? 's' : ''} seleccionado
            {selectedCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Category */}
          <div className="relative">
            <button
              onClick={() => setShowCategorySelector(!showCategorySelector)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
              title="Cambiar categoría"
            >
              <FolderInput className="h-4 w-4" />
              Categoría
            </button>

            {showCategorySelector && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCategorySelector(false)}
                />

                {/* Dropdown */}
                <div className="absolute bottom-full mb-2 left-0 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-200">
                    <p className="text-xs font-medium text-gray-500">
                      Selecciona una categoría
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleBulkUpdateCategory(category.id)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 flex items-center gap-2"
                      >
                        {category.icon && <span>{category.icon}</span>}
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Activate */}
          <button
            onClick={handleBulkActivate}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
            title="Activar seleccionados"
          >
            <ToggleRight className="h-4 w-4" />
            Activar
          </button>

          {/* Deactivate */}
          <button
            onClick={handleBulkDeactivate}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
            title="Desactivar seleccionados"
          >
            <ToggleLeft className="h-4 w-4" />
            Desactivar
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-sm font-medium hover:bg-gray-700 transition-colors"
            title="Exportar a CSV"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>

          {/* Delete */}
          <button
            onClick={handleBulkDelete}
            disabled={deleteMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            title="Eliminar seleccionados"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700" />

        {/* Clear Selection */}
        <button
          onClick={onClearSelection}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-800 transition-colors"
          title="Limpiar selección"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
