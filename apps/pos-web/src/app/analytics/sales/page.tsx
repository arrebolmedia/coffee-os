'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Filter,
  BarChart3,
  PieChart,
  TrendingDown,
} from 'lucide-react';

// Interfaces
interface SalesData {
  id: string;
  date: string;
  location: string;
  revenue: number;
  transactions: number;
  avgTicket: number;
  customers: number;
  growthRate: number;
  category: 'excellent' | 'good' | 'regular' | 'poor';
}

interface ProductSales {
  id: string;
  product: string;
  category: string;
  quantity: number;
  revenue: number;
  margin: number;
  percentOfTotal: number;
}

interface HourlySales {
  hour: string;
  revenue: number;
  transactions: number;
}

interface CategorySales {
  category: string;
  revenue: number;
  percentage: number;
  color: string;
}

const AnalyticsSalesPage = () => {
  // Filters
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>(
    'month',
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    start: '2024-11-01',
    end: '2024-11-30',
  });

  // TODO: Fetch real sales data from API
  const mockSalesData: SalesData[] = [];

  const mockProductSales: ProductSales[] = [
    {
      id: '1',
      product: 'Latte',
      category: 'Café Caliente',
      quantity: 1245,
      revenue: 74700,
      margin: 68.5,
      percentOfTotal: 18.2,
    },
    {
      id: '2',
      product: 'Americano',
      category: 'Café Caliente',
      quantity: 1089,
      revenue: 54450,
      margin: 72.3,
      percentOfTotal: 13.3,
    },
    {
      id: '3',
      product: 'Capuchino',
      category: 'Café Caliente',
      quantity: 987,
      revenue: 65169,
      margin: 67.8,
      percentOfTotal: 15.9,
    },
    {
      id: '4',
      product: 'Croissant',
      category: 'Alimentos',
      quantity: 876,
      revenue: 43800,
      margin: 55.2,
      percentOfTotal: 10.7,
    },
    {
      id: '5',
      product: 'Frappé',
      category: 'Café Frío',
      quantity: 823,
      revenue: 57610,
      margin: 64.1,
      percentOfTotal: 14.0,
    },
    {
      id: '6',
      product: 'Sandwich Club',
      category: 'Alimentos',
      quantity: 654,
      revenue: 52320,
      margin: 48.7,
      percentOfTotal: 12.8,
    },
    {
      id: '7',
      product: 'Espresso',
      category: 'Café Caliente',
      quantity: 567,
      revenue: 22680,
      margin: 75.4,
      percentOfTotal: 5.5,
    },
    {
      id: '8',
      product: 'Té Chai Latte',
      category: 'Té',
      quantity: 445,
      revenue: 24475,
      margin: 62.3,
      percentOfTotal: 6.0,
    },
    {
      id: '9',
      product: 'Pastel de Zanahoria',
      category: 'Postres',
      quantity: 389,
      revenue: 19450,
      margin: 58.9,
      percentOfTotal: 4.7,
    },
    {
      id: '10',
      product: 'Cold Brew',
      category: 'Café Frío',
      quantity: 334,
      revenue: 23380,
      margin: 69.2,
      percentOfTotal: 5.7,
    },
  ];

  const mockHourlySales: HourlySales[] = [
    { hour: '07:00', revenue: 2800, transactions: 32 },
    { hour: '08:00', revenue: 5600, transactions: 64 },
    { hour: '09:00', revenue: 7200, transactions: 78 },
    { hour: '10:00', revenue: 6400, transactions: 71 },
    { hour: '11:00', revenue: 5800, transactions: 65 },
    { hour: '12:00', revenue: 6200, transactions: 68 },
    { hour: '13:00', revenue: 7800, transactions: 85 },
    { hour: '14:00', revenue: 8200, transactions: 89 },
    { hour: '15:00', revenue: 7400, transactions: 81 },
    { hour: '16:00', revenue: 6800, transactions: 74 },
    { hour: '17:00', revenue: 7600, transactions: 82 },
    { hour: '18:00', revenue: 8400, transactions: 91 },
    { hour: '19:00', revenue: 6600, transactions: 72 },
    { hour: '20:00', revenue: 4200, transactions: 47 },
  ];

  const mockCategorySales: CategorySales[] = [
    {
      category: 'Café Caliente',
      revenue: 216999,
      percentage: 52.9,
      color: 'bg-orange-500',
    },
    {
      category: 'Café Frío',
      revenue: 80990,
      percentage: 19.7,
      color: 'bg-blue-500',
    },
    {
      category: 'Alimentos',
      revenue: 96120,
      percentage: 23.5,
      color: 'bg-green-500',
    },
    {
      category: 'Postres',
      revenue: 19450,
      percentage: 4.7,
      color: 'bg-pink-500',
    },
    { category: 'Té', revenue: 24475, percentage: 6.0, color: 'bg-purple-500' },
  ];

  // Calculations
  const totalRevenue = mockSalesData.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const totalTransactions = mockSalesData.reduce(
    (sum, item) => sum + item.transactions,
    0,
  );
  const avgTicket = totalRevenue / totalTransactions;
  const avgGrowthRate =
    mockSalesData.reduce((sum, item) => sum + item.growthRate, 0) /
    mockSalesData.length;

  const maxHourlyRevenue = Math.max(...mockHourlySales.map((h) => h.revenue));
  const peakHour =
    mockHourlySales.find((h) => h.revenue === maxHourlyRevenue)?.hour || '';

  const getCategoryBadge = (category: SalesData['category']) => {
    const styles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      regular: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800',
    };
    const labels = {
      excellent: 'Excelente',
      good: 'Bueno',
      regular: 'Regular',
      poor: 'Bajo',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[category]}`}
      >
        {labels[category]}
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
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Analytics de Ventas
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis detallado de ventas por ubicación, producto y horario
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
              value={period}
              onChange={(e) => setPeriod(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas las Ubicaciones</option>
              <option value="centro">Centro</option>
              <option value="polanco">Polanco</option>
              <option value="santa-fe">Santa Fe</option>
              <option value="roma">Roma</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end: e.target.value })
                }
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalRevenue.toLocaleString('es-MX')}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    {avgGrowthRate.toFixed(1)}% vs período anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalTransactions.toLocaleString('es-MX')}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    +8.5% vs período anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${avgTicket.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    +3.2% vs período anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Hora Pico</p>
                <p className="text-2xl font-bold text-gray-900">{peakHour}</p>
                <p className="text-sm text-gray-600 mt-2">
                  ${maxHourlyRevenue.toLocaleString('es-MX')} en ventas
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Sales Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Ventas Diarias por Ubicación
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ingresos
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Transacciones
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ticket Promedio
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Clientes
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Crecimiento
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Categoría
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockSalesData.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.date).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      ${sale.revenue.toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {sale.transactions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      ${sale.avgTicket.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {sale.customers}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        {sale.growthRate >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                        )}
                        <span
                          className={
                            sale.growthRate >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {sale.growthRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getCategoryBadge(sale.category)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Products */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Top 10 Productos
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockProductSales.map((product, index) => (
                  <div key={product.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {product.product}
                          </p>
                          <p className="text-xs text-gray-500">
                            {product.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          ${product.revenue.toLocaleString('es-MX')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.quantity} unidades
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${product.percentOfTotal * 5}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">
                        {product.percentOfTotal}% del total
                      </span>
                      <span className="text-xs text-green-600 font-medium">
                        {product.margin}% margen
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hourly Sales Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Ventas por Hora
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {mockHourlySales.map((hour) => {
                  const barWidth = (hour.revenue / maxHourlyRevenue) * 100;
                  return (
                    <div key={hour.hour} className="flex items-center gap-4">
                      <div className="w-16 text-sm font-medium text-gray-700">
                        {hour.hour}
                      </div>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-8 relative">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                            style={{ width: `${barWidth}%` }}
                          >
                            <span className="text-xs font-bold text-white">
                              ${hour.revenue.toLocaleString('es-MX')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-16 text-right text-sm text-gray-600">
                        {hour.transactions} tx
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Category Sales */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              Ventas por Categoría
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {mockCategorySales.map((cat) => (
                <div key={cat.category} className="text-center">
                  <div className="relative inline-block mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - cat.percentage / 100)}`}
                        className={cat.color.replace('bg-', 'text-')}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {cat.percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {cat.category}
                  </h3>
                  <p className="text-sm text-gray-600">
                    ${cat.revenue.toLocaleString('es-MX')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnalyticsSalesPage;
