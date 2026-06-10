/**
 * CoffeeOS - Costing Module
 * Análisis de costos por producto/receta con márgenes y pricing
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/hooks/use-auth';
import { useProfitabilityReport } from '@/hooks/use-costing';
import {
  AlertTriangle,
  BarChart3,
  Calculator,
  CheckCircle,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Loader2,
  Package,
  Percent,
  Plus,
  Search,
  TrendingDown,
} from 'lucide-react';

interface CostingItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  costPrice: number;
  salePrice: number;
  margin: number;
  marginPercent: number;
  ingredients: number;
  labor: number;
  overhead: number;
  suggestedPrice: number;
  status: 'optimal' | 'low-margin' | 'loss' | 'review';
  monthlyVolume: number;
}

export default function CostingPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const organizationId = user?.organizationId || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Obtener datos reales del backend
  const {
    data: profitabilityData,
    isLoading,
    error,
  } = useProfitabilityReport(
    organizationId,
    isAuthenticated && !!organizationId,
  );

  // Extraer todos los productos del reporte (eliminar duplicados por product_id)
  const allProducts = profitabilityData
    ? Array.from(
        new Map(
          [
            ...(profitabilityData.top_profitable || []),
            ...(profitabilityData.least_profitable || []),
          ].map((item) => [item.product_id, item]),
        ).values(),
      )
    : [];

  // Mapear datos del backend al formato de la UI
  const costingItems: CostingItem[] = allProducts.map((item) => ({
    id: item.product_id,
    name: item.product_name,
    sku: item.product_id,
    category: 'Café', // TODO: obtener de producto
    costPrice: item.total_cost || 0,
    salePrice: item.sale_price || 0,
    margin: item.gross_margin || 0,
    marginPercent: item.margin_percentage || 0,
    ingredients: (item.total_cost || 0) * 0.7, // Estimado
    labor: (item.total_cost || 0) * 0.2,
    overhead: (item.total_cost || 0) * 0.1,
    suggestedPrice: item.sale_price || 0,
    status:
      item.margin_percentage >= 70
        ? 'optimal'
        : item.margin_percentage >= 60
          ? 'optimal'
          : item.margin_percentage >= 40
            ? 'review'
            : 'low-margin',
    monthlyVolume: 0, // TODO: obtener de ventas
  }));

  const filteredItems = costingItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus =
      filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const stats = {
    totalItems: costingItems.length,
    avgMargin: (
      costingItems.reduce((sum, item) => sum + item.marginPercent, 0) /
      costingItems.length
    ).toFixed(1),
    optimal: costingItems.filter((item) => item.status === 'optimal').length,
    needsReview: costingItems.filter(
      (item) => item.status === 'review' || item.status === 'low-margin',
    ).length,
    totalRevenue: costingItems.reduce(
      (sum, item) => sum + item.margin * item.monthlyVolume,
      0,
    ),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'low-margin':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'loss':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'review':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal':
        return <CheckCircle className="w-4 h-4" />;
      case 'low-margin':
        return <TrendingDown className="w-4 h-4" />;
      case 'loss':
        return <AlertTriangle className="w-4 h-4" />;
      case 'review':
        return <Eye className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'Óptimo';
      case 'low-margin':
        return 'Margen Bajo';
      case 'loss':
        return 'Pérdida';
      case 'review':
        return 'Revisar';
      default:
        return status;
    }
  };

  // Auth loading state
  if (authLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verificando autenticación...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !organizationId) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <AlertTriangle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2 text-center">
              Autenticación Requerida
            </h3>
            <p className="text-yellow-600 text-center mb-4">
              Debes iniciar sesión para ver el análisis de costeo.
            </p>
            <div className="flex justify-center">
              <a
                href="/login"
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Iniciar Sesión
              </a>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando análisis de costeo...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2 text-center">
              Error al cargar datos
            </h3>
            <p className="text-red-600 text-center">
              No se pudo obtener el análisis de costeo. Intenta recargar la
              página.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Calculator className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Costeo de Productos
                  </h1>
                  <p className="text-sm text-gray-500">
                    Análisis de costos, márgenes y rentabilidad
                  </p>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Plus className="w-5 h-5" />
                Nuevo Análisis
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Productos</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalItems}
                  </p>
                </div>
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Margen Promedio</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.avgMargin}%
                  </p>
                </div>
                <Percent className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Óptimos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.optimal}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Requieren Revisión</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.needsReview}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Utilidad Mensual</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${stats.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar producto o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todas las Categorías</option>
                  <option value="Bebidas Calientes">Bebidas Calientes</option>
                  <option value="Bebidas Frías">Bebidas Frías</option>
                  <option value="Alimentos">Alimentos</option>
                  <option value="Panadería">Panadería</option>
                  <option value="Postres">Postres</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <BarChart3 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="optimal">Óptimo</option>
                  <option value="review">Revisar</option>
                  <option value="low-margin">Margen Bajo</option>
                  <option value="loss">Pérdida</option>
                </select>
              </div>
            </div>
          </div>

          {/* Costing Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Venta
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margen
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margen %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Sugerido
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">{item.sku}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-gray-900">
                          ${item.costPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          ${item.salePrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-green-600 font-medium">
                          ${item.margin.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-sm font-medium ${
                            item.marginPercent >= 60
                              ? 'text-green-600'
                              : item.marginPercent >= 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }`}
                        >
                          {item.marginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-blue-600">
                          ${item.suggestedPrice.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                              item.status,
                            )}`}
                          >
                            {getStatusIcon(item.status)}
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1 text-green-600 hover:bg-green-50 rounded">
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron productos
                  </h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <Calculator className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-1">
                  Análisis de Costeo
                </h4>
                <p className="text-sm text-green-700">
                  Los costos incluyen ingredientes, mano de obra y gastos
                  generales. El margen óptimo recomendado es de 60% o más para
                  garantizar rentabilidad. Revisa regularmente los productos
                  marcados para ajustar precios o reducir costos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
