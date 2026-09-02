/**
 * CoffeeOS - Orders Module
 * Historial y seguimiento de órdenes
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrders, useUpdateOrderStatus } from '@/hooks/use-orders';
import { OrderFilters, OrderStatus } from '@/types';
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

/**
 * Siguiente estado de cada uno, y como se llama la accion para el barista.
 *
 * Es un espejo de ORDER_TRANSITIONS en orders.service.ts del API, que es la
 * fuente de verdad: alli el backend RECHAZA con 400 cualquier salto que no
 * este permitido. Aqui solo se decide que boton ensenar; si los dos se
 * desalinearan, manda el backend y el usuario ve el error.
 *
 * COMPLETED y CANCELLED son terminales y no ofrecen accion.
 */
const SIGUIENTE_ESTADO: Partial<
  Record<OrderStatus, { estado: OrderStatus; etiqueta: string }>
> = {
  [OrderStatus.PENDING]: {
    estado: OrderStatus.IN_PROGRESS,
    etiqueta: 'Preparar',
  },
  [OrderStatus.IN_PROGRESS]: { estado: OrderStatus.READY, etiqueta: 'Listo' },
  [OrderStatus.READY]: { estado: OrderStatus.SERVED, etiqueta: 'Entregar' },
  [OrderStatus.SERVED]: { estado: OrderStatus.COMPLETED, etiqueta: 'Cerrar' },
};

/** Terminales: la orden ya no se mueve. */
const ESTADOS_TERMINALES: string[] = [
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return {
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
        label: 'Completada',
      };
    // Los cuatro estados intermedios se pintaban juntos como "Pendiente", y
    // READY y SERVED ni siquiera entraban aqui: caian al default y salian en
    // crudo, en ingles. Daba igual mientras la orden no se pudiera mover de
    // estado desde ninguna pantalla; ahora el barista los recorre uno a uno y
    // necesita distinguirlos de un vistazo.
    case 'PENDING':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: AlertCircle,
        label: 'Pendiente',
      };
    case 'IN_PROGRESS':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-300',
        icon: Loader2,
        label: 'En preparación',
      };
    case 'READY':
      return {
        color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        icon: Clock,
        label: 'Lista',
      };
    case 'SERVED':
      return {
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: CheckCircle,
        label: 'Entregada',
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

/**
 * Fecha de calendario LOCAL en formato `YYYY-MM-DD`.
 *
 * `toISOString()` devuelve la fecha en UTC, asi que a partir de las 18:00 en
 * Mexico ya reporta el dia siguiente: el filtro "hoy" pedia mannana y la
 * pantalla se quedaba vacia el resto de la jornada. El backend interpreta esta
 * cadena como dia de calendario, de modo que aqui hay que mandar el local.
 */
function fechaLocal(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function getDateRange(filterDate: string): {
  start_date?: string;
  end_date?: string;
} {
  const now = new Date();
  const today = fechaLocal(now);
  if (filterDate === 'today') return { start_date: today, end_date: today };
  if (filterDate === 'yesterday') {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const d = fechaLocal(y);
    return { start_date: d, end_date: d };
  }
  if (filterDate === 'week') {
    const w = new Date(now);
    w.setDate(w.getDate() - 7);
    return { start_date: fechaLocal(w), end_date: today };
  }
  if (filterDate === 'month') {
    const m = new Date(now);
    m.setDate(1);
    return { start_date: fechaLocal(m), end_date: today };
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
  const avanzarEstado = useUpdateOrderStatus();

  const stats = {
    totalOrders: orders.length,
    completed: orders.filter((o) => o.status === 'COMPLETED').length,
    // "En curso" es todo lo que no ha terminado. Antes se enumeraban a mano
    // PENDING, IN_PROGRESS y CONFIRMED — este ultimo no existe en el enum, y
    // faltaban READY y SERVED, que no se contaban en NINGUNA de las tarjetas:
    // las ordenes que estaban en la barra desaparecian de los totales.
    pending: orders.filter((o) => !ESTADOS_TERMINALES.includes(o.status))
      .length,
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    // Los montos viven en el Ticket asociado, no en Order
    totalRevenue: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + (o.ticket?.total ?? 0), 0),
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
              <>
                {/*
                En la barra, las comandas se miran en el telefono. Siete
                columnas no caben: la tabla se arrastra de lado y hay que
                perseguir el boton de avanzar estado, que es justo lo unico que
                el barista necesita tocar. Debajo de `md`, una tarjeta por
                comanda con el numero, la hora, el total y ese boton.
              */}
                <div className="space-y-3 p-4 md:hidden">
                  {orders.map((order) => {
                    const statusInfo = getStatusBadge(order.status);
                    const StatusIcon = statusInfo.icon;
                    const createdAt = new Date(order.createdAt);
                    const siguiente =
                      SIGUIENTE_ESTADO[order.status as OrderStatus];
                    const enCurso =
                      avanzarEstado.isPending &&
                      avanzarEstado.variables?.id === order.id;

                    return (
                      <article
                        key={order.id}
                        data-testid="comanda"
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-gray-900">
                              {order.orderNumber}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {createdAt.toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' · '}
                              {order.items.length}{' '}
                              {order.items.length === 1
                                ? 'producto'
                                : 'productos'}
                            </p>
                          </div>
                          <span className="shrink-0 font-semibold text-gray-900">
                            ${(order.ticket?.total ?? 0).toFixed(2)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </span>

                          {siguiente && (
                            <button
                              type="button"
                              onClick={() =>
                                avanzarEstado.mutate({
                                  id: order.id,
                                  status: siguiente.estado,
                                })
                              }
                              disabled={enCurso}
                              className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {enCurso && (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              )}
                              {siguiente.etiqueta}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="hidden md:block">
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
                        const siguiente =
                          SIGUIENTE_ESTADO[order.status as OrderStatus];
                        // Solo se deshabilita la fila que se esta enviando, no
                        // todas: en hora punta se avanzan varias seguidas.
                        const enCurso =
                          avanzarEstado.isPending &&
                          avanzarEstado.variables?.id === order.id;

                        return (
                          <tr
                            key={order.id}
                            data-testid="comanda"
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {order.locationId}
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
                                {/* GET /orders no incluye ticket.customer; usamos
                                customerName del propio Order si existe */}
                                {order.customerName ||
                                order.ticket?.customer?.firstName ? (
                                  order.customerName ||
                                  [
                                    order.ticket?.customer?.firstName,
                                    order.ticket?.customer?.lastName,
                                  ]
                                    .filter(Boolean)
                                    .join(' ')
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
                                ${(order.ticket?.total ?? 0).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-900">
                                {/* Los pagos viven en el Ticket; el include actual
                                no los trae, así que normalmente será "—" */}
                                {order.ticket?.payments?.[0]?.method ?? '—'}
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
                              {/*
                            La accion que faltaba: hasta ahora esta pantalla era
                            solo lectura, asi que una orden no se podia mover de
                            estado desde ninguna parte de la interfaz — el
                            barista no tenia como marcar un cafe listo ni
                            entregado. El endpoint y el hook ya existian.
                          */}
                              {siguiente && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    avanzarEstado.mutate({
                                      id: order.id,
                                      status: siguiente.estado,
                                    })
                                  }
                                  disabled={enCurso}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {enCurso && (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  )}
                                  {siguiente.etiqueta}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
