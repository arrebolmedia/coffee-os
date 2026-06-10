'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  Calculator,
  Calendar,
  Coffee,
  DollarSign,
  Percent,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { MainLayout } from '@/components/layout/MainLayout';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  useLowMarginProducts,
  useMarginDistribution,
  useTopProfitableProducts,
} from '@/hooks/use-costing';

interface DashboardStats {
  sales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    todayTransactions: number;
    averageTicket: number;
  };
  products: {
    topSelling: Array<{
      name: string;
      quantity: number;
      revenue: number;
    }>;
    lowStock: Array<{
      name: string;
      stock: number;
      minStock: number;
    }>;
  };
  customers: {
    total: number;
    newToday: number;
    loyaltyActive: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const organizationId = user?.organizationId || '';

  // Fetch profitability data
  const { data: topProfitable } = useTopProfitableProducts(
    organizationId,
    5,
    !!organizationId,
  );
  const { data: lowMargin } = useLowMarginProducts(
    organizationId,
    5,
    !!organizationId,
  );
  const { data: marginDistribution } = useMarginDistribution(
    organizationId,
    !!organizationId,
  );

  // Build deterministic date ranges (memoized so query keys are stable across renders)
  const ranges = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      now: now.toISOString(),
      today: today.toISOString(),
      startOfWeek: startOfWeek.toISOString(),
      startOfMonth: startOfMonth.toISOString(),
    };
  }, []);

  const dashboardKey = ['dashboard', organizationId] as const;

  const dashboardTodayQuery = useQuery({
    queryKey: [...dashboardKey, 'analytics', 'today', ranges.today, ranges.now],
    queryFn: () =>
      api.get<any>(
        `/analytics/dashboard?${new URLSearchParams({
          organization_id: organizationId,
          start_date: ranges.today,
          end_date: ranges.now,
        }).toString()}`,
      ),
    enabled: !!organizationId,
  });

  const dashboardWeekQuery = useQuery({
    queryKey: [
      ...dashboardKey,
      'analytics',
      'week',
      ranges.startOfWeek,
      ranges.now,
    ],
    queryFn: () =>
      api.get<any>(
        `/analytics/dashboard?${new URLSearchParams({
          organization_id: organizationId,
          start_date: ranges.startOfWeek,
          end_date: ranges.now,
        }).toString()}`,
      ),
    enabled: !!organizationId,
  });

  const dashboardMonthQuery = useQuery({
    queryKey: [
      ...dashboardKey,
      'analytics',
      'month',
      ranges.startOfMonth,
      ranges.now,
    ],
    queryFn: () =>
      api.get<any>(
        `/analytics/dashboard?${new URLSearchParams({
          organization_id: organizationId,
          start_date: ranges.startOfMonth,
          end_date: ranges.now,
        }).toString()}`,
      ),
    enabled: !!organizationId,
  });

  const inventoryStatsQuery = useQuery({
    queryKey: [...dashboardKey, 'inventory-stats'],
    queryFn: () =>
      api.get<any>(`/inventory/organization/${organizationId}/stats`),
    enabled: !!organizationId,
  });

  const customerStatsQuery = useQuery({
    queryKey: [...dashboardKey, 'customer-stats'],
    queryFn: () =>
      api.get<any>(`/crm/customers/stats?organization_id=${organizationId}`),
    enabled: !!organizationId,
  });

  const loading =
    dashboardTodayQuery.isLoading ||
    dashboardWeekQuery.isLoading ||
    dashboardMonthQuery.isLoading ||
    inventoryStatsQuery.isLoading ||
    customerStatsQuery.isLoading;

  const hasError =
    dashboardTodayQuery.isError ||
    dashboardWeekQuery.isError ||
    dashboardMonthQuery.isError ||
    inventoryStatsQuery.isError ||
    customerStatsQuery.isError;
  const error = hasError ? 'Error al cargar datos del dashboard' : null;

  const stats: DashboardStats | null = useMemo(() => {
    if (loading || hasError) return null;
    const dashboardToday = dashboardTodayQuery.data || {};
    const dashboardWeek = dashboardWeekQuery.data || {};
    const dashboardMonth = dashboardMonthQuery.data || {};
    const inventoryStats = inventoryStatsQuery.data || { lowStockItems: [] };
    const customerStats = customerStatsQuery.data || {};

    return {
      sales: {
        today: dashboardToday.today_sales || 0,
        thisWeek: dashboardWeek.today_sales || 0,
        thisMonth: dashboardMonth.today_sales || 0,
        todayTransactions: dashboardToday.today_orders || 0,
        averageTicket: dashboardToday.today_avg_order_value || 0,
      },
      products: {
        topSelling:
          dashboardToday.top_products?.map((product: any) => ({
            name: product.name || product.product_name,
            quantity: product.quantity_sold || 0,
            revenue: product.revenue || 0,
          })) || [],
        lowStock:
          inventoryStats.lowStockItems?.map((item: any) => ({
            name: item.name || item.product_name,
            stock: item.current_stock || item.stock || 0,
            minStock: item.min_stock || item.minStock || 0,
          })) || [],
      },
      customers: {
        total: customerStats.total || 0,
        newToday: customerStats.new_today || 0,
        loyaltyActive: customerStats.loyalty_active || 0,
      },
    };
  }, [
    loading,
    hasError,
    dashboardTodayQuery.data,
    dashboardWeekQuery.data,
    dashboardMonthQuery.data,
    inventoryStatsQuery.data,
    customerStatsQuery.data,
  ]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Coffee className="w-12 h-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !stats) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>{error || 'Error desconocido'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Coffee className="w-8 h-8 text-amber-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Dashboard CoffeeOS
                  </h1>
                  <p className="text-sm text-gray-500">
                    {new Date().toLocaleDateString('es-MX', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <Link
                href="/pos"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Ir al POS
              </Link>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          {/* KPIs Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Ventas Hoy */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 rounded-lg p-3">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">Ventas Hoy</h3>
              <p className="text-3xl font-bold text-gray-800">
                $
                {stats.sales.today.toLocaleString('es-MX', {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.sales.todayTransactions} transacciones
              </p>
            </div>

            {/* Ticket Promedio */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 rounded-lg p-3">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">Ticket Promedio</h3>
              <p className="text-3xl font-bold text-gray-800">
                ${stats.sales.averageTicket.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-2">por transacción</p>
            </div>

            {/* Ventas Semana */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 rounded-lg p-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">Ventas Semana</h3>
              <p className="text-3xl font-bold text-gray-800">
                ${stats.sales.thisWeek.toLocaleString('es-MX')}
              </p>
              <p className="text-xs text-gray-500 mt-2">últimos 7 días</p>
            </div>

            {/* Clientes */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-orange-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-orange-600 text-sm font-semibold">
                  {stats.customers.newToday} nuevos
                </span>
              </div>
              <h3 className="text-gray-500 text-sm mb-1">Clientes</h3>
              <p className="text-3xl font-bold text-gray-800">
                {stats.customers.total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {stats.customers.loyaltyActive} en programa lealtad
              </p>
            </div>
          </div>

          {/* Productos y Alertas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Productos */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-amber-600" />
                Productos Más Vendidos
              </h2>
              <div className="space-y-4">
                {stats.products.topSelling.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {product.name}
                        </span>
                        <span className="text-sm text-gray-600">
                          {product.quantity} unidades
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-amber-600 h-2 rounded-full"
                          style={{
                            width: `${
                              stats.products.topSelling.length > 0 &&
                              stats.products.topSelling[0].quantity > 0
                                ? (product.quantity /
                                    stats.products.topSelling[0].quantity) *
                                  100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-green-600">
                      ${product.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alertas de Inventario */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                Alertas de Inventario
              </h2>
              <div className="space-y-4">
                {stats.products.lowStock.length > 0 ? (
                  stats.products.lowStock.map((item, index) => (
                    <div
                      key={index}
                      className="bg-red-50 border-l-4 border-red-500 p-4 rounded"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-red-800">
                            {item.name}
                          </h3>
                          <p className="text-sm text-red-600">
                            Stock bajo: {item.stock} / {item.minStock} mínimo
                          </p>
                        </div>
                        <button className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors">
                          Reponer
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay alertas de inventario</p>
                  </div>
                )}
              </div>

              {/* Ventas del Mes */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Ventas del Mes</p>
                    <p className="text-2xl font-bold text-gray-800">
                      ${stats.sales.thisMonth.toLocaleString('es-MX')}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-lg p-3">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profitability Analysis - NEW SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Margin Distribution */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Percent className="w-5 h-5 mr-2 text-indigo-600" />
                Distribución de Márgenes
              </h2>
              {marginDistribution ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-4xl font-bold text-indigo-600">
                      {marginDistribution.avgMargin.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-500">Margen Promedio</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-700">
                          Excelente (&gt;70%)
                        </span>
                      </div>
                      <span className="font-semibold text-green-600">
                        {marginDistribution.distribution.excellent}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-gray-700">
                          Bueno (60-70%)
                        </span>
                      </div>
                      <span className="font-semibold text-blue-600">
                        {marginDistribution.distribution.good}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-sm text-gray-700">
                          Bajo (40-60%)
                        </span>
                      </div>
                      <span className="font-semibold text-yellow-600">
                        {marginDistribution.distribution.warning}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-sm text-gray-700">
                          Crítico (&lt;40%)
                        </span>
                      </div>
                      <span className="font-semibold text-red-600">
                        {marginDistribution.distribution.critical}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 mt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Total: {marginDistribution.totalProducts} productos
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Calculando márgenes...</p>
                </div>
              )}
            </div>

            {/* Top Profitable Products */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Más Rentables
              </h2>
              {topProfitable && topProfitable.length > 0 ? (
                <div className="space-y-3">
                  {topProfitable.map((product, index) => (
                    <div
                      key={product.product_id}
                      className="bg-green-50 border-l-4 border-green-500 p-3 rounded"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-green-100 text-green-800 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h3 className="font-semibold text-gray-800 text-sm">
                              {product.product_name}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-600 ml-8">
                            Precio: ${product.sale_price.toFixed(2)} | Costo: $
                            {product.total_cost.toFixed(2)}
                          </p>
                        </div>
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                          {product.margin_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay datos disponibles</p>
                </div>
              )}
            </div>

            {/* Low Margin Products - Alert */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                Margen Bajo
              </h2>
              {lowMargin && lowMargin.length > 0 ? (
                <div className="space-y-3">
                  {lowMargin.map((product, _index) => (
                    <div
                      key={product.product_id}
                      className="bg-red-50 border-l-4 border-red-500 p-3 rounded"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <h3 className="font-semibold text-gray-800 text-sm">
                              {product.product_name}
                            </h3>
                          </div>
                          <p className="text-xs text-gray-600 ml-6">
                            {product.recommendation}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${
                            product.margin_status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {product.margin_percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Todos los productos tienen buen margen</p>
                </div>
              )}
            </div>
          </div>

          {/* Accesos Rápidos */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Accesos Rápidos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/pos"
                className="bg-green-50 hover:bg-green-100 border-2 border-green-200 rounded-lg p-4 text-center transition-colors"
              >
                <ShoppingCart className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">POS</p>
              </Link>
              <Link
                href="/inventory"
                className="bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 rounded-lg p-4 text-center transition-colors"
              >
                <BarChart3 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Inventario</p>
              </Link>
              <Link
                href="/customers"
                className="bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 rounded-lg p-4 text-center transition-colors"
              >
                <Users className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Clientes</p>
              </Link>
              <Link
                href="/quality"
                className="bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 rounded-lg p-4 text-center transition-colors"
              >
                <Coffee className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <p className="font-semibold text-gray-800">Calidad</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
