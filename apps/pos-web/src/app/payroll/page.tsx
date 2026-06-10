/**
 * CoffeeOS - Payroll Module
 * Gestión de nómina con cálculos de IMSS, ISR y deducciones
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  AlertCircle,
  Banknote,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Eye,
  Filter,
  Plus,
  Search,
  Send,
  TrendingUp,
  Users,
} from 'lucide-react';

interface PayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  location: string;
  baseSalary: number;
  bonuses: number;
  overtime: number;
  deductions: {
    imss: number;
    isr: number;
    other: number;
  };
  netPay: number;
  period: string;
  status: 'pending' | 'approved' | 'paid' | 'review';
  paymentDate: string;
  daysWorked: number;
}

export default function PayrollPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2025-10');

  // Mock data - conectará con API
  const payrollEntries: PayrollEntry[] = [
    {
      id: '1',
      employeeId: 'EMP-001',
      employeeName: 'Juan Pérez García',
      position: 'Barista Senior',
      location: 'Sucursal Centro',
      baseSalary: 12000,
      bonuses: 1500,
      overtime: 800,
      deductions: {
        imss: 1200,
        isr: 2100,
        other: 200,
      },
      netPay: 10800,
      period: '2025-10',
      status: 'approved',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
    {
      id: '2',
      employeeId: 'EMP-002',
      employeeName: 'María González López',
      position: 'Gerente de Tienda',
      location: 'Sucursal Polanco',
      baseSalary: 18000,
      bonuses: 3000,
      overtime: 0,
      deductions: {
        imss: 1800,
        isr: 3800,
        other: 300,
      },
      netPay: 15100,
      period: '2025-10',
      status: 'paid',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
    {
      id: '3',
      employeeId: 'EMP-003',
      employeeName: 'Carlos Ramírez Soto',
      position: 'Barista',
      location: 'Sucursal Santa Fe',
      baseSalary: 9500,
      bonuses: 800,
      overtime: 450,
      deductions: {
        imss: 950,
        isr: 1400,
        other: 150,
      },
      netPay: 8250,
      period: '2025-10',
      status: 'pending',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
    {
      id: '4',
      employeeId: 'EMP-004',
      employeeName: 'Ana Martínez Ruiz',
      position: 'Cocinera',
      location: 'Sucursal Centro',
      baseSalary: 11000,
      bonuses: 1200,
      overtime: 600,
      deductions: {
        imss: 1100,
        isr: 1900,
        other: 180,
      },
      netPay: 9620,
      period: '2025-10',
      status: 'approved',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
    {
      id: '5',
      employeeId: 'EMP-005',
      employeeName: 'Luis Hernández Cruz',
      position: 'Supervisor de Turno',
      location: 'Sucursal Roma',
      baseSalary: 14500,
      bonuses: 2000,
      overtime: 900,
      deductions: {
        imss: 1450,
        isr: 2700,
        other: 250,
      },
      netPay: 13000,
      period: '2025-10',
      status: 'paid',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
    {
      id: '6',
      employeeId: 'EMP-006',
      employeeName: 'Patricia Flores Vega',
      position: 'Cajera',
      location: 'Kiosko WTC',
      baseSalary: 8500,
      bonuses: 500,
      overtime: 300,
      deductions: {
        imss: 850,
        isr: 1100,
        other: 100,
      },
      netPay: 7250,
      period: '2025-10',
      status: 'pending',
      paymentDate: '2025-10-31',
      daysWorked: 26,
    },
  ];

  const filteredEntries = payrollEntries.filter((entry) => {
    const matchesSearch =
      entry.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      filterLocation === 'all' || entry.location === filterLocation;
    const matchesStatus =
      filterStatus === 'all' || entry.status === filterStatus;
    const matchesPeriod = entry.period === selectedPeriod;
    return matchesSearch && matchesLocation && matchesStatus && matchesPeriod;
  });

  const stats = {
    totalEmployees: payrollEntries.length,
    totalPayroll: payrollEntries.reduce((sum, entry) => sum + entry.netPay, 0),
    pending: payrollEntries.filter((e) => e.status === 'pending').length,
    paid: payrollEntries.filter((e) => e.status === 'paid').length,
    avgSalary:
      payrollEntries.reduce((sum, entry) => sum + entry.netPay, 0) /
      payrollEntries.length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'review':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'review':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'approved':
        return 'Aprobado';
      case 'pending':
        return 'Pendiente';
      case 'review':
        return 'Revisar';
      default:
        return status;
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Banknote className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Nómina</h1>
                  <p className="text-sm text-gray-500">
                    Gestión de pagos y cálculos de nómina
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  <Plus className="w-5 h-5" />
                  Procesar Nómina
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Empleados</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalEmployees}
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Nómina Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats.totalPayroll.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pagados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.paid}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Salario Promedio</p>
                  <p className="text-2xl font-bold text-gray-800">
                    $
                    {stats.avgSalary.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Period Selector */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="2025-10">Octubre 2025</option>
                  <option value="2025-09">Septiembre 2025</option>
                  <option value="2025-08">Agosto 2025</option>
                  <option value="2025-07">Julio 2025</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar empleado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              {/* Location Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todas las Ubicaciones</option>
                  <option value="Sucursal Centro">Sucursal Centro</option>
                  <option value="Sucursal Polanco">Sucursal Polanco</option>
                  <option value="Sucursal Santa Fe">Sucursal Santa Fe</option>
                  <option value="Sucursal Roma">Sucursal Roma</option>
                  <option value="Kiosko WTC">Kiosko WTC</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="paid">Pagado</option>
                  <option value="approved">Aprobado</option>
                  <option value="pending">Pendiente</option>
                  <option value="review">Revisar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payroll Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empleado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salario Base
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bonos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deducciones
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Neto a Pagar
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
                  {filteredEntries.map((entry) => {
                    const totalDeductions =
                      entry.deductions.imss +
                      entry.deductions.isr +
                      entry.deductions.other;

                    return (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {entry.employeeName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {entry.employeeId} • {entry.position}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">
                            {entry.location}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-gray-900">
                            ${entry.baseSalary.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-green-600">
                            +$
                            {(entry.bonuses + entry.overtime).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm text-red-600">
                            -${totalDeductions.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-medium text-gray-900">
                            ${entry.netPay.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                                entry.status,
                              )}`}
                            >
                              {getStatusIcon(entry.status)}
                              {getStatusText(entry.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <Banknote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron registros
                  </h3>
                  <p className="text-gray-600">
                    Intenta ajustar los filtros de búsqueda
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Footer */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <Banknote className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">
                  Información de Nómina
                </h4>
                <p className="text-sm text-blue-700">
                  Las deducciones incluyen IMSS, ISR y otros conceptos según la
                  legislación mexicana vigente. Los cálculos son automáticos
                  basados en las tablas fiscales actuales. Verifica siempre los
                  montos antes de procesar los pagos.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
