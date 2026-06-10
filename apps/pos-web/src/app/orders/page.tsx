/**
 * CoffeeOS - Orders Module
 * Historial y seguimiento de órdenes
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrders } from '@/hooks/use-orders';
import { OrderFilters } from '@/types';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  Filter,
  Loader2,
  MapPin,
  Search,
  User,
  XCircle,
} from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
        label: 'Completada',
      };
    case 'PENDING':
    case 'IN_PROGRESS':
    case 'CONFIRMED':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: AlertCircle,
        label: 'Pendiente',
      };
    case 'CANCELLED':
      return {
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle,
        label: 'Cancelada',
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        icon: ClipboardList,
        label: status,
      };
  }
}

function getDateRange(filterDate: string): {
  start_date?: string;
  end_date?: string;
} {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (filterDate === 'today') return { start_date: today, end_date: today };
  if (filterDate === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = y.toISOString().split('T')[0];
    return { start_date: d, end_date: d };
  }
  if (filterDate === 'week') {
    const w = new Date(now);
    w.setDate(w.getDate() - 7);
    return { start_date: w.toISOString().split('T')[0], end_date: today };
  }
  if (filterDate === 'month') {
    const m = new Date(now);
    m.setDate(1);
    return { start_date: m.toISOString().split('T')[0], end_date: today };
  }
  return {};
}

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('today');

  const filters: OrderFilters = {
    ...(filterStatus !== 'all' && { status: filterStatus as any }),
    ...(searchQuery && { search: searchQuery }),
    ...getDateRange(filterDate),
  };

  const { data: ordersResponse, isLoading, error } = useOrders(filters);
  const orders = ordersResponse?.data ?? [];

  const stats = {
    totalOrders: orders.length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    pending: orders.filter((o) =>
      ['PENDING', 'IN_PROGRESS', 'CONFIRMED'].includes(o.status),
    ).length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    totalRevenue: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.total, 0),
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ClipboardList className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Órdenes</h1>
                  <p className="text-sm text-gray-500">
                    Historial y seguimiento de ventas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalOrders}
                  </p>
                </div>
                <ClipboardList className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
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
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Canceladas</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.cancelled}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ingresos</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${stats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por número de orden o cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="COMPLETED">Completadas</option>
                  <option value="PENDING">Pendientes</option>
                  <option value="CANCELLED">Canceladas</option>
                </select>
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                >
                  <option value="today">Hoy</option>
                  <option value="yesterday">Ayer</option>
                  <option value="week">Esta semana</option>
                  <option value="month">Este mes</option>
                  <option value="all">Todo el tiempo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">
                <AlertCircle className="mx-auto h-12 w-12 mb-2" />
                <p>Error al cargar órdenes</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No hay órdenes
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Las órdenes completadas aparecerán aquí
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Orden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    const StatusIcon = statusInfo.icon;
                    const createdAt = new Date(order.createdAt);

                    return (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.order_number}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {order.location_id}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {createdAt.toLocaleDateString('es-MX')}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {createdAt.toLocaleTimeString('es-MX', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-sm">
                            <User className="w-4 h-4 text-gray-400" />
                            {order.customer ? (
                              [
                                order.customer.firstName,
                                order.customer.lastName,
                              ]
                                .filter(Boolean)
                                .join(' ') ||
                              order.customer.phone ||
                              'Cliente'
                            ) : (
                              <span className="text-gray-400 italic">
                                Cliente público
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {order.items.length}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-green-600">
                            ${order.total.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900">
                            {order.payment_method || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-purple-600 hover:text-purple-900 text-sm font-medium">
                            Ver Detalles
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
