'use client';

import { useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDashboardSummary, useKPIDashboard } from '@/hooks/use-analytics';

/**
 * Formatea un KPI que el backend puede devolver como null (flag `unavailable`).
 * Devuelve '—' cuando no hay dato para no crashear con .toFixed sobre null.
 */
const fmtKpi = (value: number | null | undefined, decimals = 1): string =>
  value === null || value === undefined ? '—' : value.toFixed(decimals);

export default function KPIsPage() {
  // QueryAnalyticsDto del backend exige start_date/end_date (@IsNotEmpty):
  // sin rango la API responde 400. Default: mes actual.
  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start_date: startOfMonth.toISOString(),
      end_date: now.toISOString(),
    };
  }, []);

  const { data: kpis, isLoading: kpisLoading } = useKPIDashboard(dateRange);
  const { data: summary, isLoading: summaryLoading } =
    useDashboardSummary(dateRange);

  const isLoading = kpisLoading || summaryLoading;

  const getStatusColor = (status: string | null) => {
    const colors = {
      GOOD: 'text-green-600',
      WARNING: 'text-yellow-600',
      CRITICAL: 'text-red-600',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const getStatusIcon = (status: string | null) => {
    if (status === 'GOOD')
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (status === 'WARNING')
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    if (status === 'CRITICAL')
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-gray-600" />;
  };

  const getAlertColor = (type: string) => {
    if (type === 'INFO') return 'bg-blue-50 border-blue-200 text-blue-800';
    if (type === 'WARNING')
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (type === 'CRITICAL') return 'bg-red-50 border-red-200 text-red-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard KPIs</h1>
            <p className="text-gray-600 mt-1">Indicadores clave de desempeño</p>
          </div>
          <Activity className="h-12 w-12 text-blue-600" />
        </div>

        {/* Quick Metrics - Today */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">
                    Ventas Hoy
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    ${(summary.today_sales / 1000).toFixed(1)}k
                  </p>
                </div>
                <DollarSign className="h-12 w-12 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">
                    Órdenes Hoy
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {summary.today_orders}
                  </p>
                </div>
                <ShoppingCart className="h-12 w-12 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">
                    Clientes Hoy
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    {summary.today_customers}
                  </p>
                </div>
                <Users className="h-12 w-12 text-purple-200" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">
                    Ticket Promedio
                  </p>
                  <p className="text-3xl font-bold mt-1">
                    ${summary.today_avg_order_value.toFixed(0)}
                  </p>
                </div>
                <Activity className="h-12 w-12 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {summary?.alerts && summary.alerts.length > 0 && (
          <div className="space-y-3">
            {summary.alerts.map((alert, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getAlertColor(alert.type)}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{alert.category}</p>
                    <p className="text-sm mt-1">{alert.message}</p>
                    {alert.action_required && (
                      <p className="text-xs mt-2 font-medium">
                        Acción: {alert.action_required}
                      </p>
                    )}
                  </div>
                  {alert.value !== undefined && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {alert.value}
                        {alert.threshold && `/${alert.threshold}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPIs Section */}
        {kpis && (
          <>
            {/* Profitability KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Rentabilidad
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Margen Bruto</span>
                    {getStatusIcon(kpis.status.gross_margin)}
                  </div>
                  <p
                    className={`text-3xl font-bold ${getStatusColor(kpis.status.gross_margin)}`}
                  >
                    {fmtKpi(kpis.gross_margin_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &gt; 65%
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Margen Neto</span>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.net_margin_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &gt; 15%
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">EBITDA</span>
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.ebitda_margin_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &gt; 20%
                  </p>
                </div>
              </div>
            </div>

            {/* Efficiency KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Eficiencia
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Prime Cost</span>
                    {getStatusIcon(kpis.status.prime_cost)}
                  </div>
                  <p
                    className={`text-3xl font-bold ${getStatusColor(kpis.status.prime_cost)}`}
                  >
                    {fmtKpi(kpis.prime_cost_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &lt; 60%
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Labor %</span>
                    {getStatusIcon(kpis.status.labor_percent)}
                  </div>
                  <p
                    className={`text-3xl font-bold ${getStatusColor(kpis.status.labor_percent)}`}
                  >
                    {fmtKpi(kpis.labor_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &lt; 25%
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">COGS %</span>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.cogs_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &lt; 30%
                  </p>
                </div>
              </div>
            </div>

            {/* Operations KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Operaciones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Ticket Promedio
                    </span>
                    <DollarSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    ${kpis.avg_order_value.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Por orden</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Órdenes/Día</span>
                    <ShoppingCart className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {kpis.orders_per_day.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Promedio diario</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Ventas/Hora</span>
                    <Clock className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    ${fmtKpi(kpis.revenue_per_hour, 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Por hora operativa
                  </p>
                </div>
              </div>
            </div>

            {/* Customer KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Clientes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Retención</span>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.customer_retention_rate, 0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &gt; 70%
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Visitas Promedio
                    </span>
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.avg_customer_visits)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Por cliente/mes</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">NPS Score</span>
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {kpis.nps_score ?? '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Net Promoter Score
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory KPIs */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Inventario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Rotación</span>
                    {getStatusIcon(kpis.status.inventory_turnover)}
                  </div>
                  <p
                    className={`text-3xl font-bold ${getStatusColor(kpis.status.inventory_turnover)}`}
                  >
                    {fmtKpi(kpis.inventory_turnover)}x
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &gt; 6x/año
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">
                      Días de Inventario
                    </span>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {fmtKpi(kpis.days_of_inventory, 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Días</p>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Desperdicio</span>
                    {getStatusIcon(kpis.status.waste)}
                  </div>
                  <p
                    className={`text-3xl font-bold ${getStatusColor(kpis.status.waste)}`}
                  >
                    {fmtKpi(kpis.waste_percent)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Objetivo: &lt; 3%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📊 <strong>Dashboard KPIs:</strong> Monitorea los indicadores clave
            de desempeño en tiempo real. Los colores indican el estado: verde
            (objetivo cumplido), amarillo (precaución), rojo (requiere
            atención).
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
