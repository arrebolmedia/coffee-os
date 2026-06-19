'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Box,
  DollarSign,
  Download,
  Filter,
  Package,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

// Interfaces
interface InventoryItem {
  id: string;
  product: string;
  category: string;
  currentStock: number;
  avgDailySales: number;
  rotationDays: number;
  rotationCategory: 'A' | 'B' | 'C';
  reorderPoint: number;
  cost: number;
  totalValue: number;
  status: 'optimal' | 'slow' | 'critical' | 'excess';
}

interface RotationAnalysis {
  category: string;
  items: number;
  avgRotation: number;
  totalValue: number;
  percentage: number;
  color: string;
}

interface StockTrend {
  date: string;
  stockValue: number;
  wasteValue: number;
}

interface CategoryPerformance {
  category: string;
  turnoverRate: number;
  wastePercentage: number;
  stockValue: number;
  avgRotation: number;
}

const AnalyticsInventoryPage = () => {
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [rotationFilter, setRotationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // TODO: Fetch real inventory data from API
  const mockInventoryData: InventoryItem[] = [];

  const mockRotationAnalysis: RotationAnalysis[] = [
    {
      category: 'A',
      items: 6,
      avgRotation: 3.3,
      totalValue: 9679,
      percentage: 42.3,
      color: 'bg-green-500',
    },
    {
      category: 'B',
      items: 2,
      avgRotation: 10.4,
      totalValue: 8875,
      percentage: 38.8,
      color: 'bg-yellow-500',
    },
    {
      category: 'C',
      items: 2,
      avgRotation: 18.3,
      totalValue: 5390,
      percentage: 23.6,
      color: 'bg-red-500',
    },
  ];

  const mockStockTrends: StockTrend[] = [
    { date: '2024-11-01', stockValue: 24500, wasteValue: 320 },
    { date: '2024-11-05', stockValue: 23800, wasteValue: 280 },
    { date: '2024-11-10', stockValue: 25100, wasteValue: 310 },
    { date: '2024-11-15', stockValue: 23200, wasteValue: 290 },
    { date: '2024-11-20', stockValue: 24700, wasteValue: 265 },
    { date: '2024-11-25', stockValue: 22900, wasteValue: 230 },
    { date: '2024-11-30', stockValue: 23944, wasteValue: 198 },
  ];

  const mockCategoryPerformance: CategoryPerformance[] = [
    {
      category: 'Café',
      turnoverRate: 8.5,
      wastePercentage: 2.1,
      stockValue: 5040,
      avgRotation: 3.5,
    },
    {
      category: 'Lácteos',
      turnoverRate: 7.2,
      wastePercentage: 4.3,
      stockValue: 2115,
      avgRotation: 3.7,
    },
    {
      category: 'Alimentos',
      turnoverRate: 12.3,
      wastePercentage: 6.8,
      stockValue: 2304,
      avgRotation: 12.6,
    },
    {
      category: 'Té',
      turnoverRate: 3.1,
      wastePercentage: 1.2,
      stockValue: 3230,
      avgRotation: 12.7,
    },
    {
      category: 'Endulzantes',
      turnoverRate: 4.5,
      wastePercentage: 0.8,
      stockValue: 2275,
      avgRotation: 13.0,
    },
    {
      category: 'Saborizantes',
      turnoverRate: 6.8,
      wastePercentage: 1.5,
      stockValue: 780,
      avgRotation: 3.0,
    },
  ];

  // Calculations
  const totalStockValue = mockInventoryData.reduce(
    (sum, item) => sum + item.totalValue,
    0,
  );
  const avgRotation =
    mockInventoryData.length > 0
      ? mockInventoryData.reduce((sum, item) => sum + item.rotationDays, 0) /
        mockInventoryData.length
      : 0;
  const criticalItems = mockInventoryData.filter(
    (item) => item.status === 'critical',
  ).length;
  const slowMovingItems = mockInventoryData.filter(
    (item) => item.status === 'slow',
  ).length;

  const maxStockValue = Math.max(...mockStockTrends.map((t) => t.stockValue));

  const getStatusBadge = (status: InventoryItem['status']) => {
    const styles = {
      optimal: 'bg-green-100 text-green-800',
      slow: 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
      excess: 'bg-blue-100 text-blue-800',
    };
    const labels = {
      optimal: 'Óptimo',
      slow: 'Lento',
      critical: 'Crítico',
      excess: 'Exceso',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const getRotationBadge = (category: InventoryItem['rotationCategory']) => {
    const styles = {
      A: 'bg-green-100 text-green-800',
      B: 'bg-yellow-100 text-yellow-800',
      C: 'bg-red-100 text-red-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-bold ${styles[category]}`}
      >
        {category}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-8 h-8 text-purple-600" />
              Analytics de Inventario
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis de rotación, stock y costos de inventario
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                Filtros:
              </span>
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todas las Categorías</option>
              <option value="cafe">Café</option>
              <option value="lacteos">Lácteos</option>
              <option value="alimentos">Alimentos</option>
              <option value="te">Té</option>
              <option value="endulzantes">Endulzantes</option>
            </select>

            <select
              value={rotationFilter}
              onChange={(e) => setRotationFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todas las Rotaciones</option>
              <option value="A">Rotación A (Alta)</option>
              <option value="B">Rotación B (Media)</option>
              <option value="C">Rotación C (Baja)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">Todos los Estados</option>
              <option value="optimal">Óptimo</option>
              <option value="slow">Lento</option>
              <option value="critical">Crítico</option>
              <option value="excess">Exceso</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Valor Total de Stock
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalStockValue.toLocaleString('es-MX')}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    -2.1% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rotación Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgRotation.toFixed(1)} días
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    +15% más rápido
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Productos Críticos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {criticalItems}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Requieren reorden urgente
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Rotación Lenta</p>
                <p className="text-2xl font-bold text-gray-900">
                  {slowMovingItems}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Productos de baja rotación
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingDown className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Box className="w-5 h-5 text-purple-600" />
              Análisis Detallado de Inventario
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Venta Diaria
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Rotación (días)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    ABC
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockInventoryData.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {item.product}
                      </div>
                      <div className="text-xs text-gray-500">
                        Punto de reorden: {item.reorderPoint}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {item.avgDailySales}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span
                        className={
                          item.rotationDays < 7
                            ? 'text-green-600 font-medium'
                            : item.rotationDays < 14
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }
                      >
                        {item.rotationDays.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getRotationBadge(item.rotationCategory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      ${item.totalValue.toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(item.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* ABC Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Análisis ABC de Rotación
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {mockRotationAnalysis.map((analysis) => (
                  <div key={analysis.category}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${analysis.color}`}
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-900">
                            Categoría {analysis.category}
                          </p>
                          <p className="text-xs text-gray-500">
                            {analysis.items} productos •{' '}
                            {analysis.avgRotation.toFixed(1)} días promedio
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          ${analysis.totalValue.toLocaleString('es-MX')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {analysis.percentage}% del valor
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`${analysis.color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${analysis.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">
                  <span className="font-bold">Categoría A:</span> Alta rotación
                  (&lt;7 días) - Productos críticos
                </p>
                <p className="text-xs text-gray-600 mb-2">
                  <span className="font-bold">Categoría B:</span> Media rotación
                  (7-14 días) - Productos estándar
                </p>
                <p className="text-xs text-gray-600">
                  <span className="font-bold">Categoría C:</span> Baja rotación
                  (&gt;14 días) - Productos lentos
                </p>
              </div>
            </div>
          </div>

          {/* Stock Value Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                Tendencia de Valor de Stock
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {mockStockTrends.map((trend) => {
                  const barWidth = (trend.stockValue / maxStockValue) * 100;
                  return (
                    <div key={trend.date}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {new Date(trend.date).toLocaleDateString('es-MX', {
                            day: '2-digit',
                            month: 'short',
                          })}
                        </span>
                        <span className="text-xs text-gray-600">
                          Merma: ${trend.wasteValue}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 relative">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                          style={{ width: `${barWidth}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            ${trend.stockValue.toLocaleString('es-MX')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Rendimiento por Categoría
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Tasa de Rotación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    % Merma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Valor en Stock
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Rotación (días)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockCategoryPerformance.map((cat) => (
                  <tr key={cat.category} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {cat.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className="text-green-600 font-medium">
                        {cat.turnoverRate.toFixed(1)}x
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span
                        className={
                          cat.wastePercentage > 5
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      >
                        {cat.wastePercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      ${cat.stockValue.toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {cat.avgRotation.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnalyticsInventoryPage;
