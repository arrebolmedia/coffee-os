'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useSalesByCategory,
  useSalesMetrics,
  useTopProducts,
} from '@/hooks/use-analytics';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Filter,
  PieChart,
  ShoppingCart,
  TrendingUp,
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

  const apiDateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (period === 'day') start.setDate(start.getDate() - 1);
    else if (period === 'week') start.setDate(start.getDate() - 7);
    else if (period === 'month') start.setMonth(start.getMonth() - 1);
    else start.setFullYear(start.getFullYear() - 1);
    return { start_date: start.toISOString(), end_date: end.toISOString() };
  }, [period]);

  const { data: salesMetrics } = useSalesMetrics(apiDateRange);
  const { data: topProductsData = [] } = useTopProducts(apiDateRange);
  const { data: categoryData = [] } = useSalesByCategory(apiDateRange);

  const mockSalesData: SalesData[] = [];

  // Calculations from real API data
  const totalRevenue = salesMetrics?.gross_sales ?? 0;
  const totalTransactions = salesMetrics?.total_orders ?? 0;
  const avgTicket = salesMetrics?.avg_order_value ?? 0;
  const avgGrowthRate =
    salesMetrics?.vs_previous_period?.gross_sales_change_percent ?? 0;
  const peakHour = salesMetrics?.peak_hour ?? 'N/A';

  const mockHourlySales: HourlySales[] = (
    salesMetrics?.hourly_breakdown ?? []
  ).map((h: any) => ({
    hour: String(h.hour).padStart(2, '0') + ':00',
    revenue: h.revenue ?? 0,
    transactions: h.orders ?? 0,
  }));
  const maxHourlyRevenue =
    mockHourlySales.length > 0
      ? Math.max(...mockHourlySales.map((h) => h.revenue))
      : 0;

  const mockProductSales: ProductSales[] = (topProductsData as any[]).map(
    (p: any, i: number) => ({
      id: p.product_id || String(i),
      product: p.product_name || p.name || '—',
      category: p.category_name || p.category || '—',
      quantity: p.quantity_sold ?? p.quantity ?? 0,
      revenue: p.revenue ?? 0,
      margin: p.margin ?? 0,
      percentOfTotal: p.percent_of_total ?? 0,
    }),
  );

  const mockCategorySales: CategorySales[] = (categoryData as any[]).map(
    (c: any, i: number) => ({
      category: c.category_name || c.category || '—',
      revenue: c.revenue ?? 0,
      percentage: c.percentage ?? 0,
      color: [
        'bg-orange-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-pink-500',
        'bg-purple-500',
      ][i % 5],
    }),
  );

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
