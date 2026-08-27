'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  AlertTriangle,
  ArrowUpCircle,
  BarChart3,
  Building,
  Calendar,
  DollarSign,
  Download,
  Filter,
  Loader2,
  Minus,
  PieChart,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useMonthlyPnL } from '@/hooks/use-pnl';

export default function PnLPage() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  // Fetch P&L data
  const {
    data: pnlData,
    isLoading,
    error,
  } = useMonthlyPnL(
    selectedYear,
    selectedMonth,
    selectedLocation === 'all' ? undefined : selectedLocation,
  );

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  /**
   * La tasa de ISR viene como fracción (0.30). Se enseña sin decimales cuando
   * es redonda —«30%», no «30.0%»— porque así es como se habla de ella.
   */
  const formatIsrRate = (rate: number | undefined) => {
    const porcentaje = (rate ?? 0.3) * 100;
    return Number.isInteger(porcentaje)
      ? `${porcentaje}%`
      : `${porcentaje.toFixed(2).replace(/0$/, '')}%`;
  };

  /**
   * Cómo se llama el régimen y sobre qué grava.
   *
   * La base importa tanto como la tasa: un 2 % sobre ingresos y un 30 % sobre
   * utilidad no se comparan, y el renglón tiene que dejarlo claro para que
   * nadie lea «2%» y piense que paga poquísimo sin saber sobre qué.
   */
  const REGIMENES: Record<string, { nombre: string; sobre: string }> = {
    resico_pf: { nombre: 'RESICO', sobre: 'sobre ingresos' },
    persona_moral: { nombre: 'ISR', sobre: 'sobre utilidad' },
    tasa_fija: { nombre: 'ISR', sobre: 'sobre utilidad' },
  };

  // Calculate expense breakdown
  const expenseBreakdown = useMemo(() => {
    if (!pnlData) return [];

    return [
      { name: 'Nómina', value: pnlData.labor_cost, color: 'bg-blue-500' },
      { name: 'Renta', value: pnlData.rent, color: 'bg-purple-500' },
      { name: 'Servicios', value: pnlData.utilities, color: 'bg-yellow-500' },
      { name: 'Marketing', value: pnlData.marketing, color: 'bg-pink-500' },
      { name: 'Insumos', value: pnlData.supplies, color: 'bg-green-500' },
      {
        name: 'Mantenimiento',
        value: pnlData.equipment_maintenance,
        color: 'bg-orange-500',
      },
      { name: 'Seguros', value: pnlData.insurance, color: 'bg-indigo-500' },
      {
        name: 'Permisos',
        value: pnlData.permits_licenses,
        color: 'bg-red-500',
      },
      {
        name: 'Servicios Prof.',
        value: pnlData.professional_services,
        color: 'bg-teal-500',
      },
      {
        name: 'Residuos',
        value: pnlData.waste_management,
        color: 'bg-cyan-500',
      },
      { name: 'Seguridad', value: pnlData.security, color: 'bg-gray-500' },
      { name: 'Otros', value: pnlData.other_expenses, color: 'bg-gray-400' },
    ]
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [pnlData]);

  // Generate years for selector (last 3 years + current + next)
  const years = Array.from(
    { length: 5 },
    (_, i) => currentDate.getFullYear() - 2 + i,
  );

  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <MainLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Estado de Resultados (P&L)
                </h1>
                <p className="text-sm text-gray-500">
                  Reporte de Ganancias y Pérdidas
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4" />
                Exportar PDF
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="font-semibold text-gray-800">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Year Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              >
                {months.map((month, index) => (
                  <option key={index + 1} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Filter */}
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              >
                <option value="all">Todas las Ubicaciones</option>
                <option value="loc1">Sucursal Centro</option>
                <option value="loc2">Sucursal Polanco</option>
                <option value="loc3">Sucursal Santa Fe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando estado de resultados...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">
                  Error al cargar datos
                </h3>
                <p className="text-sm text-red-700">
                  No se pudo cargar el estado de resultados. Por favor intenta
                  nuevamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* P&L Report */}
        {!isLoading && !error && pnlData && (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Net Revenue */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <ArrowUpCircle className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(pnlData.net_revenue)}
                </div>
                <div className="text-sm opacity-90">Ingresos Netos</div>
              </div>

              {/* Gross Profit */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-90">
                    {formatPercent(pnlData.gross_margin_percent)}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(pnlData.gross_profit)}
                </div>
                <div className="text-sm opacity-90">Utilidad Bruta</div>
              </div>

              {/* Net Profit */}
              <div
                className={`rounded-lg shadow p-6 text-white ${
                  pnlData.net_profit >= 0
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-red-500 to-red-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-90">
                    {formatPercent(pnlData.net_margin_percent)}
                  </span>
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(pnlData.net_profit)}
                </div>
                <div className="text-sm opacity-90">Utilidad Neta</div>
              </div>

              {/* EBITDA */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 opacity-80" />
                  <TrendingUp className="w-5 h-5 opacity-80" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {formatCurrency(pnlData.ebitda)}
                </div>
                <div className="text-sm opacity-90">EBITDA</div>
              </div>
            </div>

            {/* Detailed P&L Statement */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  Estado de Resultados Detallado
                </h2>
                <p className="text-sm text-gray-500">
                  {months[selectedMonth - 1]} {selectedYear}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Revenue Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Ingresos
                  </h3>
                  <div className="space-y-2 pl-8">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Ingresos Brutos</span>
                      <span className="font-medium">
                        {formatCurrency(pnlData.gross_revenue)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        Descuentos
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.discounts)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        Devoluciones
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.returns)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                      <span className="text-gray-900">Ingresos Netos</span>
                      <span className="text-blue-600">
                        {formatCurrency(pnlData.net_revenue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* COGS Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                    Costo de Ventas
                  </h3>
                  <div className="space-y-2 pl-8">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Costo de Mercancía Vendida
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.cogs)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t-2 border-gray-300 font-semibold">
                      <span className="text-gray-900">
                        Utilidad Bruta
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({formatPercent(pnlData.gross_margin_percent)})
                        </span>
                      </span>
                      <span className="text-green-600">
                        {formatCurrency(pnlData.gross_profit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Operating Expenses Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-600" />
                    Gastos Operativos
                  </h3>
                  <div className="space-y-2 pl-8">
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Nómina
                        <span className="text-sm text-gray-500 ml-2">
                          ({formatPercent(pnlData.labor_percent)})
                        </span>
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.labor_cost)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Renta</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.rent)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Servicios (Luz, Agua, Gas)
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.utilities)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Marketing</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.marketing)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Insumos</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.supplies)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Mantenimiento de Equipo
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.equipment_maintenance)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Seguros</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.insurance)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Permisos y Licencias
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.permits_licenses)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        Servicios Profesionales
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.professional_services)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Gestión de Residuos</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.waste_management)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Seguridad</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.security)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">Otros Gastos</span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.other_expenses)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-gray-200">
                      <span className="text-gray-800 font-medium">
                        Total Gastos Operativos
                      </span>
                      <span className="text-red-600 font-medium">
                        ({formatCurrency(pnlData.total_operating_expenses)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profitability Section */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Rentabilidad
                  </h3>
                  <div className="space-y-2 pl-8">
                    <div className="flex justify-between py-2 bg-purple-50 px-3 rounded">
                      <span className="text-gray-800 font-medium">EBITDA</span>
                      <span
                        className={`font-semibold ${
                          pnlData.ebitda >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(pnlData.ebitda)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        Depreciación
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.depreciation)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        Amortización
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.amortization)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-blue-50 px-3 rounded">
                      <span className="text-gray-800 font-medium">EBIT</span>
                      <span
                        className={`font-semibold ${
                          pnlData.ebit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(pnlData.ebit)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        Intereses
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.interest_expense)})
                      </span>
                    </div>
                    <div className="flex justify-between py-2 bg-yellow-50 px-3 rounded">
                      <span className="text-gray-800 font-medium">
                        EBT (Antes de Impuestos)
                      </span>
                      <span
                        className={`font-semibold ${
                          pnlData.ebt >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(pnlData.ebt)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-700">
                        <Minus className="w-4 h-4 inline mr-1" />
                        {/* La tasa venía escrita a mano como «30% ISR». Ahora
                            la dicen el informe y su régimen: el 30 % sobre
                            utilidad es de persona moral, y en RESICO el
                            impuesto sale de los ingresos con otra tabla. */}
                        Impuestos (
                        {
                          (
                            REGIMENES[pnlData.tax_regime ?? 'persona_moral'] ??
                            REGIMENES.persona_moral
                          ).nombre
                        }{' '}
                        {formatIsrRate(pnlData.tax_rate)}{' '}
                        {
                          (
                            REGIMENES[pnlData.tax_regime ?? 'persona_moral'] ??
                            REGIMENES.persona_moral
                          ).sobre
                        }
                        )
                        {pnlData.tax_rate_default_used && (
                          <span
                            className="ml-2 text-xs text-amber-700"
                            title="No hay régimen fiscal configurado para esta organización. Se está suponiendo persona moral (30 % sobre la utilidad); si tributas en RESICO, el impuesto se calcula sobre los ingresos cobrados y la utilidad neta de abajo no es la tuya."
                          >
                            supuesto
                          </span>
                        )}
                      </span>
                      <span className="text-red-600">
                        ({formatCurrency(pnlData.taxes)})
                      </span>
                    </div>
                    <div className="flex justify-between py-3 border-t-4 border-gray-800 bg-gray-50 px-3 rounded">
                      <span className="text-gray-900 font-bold text-lg">
                        Utilidad Neta
                        <span className="text-sm font-normal text-gray-600 ml-2">
                          ({formatPercent(pnlData.net_margin_percent)})
                        </span>
                      </span>
                      <span
                        className={`font-bold text-lg ${
                          pnlData.net_profit >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(pnlData.net_profit)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Section */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Métricas Clave del Restaurante
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Prime Cost
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(pnlData.prime_cost)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatPercent(pnlData.prime_cost_percent)} de ingresos
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        COGS + Nómina
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Costo de Nómina
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPercent(pnlData.labor_percent)}
                      </div>
                      <div className="text-sm text-gray-500">
                        de ingresos netos
                      </div>
                      <div
                        className={`text-xs mt-2 ${
                          pnlData.labor_percent <= 30
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {pnlData.labor_percent <= 30
                          ? '✓ Dentro del objetivo (≤30%)'
                          : '⚠ Por encima del objetivo'}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">
                        Punto de Equilibrio
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(pnlData.break_even_point)}
                      </div>
                      <div className="text-sm text-gray-500">
                        ingresos necesarios
                      </div>
                      <div
                        className={`text-xs mt-2 ${
                          pnlData.net_revenue >= pnlData.break_even_point
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {pnlData.net_revenue >= pnlData.break_even_point
                          ? '✓ Por encima del punto de equilibrio'
                          : '⚠ Por debajo del punto de equilibrio'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Breakdown Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Desglose de Gastos Operativos
              </h3>
              <div className="space-y-3">
                {expenseBreakdown.map((item, index) => {
                  const percentage =
                    (item.value / pnlData.total_operating_expenses) * 100;
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(item.value)} ({percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${item.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Footer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">
                    Sobre el Estado de Resultados
                  </h4>
                  <p className="text-sm text-blue-700">
                    El Estado de Resultados (P&L) muestra la rentabilidad de tu
                    negocio durante un período específico. Para cafeterías, se
                    recomienda mantener el Prime Cost (COGS + Nómina) por debajo
                    del 60% de los ingresos. El margen neto ideal para el sector
                    es entre 10-15%.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
