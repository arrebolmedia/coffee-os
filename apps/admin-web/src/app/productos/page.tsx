'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { useProducts, useDeleteProduct, useBulkDeleteProducts } from '@/hooks/useApi';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { Product } from '@/types';

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading, error, refetch } = useProducts({
    page,
    per_page: 20,
    search: search || undefined,
  });

  const deleteProductMutation = useDeleteProduct();
  const bulkDeleteMutation = useBulkDeleteProducts();

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;

    try {
      await deleteProductMutation.mutateAsync(id);
      toast.success('Producto eliminado');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar producto');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedProducts.length} productos seleccionados?`)) return;

    try {
      await bulkDeleteMutation.mutateAsync(selectedProducts);
      toast.success(`${selectedProducts.length} productos eliminados`);
      setSelectedProducts([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar productos');
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === data?.data.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(data?.data.map(p => p.id) || []);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestiona tu catálogo de productos
            </p>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-coffee-600 hover:bg-coffee-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coffee-500 focus:border-transparent"
                />
              </div>
            </div>

            <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Filtros</span>
            </button>

            {selectedProducts.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                Eliminar ({selectedProducts.length})
              </button>
            )}
          </div>
        </div>

        {/* Products Table */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800 font-medium">Error al cargar productos</p>
            <p className="text-red-600 text-sm mt-1">
              Verifica que el backend esté corriendo en http://localhost:4000
            </p>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === data.data.length && data.data.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-coffee-600 focus:ring-coffee-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actualizado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.data.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="rounded border-gray-300 text-coffee-600 focus:ring-coffee-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            {product.sku && (
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900">
                          {product.category?.name || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          ${product.price.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {product.track_inventory ? (
                          <span className={`text-sm ${
                            product.current_stock && product.current_stock <= (product.min_stock || 0)
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-900'
                          }`}>
                            {product.current_stock || 0}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'OUT_OF_STOCK'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status === 'ACTIVE' ? 'Activo' : product.status === 'OUT_OF_STOCK' ? 'Sin Stock' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {format(new Date(product.updated_at), 'PP', { locale: es })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.meta.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{((page - 1) * data.meta.per_page) + 1}</span> a{' '}
                  <span className="font-medium">{Math.min(page * data.meta.per_page, data.meta.total)}</span> de{' '}
                  <span className="font-medium">{data.meta.total}</span> productos
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(data.meta.total_pages, p + 1))}
                    disabled={page === data.meta.total_pages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}

            {data.data.length === 0 && (
              <div className="px-6 py-12 text-center">
                <ImageIcon className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                <p className="text-gray-500 font-medium">No hay productos</p>
                <p className="text-gray-400 text-sm mt-1">Comienza agregando tu primer producto</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        product={editingProduct}
        onSuccess={handleModalSuccess}
      />
    </DashboardLayout>
  );
}
