'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { OrderSummary, OrderStatus } from '@/types';

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; icon: any }
> = {
  DRAFT: { label: 'Borrador', color: 'gray', icon: Clock },
  PENDING: { label: 'Pendiente', color: 'yellow', icon: Clock },
  CONFIRMED: { label: 'Confirmada', color: 'blue', icon: Clock },
  IN_PROGRESS: { label: 'En Progreso', color: 'purple', icon: Clock },
  COMPLETED: { label: 'Completada', color: 'green', icon: CheckCircle },
  CANCELLED: { label: 'Cancelada', color: 'red', icon: XCircle },
};

export function RecentOrders() {
  const { data: orders, isLoading } = useQuery<OrderSummary[]>({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => apiClient.get('/dashboard/recent-orders?limit=10'),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse" />
        </div>
        <div className="divide-y divide-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Órdenes Recientes
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orden
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Método Pago
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders?.map((order) => {
              const status = statusConfig[order.status];
              const StatusIcon = status.icon;

              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {order.order_number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {order.customer_name || 'Cliente General'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {format(new Date(order.created_at), 'PPp', { locale: es })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {order.payment_method.toLowerCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-gray-900">
                      ${order.total.toLocaleString('es-MX')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${status.color}-100 text-${status.color}-800`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {orders && orders.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-gray-500">No hay órdenes recientes</p>
        </div>
      )}
    </div>
  );
}
