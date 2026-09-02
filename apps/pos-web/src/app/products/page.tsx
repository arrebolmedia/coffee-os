/**
 * CoffeeOS POS Web - Products Page
 * Página de gestión de productos del catálogo
 */

'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCategories,
  useDeleteProduct,
  useProducts,
} from '@/hooks/use-products';
import { useMarginBadge, useProductCOGS } from '@/hooks/use-costing';
import {
  type ProductoEditable,
  ProductoModal,
} from '@/components/products/ProductoModal';
import { ProductoDetalleModal } from '@/components/products/ProductoDetalleModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  AlertCircle,
  BarChart3,
  Calculator,
  DollarSign,
  Download,
  Edit,
  Eye,
  Filter,
  Grid3x3,
  Image as ImageIcon,
  Loader2,
  Package,
  Plus,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface ProductDisplay {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  price: number;
  cost: number;
  margin: number;
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT' | 'ARCHIVED';
  imageUrl: string;
  barcode: string;
  trackInventory: boolean;
  stockQuantity: number;
  type: string;
  tags: string[];
  /** Tasa de IVA como fracción: 0.16 es el 16 %, 0 es tasa cero. */
  taxRate: number;
  /** El precio de venta ya lleva el IVA dentro. */
  taxIncluded: boolean;
}

/** Pasa una fila de la tabla a lo que el editor necesita. */
function aEditable(p: ProductDisplay): ProductoEditable {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    categoryId: p.categoryId,
    price: p.price,
    cost: p.cost,
    barcode: p.barcode,
    trackInventory: p.trackInventory,
    taxRate: p.taxRate,
    taxIncluded: p.taxIncluded,
  };
}

export default function ProductsPage() {
  // ============================================================================
  // STATE
  // ============================================================================

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStock, setFilterStock] = useState<string>('all');
  // Producto que se está editando, 'nuevo' para un alta, o null si el diálogo
  // está cerrado. El editor cubre el régimen fiscal además del resto: tener dos
  // sitios donde cambiar la tasa se prestaba a confusión.
  const [editando, setEditando] = useState<ProductoEditable | 'nuevo' | null>(
    null,
  );
  /** Producto cuya ficha se está mirando. */
  const [productoDetalle, setProductoDetalle] = useState<ProductDisplay | null>(
    null,
  );
  /** Producto pendiente de confirmar el borrado. */
  const [productoABorrar, setProductoABorrar] = useState<ProductDisplay | null>(
    null,
  );
  const borrarProducto = useDeleteProduct();

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const { data: productsData, isLoading, error } = useProducts();
  const { data: categoriesData, isLoading: loadingCategories } =
    useCategories();

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  const products: ProductDisplay[] = useMemo(() => {
    if (!productsData?.data) return [];

    return productsData.data.map((product) => ({
      id: product.id,
      sku: product.sku || '',
      name: product.name,
      description: product.description || '',
      category: product.category?.name || 'Sin categoría',
      categoryId: product.categoryId,
      price: product.price || 0,
      cost: product.cost || 0,
      margin:
        product.cost && product.price
          ? ((product.price - product.cost) / product.price) * 100
          : 0,
      status: product.status,
      imageUrl: product.image || '',
      barcode: product.barcode || '',
      trackInventory: product.trackInventory || false,
      stockQuantity: product.stockQuantity ?? 0,
      type: product.type || 'SIMPLE',
      tags: product.tags || [],
      // `??` y no `||`: la tasa 0 es legítima —el pan para llevar tributa a
      // tasa 0 por el art. 2-A LIVA— y con `||` se enseñaría como 16 %.
      taxRate: product.taxRate ?? 0.16,
      // Con IVA incluido por defecto: en México el precio exhibido ya lo lleva.
      taxIncluded: product.taxIncluded ?? true,
    }));
  }, [productsData]);

  const categories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData;
  }, [categoriesData]);

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Search filter
      const matchesSearch = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
        : true;

      // Category filter
      const matchesCategory =
        filterCategory === 'all' || product.categoryId === filterCategory;

      // Status filter
      const matchesStatus =
        filterStatus === 'all' || product.status === filterStatus;

      // Stock filter
      const matchesStock =
        filterStock === 'all' ||
        (filterStock === 'in-stock' && product.stockQuantity > 0) ||
        (filterStock === 'low-stock' &&
          product.stockQuantity > 0 &&
          product.stockQuantity <= 10) ||
        (filterStock === 'out-of-stock' && product.stockQuantity === 0) ||
        (filterStock === 'no-tracking' && !product.trackInventory);

      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
  }, [products, searchQuery, filterCategory, filterStatus, filterStock]);

  // ============================================================================
  // LOCAL STATS
  // ============================================================================

  const localStats = useMemo(() => {
    const activeProducts = products.filter((p) => p.status === 'ACTIVE');
    const totalValue = products.reduce(
      (sum, p) => sum + p.cost * p.stockQuantity,
      0,
    );
    const avgMargin =
      products.length > 0
        ? products.reduce((sum, p) => sum + p.margin, 0) / products.length
        : 0;

    return {
      total: products.length,
      active: activeProducts.length,
      inactive: products.filter((p) => p.status === 'INACTIVE').length,
      draft: products.filter((p) => p.status === 'DRAFT').length,
      outOfStock: products.filter(
        (p) => p.trackInventory && p.stockQuantity === 0,
      ).length,
      lowStock: products.filter(
        (p) => p.trackInventory && p.stockQuantity > 0 && p.stockQuantity <= 10,
      ).length,
      totalValue,
      avgMargin,
    };
  }, [products]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 border-green-300',
      INACTIVE: 'bg-gray-100 text-gray-800 border-gray-300',
      DRAFT: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      ARCHIVED: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[status] || badges.DRAFT;
  };

  const getStockBadge = (product: ProductDisplay) => {
    if (!product.trackInventory) {
      return <span className="text-xs text-gray-500">No rastreado</span>;
    }

    if (product.stockQuantity === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
          <TrendingDown className="w-3 h-3" />
          Agotado
        </span>
      );
    }

    if (product.stockQuantity <= 10) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3" />
          Stock bajo
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <TrendingUp className="w-3 h-3" />
        En stock
      </span>
    );
  };

  const formatMargin = (margin: number) => {
    if (margin < 40) {
      return (
        <span className="text-red-600 font-semibold">{margin.toFixed(1)}%</span>
      );
    }
    if (margin < 60) {
      return (
        <span className="text-yellow-600 font-semibold">
          {margin.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="text-green-600 font-semibold">{margin.toFixed(1)}%</span>
    );
  };

  // ============================================================================
  // PRODUCT COGS CELL COMPONENT
  // ============================================================================

  const ProductCOGSCell = ({ productId }: { productId: string }) => {
    const { data: cogsData, isLoading: cogsLoading } = useProductCOGS(
      productId,
      true,
    );
    const marginBadge = useMarginBadge(cogsData?.margin_percentage || 0);

    if (cogsLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          <span className="text-xs text-gray-500">Calculando...</span>
        </div>
      );
    }

    if (!cogsData || !cogsData.has_recipe) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Sin receta
          </span>
          <span className="text-xs text-gray-400">COGS no disponible</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Calculator className="w-3 h-3 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">
            ${cogsData.total_cost.toFixed(2)}
          </span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${marginBadge.bgClass}`}
        >
          {cogsData.margin_percentage.toFixed(1)}% {marginBadge.text}
        </span>
        {cogsData.margin_percentage < 60 && (
          <div className="flex items-center gap-1 mt-1">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            <span className="text-xs text-yellow-700">Margen bajo</span>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  // La compuerta de carga no puede tragarse un diálogo abierto.
  //
  // Estaba antes del render entero, modales incluidos: si una consulta de fondo
  // volvía a estado de carga mientras el usuario escribía, la página se
  // sustituía por el spinner, el modal se desmontaba y se llevaba lo tecleado.
  // Se veía en los e2e como un alta que fallaba con «El nombre es obligatorio»
  // teniendo el precio y la categoría bien puestos: los dos primeros campos se
  // habían perdido y los siguientes cayeron en el formulario ya reiniciado.
  //
  // Con un diálogo abierto se sigue de largo: `products` cae a lista vacía sin
  // datos, así que el árbol principal se pinta igual y el modal no se mueve.
  const hayDialogoAbierto =
    editando !== null || productoDetalle !== null || productoABorrar !== null;

  if ((isLoading || loadingCategories) && !hayDialogoAbierto) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen text-red-600">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p className="text-lg font-semibold">Error al cargar productos</p>
          <p className="text-sm text-gray-600 mt-2">
            {error instanceof Error ? error.message : 'Error desconocido'}
          </p>
        </div>
      </MainLayout>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Package className="w-8 h-8 text-indigo-600" />
                Productos
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona tu catálogo de productos y categorías
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </button>
              <button
                type="button"
                onClick={() => setEditando('nuevo')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 font-medium"
              >
                <Plus className="w-5 h-5" />
                Nuevo Producto
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Products */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {localStats.total}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {localStats.active} activos
                </p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>

          {/* Average Margin */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Margen Promedio</p>
                <p className="text-2xl font-bold text-green-600">
                  {localStats.avgMargin.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {localStats.avgMargin >= 60 ? 'Saludable' : 'Mejorar'}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Inventory Value */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Valor Inventario</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${localStats.totalValue.toLocaleString('es-MX')}
                </p>
                <p className="text-xs text-gray-500 mt-1">Costo total</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Stock Alerts */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Alertas Stock</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {localStats.lowStock + localStats.outOfStock}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {localStats.outOfStock} agotados
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <div className="relative">
                <Grid3x3 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Todos los estados</option>
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="DRAFT">Borrador</option>
                  <option value="ARCHIVED">Archivado</option>
                </select>
              </div>
            </div>

            {/* Stock Filter */}
            <div>
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filterStock}
                  onChange={(e) => setFilterStock(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">Todo el stock</option>
                  <option value="in-stock">En stock</option>
                  <option value="low-stock">Stock bajo</option>
                  <option value="out-of-stock">Agotado</option>
                  <option value="no-tracking">No rastreado</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/*
          En un teléfono la tabla no cabe: son nueve columnas, 1427 px dentro de
          una de 325, o sea cuatro pantallas de arrastre para leer una fila.
          `overflow-x` evita que la página se rompa, pero no la hace usable.
          Debajo de `md` va una tarjeta por producto con lo que se consulta de
          pie en el mostrador —nombre, precio, existencia, estado— y las mismas
          acciones.
        */}
        <div className="space-y-3 md:hidden">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              data-testid="producto"
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-gray-900">
                    {product.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {product.sku} · {product.category}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-semibold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${getStatusBadge(product.status)}`}
                >
                  {product.status === 'ACTIVE' && 'Activo'}
                  {product.status === 'INACTIVE' && 'Inactivo'}
                  {product.status === 'DRAFT' && 'Borrador'}
                  {product.status === 'ARCHIVED' && 'Archivado'}
                </span>
                {getStockBadge(product)}
                {product.trackInventory && (
                  <span className="text-xs text-gray-500">
                    {product.stockQuantity} unidades
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end gap-1 border-t border-gray-100 pt-3">
                <button
                  onClick={() => setProductoDetalle(product)}
                  className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
                  aria-label={`Ver la ficha de ${product.name}`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditando(aEditable(product))}
                  className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                  aria-label={`Editar ${product.name}`}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setProductoABorrar(product)}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                  aria-label={`Eliminar ${product.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}

          {filteredProducts.length === 0 && (
            <p className="rounded-lg border border-gray-200 bg-white py-12 text-center text-sm text-gray-500">
              No hay productos que coincidan con el filtro.
            </p>
          )}
        </div>

        {/* Products Table */}
        <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
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
                    COGS / Margen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Margen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IVA
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    data-testid="producto"
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            SKU: {product.sku}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {product.category}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          ${product.price.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Costo: ${product.cost.toFixed(2)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <ProductCOGSCell productId={product.id} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatMargin(product.margin)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {getStockBadge(product)}
                        {product.trackInventory && (
                          <span className="text-xs text-gray-500">
                            {product.stockQuantity} unidades
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm font-medium ${
                            product.taxRate === 0
                              ? 'text-emerald-700'
                              : 'text-gray-900'
                          }`}
                        >
                          {product.taxRate === 0
                            ? 'Tasa 0'
                            : `${(product.taxRate * 100).toFixed(0)}%`}
                        </span>
                        {product.taxIncluded && (
                          <span className="text-xs text-gray-500">
                            incluido en el precio
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(
                          product.status,
                        )}`}
                      >
                        {product.status === 'ACTIVE' && 'Activo'}
                        {product.status === 'INACTIVE' && 'Inactivo'}
                        {product.status === 'DRAFT' && 'Borrador'}
                        {product.status === 'ARCHIVED' && 'Archivado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {/* Los tres botones estaban pintados sin `onClick`: se
                          veían accionables y no hacían nada. */}
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setProductoDetalle(product)}
                          aria-label={`Ver la ficha de ${product.name}`}
                          title="Ver ficha"
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(aEditable(product))}
                          aria-label={`Editar ${product.name}`}
                          title="Editar"
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProductoABorrar(product)}
                          aria-label={`Eliminar ${product.name}`}
                          title="Eliminar"
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Empty State */}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">
                  No se encontraron productos
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Intenta ajustar los filtros o crear un nuevo producto
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {filteredProducts.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Mostrando {filteredProducts.length} de {products.length} productos
          </div>
        )}

        <ProductoModal producto={editando} onClose={() => setEditando(null)} />

        <ProductoDetalleModal
          producto={productoDetalle}
          onClose={() => setProductoDetalle(null)}
        />

        <ConfirmDialog
          isOpen={productoABorrar !== null}
          onClose={() => setProductoABorrar(null)}
          onConfirm={async () => {
            if (!productoABorrar) return;
            await borrarProducto.mutateAsync(productoABorrar.id);
            setProductoABorrar(null);
          }}
          title="Eliminar producto"
          message={`¿Eliminar «${productoABorrar?.name}»? Los tickets ya cobrados lo conservan, pero dejará de poder venderse.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={borrarProducto.isPending}
        />
      </div>
    </MainLayout>
  );
}
