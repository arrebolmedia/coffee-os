/**
 * CoffeeOS - Purchase Orders Page
 * Gestión completa de órdenes de compra
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PurchaseOrderFormModal } from '@/components/purchase-orders/PurchaseOrderFormModal';
import {
  useFormatCurrency,
  usePurchaseOrders,
  usePurchaseOrderStats,
} from '@/hooks/use-purchase-orders';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  Send,
} from 'lucide-react';

const statusBadgeMap: Record<
  string,
  { color: string; bgColor: string; label: string }
> = {
  draft: { color: 'text-gray-800', bgColor: 'bg-gray-100', label: 'Borrador' },
  pending: {
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-100',
    label: 'Pendiente',
  },
  approved: {
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
    label: 'Aprobada',
  },
  ordered: {
    color: 'text-indigo-800',
    bgColor: 'bg-indigo-100',
    label: 'Ordenada',
  },
  partially_received: {
    color: 'text-orange-800',
    bgColor: 'bg-orange-100',
    label: 'Parcial',
  },
  received: {
    color: 'text-green-800',
    bgColor: 'bg-green-100',
    label: 'Recibida',
  },
  cancelled: {
    color: 'text-red-800',
    bgColor: 'bg-red-100',
    label: 'Cancelada',
  },
};
function getStatusBadge(status: string) {
  return (
    statusBadgeMap[status] || {
      color: 'text-gray-800',
      bgColor: 'bg-gray-100',
      label: status,
    }
  );
}

export default function PurchaseOrdersPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const formatCurrency = useFormatCurrency();

  const {
    data: orders,
    isLoading,
    error,
  } = usePurchaseOrders({
    status: filterStatus !== 'all' ? filterStatus : undefined,
    supplier_id: filterSupplier !== 'all' ? filterSupplier : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  });

  const { data: stats } = usePurchaseOrderStats();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen text-red-600">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p>Error al cargar órdenes de compra</p>
          <p className="text-sm text-red-400 mt-2">{String(error)}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Órdenes de Compra
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestión de órdenes de compra a proveedores
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Orden</span>
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
                  <p className="text-sm text-gray-500">Total Órdenes</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats?.total_orders ?? 0}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.by_status?.pending ?? 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Aprobadas</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats?.by_status?.approved ?? 0}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Recibidas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.by_status?.received ?? 0}
                  </p>
                </div>
                <Package className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Gastado</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {formatCurrency(stats?.total_amount ?? 0)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobada</option>
                  <option value="ordered">Ordenada</option>
                  <option value="partially_received">Parcial</option>
                  <option value="received">Recibida</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Fecha desde"
                />
              </div>

              <div>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Fecha hasta"
                />
              </div>

              <button
                onClick={() => {
                  setFilterStatus('all');
                  setFilterSupplier('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    # Orden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Orden
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Entrega Esperada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders?.map((order) => {
                  const statusBadge = getStatusBadge(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {order.order_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {order.supplier_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {new Date(order.order_date).toLocaleDateString(
                            'es-MX',
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {order.expected_delivery_date
                            ? new Date(
                                order.expected_delivery_date,
                              ).toLocaleDateString('es-MX')
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.bgColor} ${statusBadge.color}`}
                        >
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-green-600 hover:text-green-900"
                            title="Enviar al proveedor"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            className="text-purple-600 hover:text-purple-900"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {(!orders || orders.length === 0) && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron órdenes de compra</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <PurchaseOrderFormModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </MainLayout>
  );
}
