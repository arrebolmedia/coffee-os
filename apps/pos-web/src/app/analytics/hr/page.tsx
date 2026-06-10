'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Clock,
  DollarSign,
  Download,
  Filter,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';

// Interfaces
interface EmployeeMetrics {
  id: string;
  name: string;
  position: string;
  location: string;
  productivity: number;
  attendance: number;
  performance: number;
  hoursWorked: number;
  salesGenerated: number;
  costPerHour: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
}

interface AttendanceData {
  month: string;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}

interface TurnoverData {
  department: string;
  employees: number;
  hires: number;
  terminations: number;
  turnoverRate: number;
  avgTenure: number;
}

interface ProductivityTrend {
  week: string;
  avgProductivity: number;
  totalSales: number;
  hoursWorked: number;
}

interface CostAnalysis {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

const AnalyticsHRPage = () => {
  // Filters
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Mock Data
  const mockEmployeeMetrics: EmployeeMetrics[] = [
    {
      id: '1',
      name: 'Ana García',
      position: 'Barista Senior',
      location: 'Centro',
      productivity: 95,
      attendance: 98,
      performance: 4.8,
      hoursWorked: 176,
      salesGenerated: 45600,
      costPerHour: 85,
      status: 'excellent',
    },
    {
      id: '2',
      name: 'Carlos Ruiz',
      position: 'Barista',
      location: 'Polanco',
      productivity: 88,
      attendance: 95,
      performance: 4.5,
      hoursWorked: 168,
      salesGenerated: 38900,
      costPerHour: 75,
      status: 'good',
    },
    {
      id: '3',
      name: 'María López',
      position: 'Cajera',
      location: 'Santa Fe',
      productivity: 92,
      attendance: 100,
      performance: 4.7,
      hoursWorked: 180,
      salesGenerated: 52100,
      costPerHour: 70,
      status: 'excellent',
    },
    {
      id: '4',
      name: 'José Hernández',
      position: 'Barista',
      location: 'Roma',
      productivity: 75,
      attendance: 88,
      performance: 3.8,
      hoursWorked: 152,
      salesGenerated: 28400,
      costPerHour: 75,
      status: 'needs-improvement',
    },
    {
      id: '5',
      name: 'Laura Martínez',
      position: 'Encargada',
      location: 'Centro',
      productivity: 90,
      attendance: 96,
      performance: 4.6,
      hoursWorked: 184,
      salesGenerated: 41200,
      costPerHour: 95,
      status: 'good',
    },
    {
      id: '6',
      name: 'Roberto Sánchez',
      position: 'Barista',
      location: 'Polanco',
      productivity: 85,
      attendance: 92,
      performance: 4.3,
      hoursWorked: 172,
      salesGenerated: 35700,
      costPerHour: 75,
      status: 'good',
    },
    {
      id: '7',
      name: 'Diana Torres',
      position: 'Barista Senior',
      location: 'Santa Fe',
      productivity: 93,
      attendance: 97,
      performance: 4.7,
      hoursWorked: 178,
      salesGenerated: 43800,
      costPerHour: 85,
      status: 'excellent',
    },
    {
      id: '8',
      name: 'Pedro Ramírez',
      position: 'Cajero',
      location: 'Roma',
      productivity: 68,
      attendance: 82,
      performance: 3.5,
      hoursWorked: 148,
      salesGenerated: 24200,
      costPerHour: 70,
      status: 'critical',
    },
  ];

  // TODO: Fetch real attendance and turnover data from API
  const mockAttendanceData: AttendanceData[] = [];

  const mockTurnoverData: TurnoverData[] = [];

  const mockProductivityTrends: ProductivityTrend[] = [
    {
      week: 'Sem 1',
      avgProductivity: 84,
      totalSales: 156400,
      hoursWorked: 1344,
    },
    {
      week: 'Sem 2',
      avgProductivity: 86,
      totalSales: 162800,
      hoursWorked: 1368,
    },
    {
      week: 'Sem 3',
      avgProductivity: 88,
      totalSales: 168900,
      hoursWorked: 1352,
    },
    {
      week: 'Sem 4',
      avgProductivity: 87,
      totalSales: 165200,
      hoursWorked: 1376,
    },
  ];

  const mockCostAnalysis: CostAnalysis[] = [
    {
      category: 'Salarios Base',
      amount: 234500,
      percentage: 58.2,
      color: 'bg-blue-500',
    },
    {
      category: 'Prestaciones',
      amount: 82075,
      percentage: 20.4,
      color: 'bg-green-500',
    },
    {
      category: 'Bonos',
      amount: 35400,
      percentage: 8.8,
      color: 'bg-purple-500',
    },
    {
      category: 'Horas Extra',
      amount: 28320,
      percentage: 7.0,
      color: 'bg-orange-500',
    },
    {
      category: 'Capacitación',
      amount: 22655,
      percentage: 5.6,
      color: 'bg-pink-500',
    },
  ];

  // Calculations
  const avgProductivity =
    mockEmployeeMetrics.reduce((sum, emp) => sum + emp.productivity, 0) /
    mockEmployeeMetrics.length;
  const avgAttendance =
    mockEmployeeMetrics.reduce((sum, emp) => sum + emp.attendance, 0) /
    mockEmployeeMetrics.length;
  const avgPerformance =
    mockEmployeeMetrics.reduce((sum, emp) => sum + emp.performance, 0) /
    mockEmployeeMetrics.length;
  const totalLaborCost = mockCostAnalysis.reduce(
    (sum, cat) => sum + cat.amount,
    0,
  );

  const excellentEmployees = mockEmployeeMetrics.filter(
    (emp) => emp.status === 'excellent',
  ).length;
  const maxProductivity = Math.max(
    ...mockProductivityTrends.map((t) => t.avgProductivity),
  );

  const getStatusBadge = (status: EmployeeMetrics['status']) => {
    const styles = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      'needs-improvement': 'bg-yellow-100 text-yellow-800',
      critical: 'bg-red-100 text-red-800',
    };
    const labels = {
      excellent: 'Excelente',
      good: 'Bueno',
      'needs-improvement': 'Mejorar',
      critical: 'Crítico',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status]}
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
              <Users className="w-8 h-8 text-indigo-600" />
              Analytics de Recursos Humanos
            </h1>
            <p className="text-gray-600 mt-1">
              Métricas de productividad, asistencia y costos laborales
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="month">Este Mes</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Año</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todas las Ubicaciones</option>
              <option value="centro">Centro</option>
              <option value="polanco">Polanco</option>
              <option value="santa-fe">Santa Fe</option>
              <option value="roma">Roma</option>
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Todos los Departamentos</option>
              <option value="baristas">Baristas</option>
              <option value="cajeros">Cajeros</option>
              <option value="encargados">Encargados</option>
              <option value="cocina">Cocina</option>
            </select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  Productividad Promedio
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgProductivity.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    +4.2% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Asistencia</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgAttendance.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    +1.8% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Desempeño Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {avgPerformance.toFixed(1)}/5.0
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600 font-medium">
                    {excellentEmployees} empleados excelentes
                  </span>
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Costos Laborales</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(totalLaborCost / 1000).toFixed(0)}k
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowDownRight className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">
                    -2.3% vs presupuesto
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Employee Metrics Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Métricas por Empleado
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Ubicación
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Productividad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Asistencia
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Desempeño
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ventas Generadas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {mockEmployeeMetrics.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {emp.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {emp.position}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {emp.location}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span
                        className={
                          emp.productivity >= 90
                            ? 'text-green-600 font-medium'
                            : emp.productivity >= 80
                              ? 'text-blue-600'
                              : 'text-red-600'
                        }
                      >
                        {emp.productivity}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span
                        className={
                          emp.attendance >= 95
                            ? 'text-green-600 font-medium'
                            : emp.attendance >= 90
                              ? 'text-blue-600'
                              : 'text-red-600'
                        }
                      >
                        {emp.attendance}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">
                          {emp.performance.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                      {emp.hoursWorked}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">
                      ${emp.salesGenerated.toLocaleString('es-MX')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {getStatusBadge(emp.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Attendance Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                Tendencia de Asistencia
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockAttendanceData.map((data) => (
                  <div key={data.month}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {data.month}
                      </span>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-green-600" />
                          {data.present}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserX className="w-3 h-3 text-red-600" />
                          {data.absent}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-yellow-600" />
                          {data.late}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-6">
                      <div
                        className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
                        style={{ width: `${data.attendanceRate}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          {data.attendanceRate}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Productivity Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                Tendencia de Productividad
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockProductivityTrends.map((trend) => {
                  const barWidth =
                    (trend.avgProductivity / maxProductivity) * 100;
                  return (
                    <div key={trend.week}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {trend.week}
                        </span>
                        <div className="text-xs text-gray-600">
                          ${(trend.totalSales / 1000).toFixed(0)}k ventas •{' '}
                          {trend.hoursWorked}h
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
                          style={{ width: `${barWidth}%` }}
                        >
                          <span className="text-xs font-bold text-white">
                            {trend.avgProductivity}%
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Turnover Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Rotación de Personal
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Departamento
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Empleados
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Rotación
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Antigüedad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockTurnoverData.map((dept) => (
                    <tr key={dept.department} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {dept.department}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {dept.employees}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span
                          className={
                            dept.turnoverRate === 0
                              ? 'text-green-600 font-medium'
                              : dept.turnoverRate < 10
                                ? 'text-blue-600'
                                : 'text-red-600'
                          }
                        >
                          {dept.turnoverRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {dept.avgTenure.toFixed(1)} meses
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                Análisis de Costos Laborales
              </h2>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold text-gray-900">
                    ${(totalLaborCost / 1000).toFixed(1)}k
                  </p>
                  <p className="text-sm text-gray-600">Total mensual</p>
                </div>
                <div className="space-y-3">
                  {mockCostAnalysis.map((cost) => (
                    <div key={cost.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${cost.color}`}
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {cost.category}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">
                            ${(cost.amount / 1000).toFixed(1)}k
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {cost.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${cost.color} h-2 rounded-full transition-all duration-500`}
                          style={{ width: `${cost.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AnalyticsHRPage;
