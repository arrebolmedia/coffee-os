/**
 * CoffeeOS POS Web - Product Catalog Component
 * Catálogo de productos con filtros y búsqueda
 */

'use client';

import { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/use-products';
import { useCartStore } from '@/store/cart.store';
import { ProductCard } from './ProductCard';
import { CategoryFilter } from './CategoryFilter';
import { Product, ProductStatus } from '@/types';
import { Search, Loader2, AlertCircle } from 'lucide-react';

export function ProductCatalog() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const addItem = useCartStore((state) => state.addItem);

  // Fetch products with filters
  const {
    data: productsData,
    isLoading,
    error,
  } = useProducts({
    category_id: selectedCategoryId,
    status: ProductStatus.ACTIVE,
  });

  // Filter products by search query
  const filteredProducts = useMemo(() => {
    if (!productsData?.data) return [];

    const products = productsData.data;

    if (!searchQuery.trim()) return products;

    const query = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
    );
  }, [productsData, searchQuery]);

  const handleProductSelect = (product: Product) => {
    addItem(product);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos por nombre, SKU o código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 pt-4">
        <CategoryFilter
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-amber-600 mx-auto mb-4" />
              <p className="text-gray-600">Cargando productos...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-600">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">Error al cargar productos</p>
              <p className="text-sm text-gray-500 mt-2">
                {(error as any).message || 'Intente nuevamente'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && filteredProducts.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4" />
              <p className="font-medium">No se encontraron productos</p>
              <p className="text-sm mt-2">
                {searchQuery
                  ? 'Intente con otros términos de búsqueda'
                  : 'No hay productos en esta categoría'}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && filteredProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleProductSelect}
                />
              ))}
            </div>

            {/* Results Count */}
            <div className="text-center mt-6 text-sm text-gray-500">
              Mostrando {filteredProducts.length} de {productsData?.total || 0} productos
            </div>
          </>
        )}
      </div>
    </div>
  );
}
