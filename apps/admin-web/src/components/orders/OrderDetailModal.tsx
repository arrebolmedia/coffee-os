'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  X,
  Receipt,
  User,
  Calendar,
  CreditCard,
  Package,
  Clock,
  MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Order, OrderStatus } from '@/types';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const paymentMethodLabels = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  TRANSFER: 'Transferencia',
  MIXED: 'Mixto',
};

export default function OrderDetailModal({
  isOpen,
  onClose,
  order,
}: OrderDetailModalProps) {
  if (!order) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Receipt className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900">
                        Orden #{order.order_number}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500">
                        {format(
                          new Date(order.created_at),
                          "dd 'de' MMMM yyyy, HH:mm",
                          {
                            locale: es,
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Status & Payment Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">Estado</p>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            statusColors[order.status]
                          }`}
                        >
                          {statusLabels[order.status]}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Método de Pago
                        </p>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {paymentMethodLabels[order.payment_method]}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Info */}
                    {order.customer && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {order.customer.name}
                            </p>
                            {order.customer.email && (
                              <p className="text-sm text-gray-500">
                                {order.customer.email}
                              </p>
                            )}
                            {order.customer.phone && (
                              <p className="text-sm text-gray-500">
                                {order.customer.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cashier Info */}
                    {order.cashier && (
                      <div className="border-t border-gray-200 pt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <span>Atendido por: </span>
                          <span className="font-medium text-gray-900">
                            {order.cashier.name}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">
                        Productos
                      </h3>
                      <div className="space-y-3">
                        {order.items.map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start justify-between bg-gray-50 rounded-lg p-3"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {item.quantity}x
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {item.product_name}
                                </span>
                              </div>

                              {/* Modifiers */}
                              {item.selected_modifiers &&
                                item.selected_modifiers.length > 0 && (
                                  <div className="mt-1 ml-6 space-y-0.5">
                                    {item.selected_modifiers.map(
                                      (modifier, modIndex) => (
                                        <div
                                          key={modIndex}
                                          className="flex items-center gap-2 text-xs text-gray-600"
                                        >
                                          <span>• {modifier.option_name}</span>
                                          {modifier.price_adjustment !== 0 && (
                                            <span className="text-gray-500">
                                              (
                                              {modifier.price_adjustment > 0
                                                ? '+'
                                                : ''}
                                              $
                                              {modifier.price_adjustment.toFixed(
                                                2,
                                              )}
                                              )
                                            </span>
                                          )}
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {/* Notes */}
                              {item.notes && (
                                <p className="mt-1 text-xs text-gray-500 italic ml-6">
                                  Nota: {item.notes}
                                </p>
                              )}
                            </div>

                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                ${item.subtotal.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                ${item.unit_price.toFixed(2)} c/u
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-gray-200 pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="font-medium text-gray-900">
                            ${order.subtotal.toFixed(2)}
                          </span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Descuento</span>
                            <span className="font-medium text-red-600">
                              -${order.discount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Impuestos</span>
                          <span className="font-medium text-gray-900">
                            ${order.tax.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-base font-semibold pt-2 border-t border-gray-200">
                          <span className="text-gray-900">Total</span>
                          <span className="text-gray-900">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details */}
                    {order.payment_details && (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">
                          Detalles de Pago
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                          {order.payment_details.cash_received && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Efectivo recibido
                              </span>
                              <span className="font-medium text-gray-900">
                                $
                                {order.payment_details.cash_received.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {order.payment_details.change_given && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cambio</span>
                              <span className="font-medium text-gray-900">
                                ${order.payment_details.change_given.toFixed(2)}
                              </span>
                            </div>
                          )}
                          {order.payment_details.card_last_four && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tarjeta</span>
                              <span className="font-medium text-gray-900">
                                **** {order.payment_details.card_last_four}
                              </span>
                            </div>
                          )}
                          {order.payment_details.authorization_code && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Autorización
                              </span>
                              <span className="font-mono text-xs text-gray-900">
                                {order.payment_details.authorization_code}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          Notas
                        </h3>
                        <p className="text-sm text-gray-600 bg-yellow-50 rounded-lg p-3">
                          {order.notes}
                        </p>
                      </div>
                    )}

                    {/* Cancellation Info */}
                    {order.status === 'CANCELLED' &&
                      order.cancellation_reason && (
                        <div className="border-t border-gray-200 pt-4">
                          <h3 className="text-sm font-medium text-gray-900 mb-2">
                            Razón de Cancelación
                          </h3>
                          <p className="text-sm text-gray-600 bg-red-50 rounded-lg p-3">
                            {order.cancellation_reason}
                          </p>
                          {order.cancelled_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Cancelada el{' '}
                              {format(
                                new Date(order.cancelled_at),
                                "dd 'de' MMMM yyyy, HH:mm",
                                {
                                  locale: es,
                                },
                              )}
                            </p>
                          )}
                        </div>
                      )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 bg-gray-50">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement print
                      console.log('Print order:', order.id);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    <Receipt className="h-4 w-4" />
                    Reimprimir Ticket
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
