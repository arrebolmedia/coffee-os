/**
 * CoffeeOS - Attendance Module
 * Control de asistencia, check-in/out y reportes de puntualidad
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Coffee,
  Download,
  Filter,
  LogIn,
  LogOut,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  location: string;
  date: string;
  scheduledIn: string;
  checkIn: string | null;
  checkOut: string | null;
  scheduledOut: string;
  status: 'present' | 'late' | 'absent' | 'half-day' | 'early-leave';
  hoursWorked: number;
  breakTime: number;
  overtime: number;
  notes?: string;
}

export default function AttendancePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2025-10-24');

  // Mock data - conectará con API
  const attendanceRecords: AttendanceRecord[] = [
    {
      id: '1',
      employeeId: 'EMP-001',
      employeeName: 'Juan Pérez García',
      position: 'Barista Senior',
      location: 'Sucursal Centro',
      date: '2025-10-24',
      scheduledIn: '08:00',
      checkIn: '07:55',
      checkOut: '17:05',
      scheduledOut: '17:00',
      status: 'present',
      hoursWorked: 9.17,
      breakTime: 1,
      overtime: 0.08,
      notes: 'Entrada temprana',
    },
    {
      id: '2',
      employeeId: 'EMP-002',
      employeeName: 'María González López',
      position: 'Gerente de Tienda',
      location: 'Sucursal Polanco',
      date: '2025-10-24',
      scheduledIn: '09:00',
      checkIn: '09:15',
      checkOut: '18:00',
      scheduledOut: '18:00',
      status: 'late',
      hoursWorked: 8.75,
      breakTime: 1,
      overtime: 0,
      notes: 'Retardo de 15 minutos',
    },
    {
      id: '3',
      employeeId: 'EMP-003',
      employeeName: 'Carlos Ramírez Soto',
      position: 'Barista',
      location: 'Sucursal Santa Fe',
      date: '2025-10-24',
      scheduledIn: '10:00',
      checkIn: '10:00',
      checkOut: null,
      scheduledOut: '19:00',
      status: 'present',
      hoursWorked: 0,
      breakTime: 0,
      overtime: 0,
      notes: 'En turno actual',
    },
    {
      id: '4',
      employeeId: 'EMP-004',
      employeeName: 'Ana Martínez Ruiz',
      position: 'Cocinera',
      location: 'Sucursal Centro',
      date: '2025-10-24',
      scheduledIn: '07:00',
      checkIn: null,
      checkOut: null,
      scheduledOut: '16:00',
      status: 'absent',
      hoursWorked: 0,
      breakTime: 0,
      overtime: 0,
      notes: 'Sin registro de entrada',
    },
    {
      id: '5',
      employeeId: 'EMP-005',
      employeeName: 'Luis Hernández Cruz',
      position: 'Supervisor de Turno',
      location: 'Sucursal Roma',
      date: '2025-10-24',
      scheduledIn: '08:00',
      checkIn: '08:02',
      checkOut: '17:00',
      scheduledOut: '17:00',
      status: 'present',
      hoursWorked: 8.97,
      breakTime: 1,
      overtime: 0,
    },
    {
      id: '6',
      employeeId: 'EMP-006',
      employeeName: 'Patricia Flores Vega',
      position: 'Cajera',
      location: 'Kiosko WTC',
      date: '2025-10-24',
      scheduledIn: '11:00',
      checkIn: '11:00',
      checkOut: '15:30',
      scheduledOut: '19:00',
      status: 'early-leave',
      hoursWorked: 4.5,
      breakTime: 0,
      overtime: 0,
      notes: 'Salida temprana autorizada',
    },
    {
      id: '7',
      employeeId: 'EMP-007',
      employeeName: 'Roberto Sánchez Díaz',
      position: 'Barista',
      location: 'Sucursal Centro',
      date: '2025-10-24',
      scheduledIn: '13:00',
      checkIn: '13:25',
      checkOut: null,
      scheduledOut: '22:00',
      status: 'late',
      hoursWorked: 0,
      breakTime: 0,
      overtime: 0,
      notes: 'Retardo de 25 minutos',
    },
    {
      id: '8',
      employeeId: 'EMP-008',
      employeeName: 'Laura Jiménez Torres',
      position: 'Cajera',
      location: 'Sucursal Polanco',
      date: '2025-10-24',
      scheduledIn: '14:00',
      checkIn: '13:58',
      checkOut: '22:10',
      scheduledOut: '22:00',
      status: 'present',
      hoursWorked: 8.2,
      breakTime: 1,
      overtime: 0.17,
    },
  ];

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.position.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation =
      filterLocation === 'all' || record.location === filterLocation;
    const matchesStatus =
      filterStatus === 'all' || record.status === filterStatus;
    const matchesDate = record.date === selectedDate;
    return matchesSearch && matchesLocation && matchesStatus && matchesDate;
  });

  const stats = {
    totalEmployees: attendanceRecords.length,
    present: attendanceRecords.filter(
      (r) => r.status === 'present' || r.status === 'late',
    ).length,
    absent: attendanceRecords.filter((r) => r.status === 'absent').length,
    late: attendanceRecords.filter((r) => r.status === 'late').length,
    avgAttendance: (
      (attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'late',
      ).length /
        attendanceRecords.length) *
      100
    ).toFixed(1),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'absent':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'half-day':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'early-leave':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4" />;
      case 'late':
        return <AlertTriangle className="w-4 h-4" />;
      case 'absent':
        return <XCircle className="w-4 h-4" />;
      case 'half-day':
        return <Clock className="w-4 h-4" />;
      case 'early-leave':
        return <LogOut className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Presente';
      case 'late':
        return 'Retardo';
      case 'absent':
        return 'Ausente';
      case 'half-day':
        return 'Medio Día';
      case 'early-leave':
        return 'Salida Temprana';
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
                <Clock className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Asistencia
                  </h1>
                  <p className="text-sm text-gray-500">
                    Control de entrada, salida y puntualidad
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  Exportar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <RefreshCw className="w-4 h-4" />
                  Actualizar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Demo Data Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm font-medium text-yellow-800">
              Datos de demostración — esta vista aún no está conectada a datos
              reales.
            </p>
          </div>

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
                  <p className="text-sm text-gray-500">Presentes</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.present}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ausentes</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.absent}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Retardos</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.late}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">% Asistencia</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.avgAttendance}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Selector */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar empleado..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Location Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los Estados</option>
                  <option value="present">Presente</option>
                  <option value="late">Retardo</option>
                  <option value="absent">Ausente</option>
                  <option value="half-day">Medio Día</option>
                  <option value="early-leave">Salida Temprana</option>
                </select>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrada Programada
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-In
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check-Out
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horas Trabajadas
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {record.employeeName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {record.employeeId} • {record.position}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">
                          {record.location}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600">
                          {record.scheduledIn}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record.checkIn ? (
                          <div className="flex items-center justify-center gap-1">
                            <LogIn className="w-4 h-4 text-green-600" />
                            <span
                              className={`text-sm font-medium ${
                                record.status === 'late'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {record.checkIn}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record.checkOut ? (
                          <div className="flex items-center justify-center gap-1">
                            <LogOut className="w-4 h-4 text-red-600" />
                            <span className="text-sm font-medium text-red-600">
                              {record.checkOut}
                            </span>
                          </div>
                        ) : record.checkIn ? (
                          <div className="flex items-center justify-center gap-1">
                            <Coffee className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-blue-600">
                              En turno
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">--:--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {record.hoursWorked > 0 ? (
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {record.hoursWorked.toFixed(2)}h
                            </span>
                            {record.overtime > 0 && (
                              <div className="text-xs text-green-600">
                                +{record.overtime.toFixed(2)}h extra
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(
                              record.status,
                            )}`}
                          >
                            {getStatusIcon(record.status)}
                            {getStatusText(record.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {record.notes ? (
                          <span className="text-sm text-gray-600">
                            {record.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredRecords.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
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
              <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">
                  Control de Asistencia
                </h4>
                <p className="text-sm text-blue-700">
                  Los registros de check-in/out se actualizan en tiempo real.
                  Los retardos se marcan automáticamente después de 15 minutos
                  de tolerancia. Las horas extras se calculan automáticamente y
                  se integran con el módulo de nómina.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
