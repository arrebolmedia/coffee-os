/**
 * CoffeeOS POS Web - Payment Modal Component
 * Modal para procesar pagos (efectivo, tarjeta, mixto)
 */

'use client';

import { useState } from 'react';
import { useCartStore } from '@/store/cart.store';
import { useCreateOrder } from '@/hooks/use-orders';
import { PaymentMethod, Cart } from '@/types';
import { X, CreditCard, Banknote, ArrowLeftRight, Check, Loader2 } from 'lucide-react';
import { NumPad } from './NumPad';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const cart = useCartStore((state) => state.cart);
  const clearCart = useCartStore((state) => state.clearCart);
  const createOrderMutation = useCreateOrder();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashReceived, setCashReceived] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [cashAmount, setCashAmount] = useState<string>('');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(price);
  };

  const parseAmount = (value: string): number => {
    return parseFloat(value) || 0;
  };

  const calculateChange = (): number => {
    if (paymentMethod === PaymentMethod.CASH) {
      return parseAmount(cashReceived) - cart.total;
    }
    if (paymentMethod === PaymentMethod.MIXED) {
      const totalReceived = parseAmount(cardAmount) + parseAmount(cashAmount);
      return totalReceived - cart.total;
    }
    return 0;
  };

  const isPaymentValid = (): boolean => {
    if (!paymentMethod) return false;

    if (paymentMethod === PaymentMethod.CASH) {
      return parseAmount(cashReceived) >= cart.total;
    }

    if (paymentMethod === PaymentMethod.CARD) {
      return true; // Card payments are always exact
    }

    if (paymentMethod === PaymentMethod.MIXED) {
      const totalReceived = parseAmount(cardAmount) + parseAmount(cashAmount);
      return totalReceived >= cart.total;
    }

    return false;
  };

  const handleConfirmPayment = async () => {
    if (!isPaymentValid()) return;

    try {
      const result = await createOrderMutation.mutateAsync({
        cart,
        payment_method: paymentMethod!,
      });

      clearCart();
      onSuccess(result.id);
      onClose();
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Procesar Pago</h2>
            <p className="text-sm text-gray-500 mt-1">
              Total a cobrar: <span className="font-bold text-amber-600">{formatPrice(cart.total)}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!paymentMethod ? (
            // Payment Method Selection
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PaymentMethodButton
                icon={<Banknote className="w-12 h-12" />}
                label="Efectivo"
                description="Pago en efectivo"
                onClick={() => setPaymentMethod(PaymentMethod.CASH)}
                color="green"
              />
              <PaymentMethodButton
                icon={<CreditCard className="w-12 h-12" />}
                label="Tarjeta"
                description="Débito o crédito"
                onClick={() => setPaymentMethod(PaymentMethod.CARD)}
                color="blue"
              />
              <PaymentMethodButton
                icon={<ArrowLeftRight className="w-12 h-12" />}
                label="Mixto"
                description="Efectivo + Tarjeta"
                onClick={() => setPaymentMethod(PaymentMethod.MIXED)}
                color="purple"
              />
            </div>
          ) : (
            // Payment Form
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Summary */}
              <div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA:</span>
                    <span className="font-medium">{formatPrice(cart.tax)}</span>
                  </div>
                  {cart.discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Descuento:</span>
                      <span className="font-medium">-{formatPrice(cart.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-3 border-t border-gray-200">
                    <span>Total:</span>
                    <span className="text-amber-600">{formatPrice(cart.total)}</span>
                  </div>
                </div>

                {paymentMethod === PaymentMethod.CASH && parseAmount(cashReceived) >= cart.total && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium mb-2">Cambio:</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatPrice(calculateChange())}
                    </p>
                  </div>
                )}

                {paymentMethod === PaymentMethod.MIXED && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800 font-medium mb-1">Tarjeta:</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatPrice(parseAmount(cardAmount))}
                      </p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 font-medium mb-1">Efectivo:</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatPrice(parseAmount(cashAmount))}
                      </p>
                    </div>
                    {isPaymentValid() && calculateChange() > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-800 font-medium mb-1">Cambio:</p>
                        <p className="text-2xl font-bold text-amber-600">
                          {formatPrice(calculateChange())}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: NumPad */}
              <div>
                {paymentMethod === PaymentMethod.CASH && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Efectivo recibido:
                    </label>
                    <NumPad
                      onNumberEnter={setCashReceived}
                      initialValue={cashReceived}
                      allowDecimal
                      maxLength={10}
                    />
                  </div>
                )}

                {paymentMethod === PaymentMethod.CARD && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <CreditCard className="w-24 h-24 mx-auto mb-4 text-blue-500" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        Terminal de pago
                      </p>
                      <p className="text-sm text-gray-500">
                        Procesar pago por {formatPrice(cart.total)}
                      </p>
                    </div>
                  </div>
                )}

                {paymentMethod === PaymentMethod.MIXED && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto con tarjeta:
                      </label>
                      <NumPad
                        onNumberEnter={setCardAmount}
                        initialValue={cardAmount}
                        allowDecimal
                        maxLength={10}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monto en efectivo:
                      </label>
                      <NumPad
                        onNumberEnter={setCashAmount}
                        initialValue={cashAmount}
                        allowDecimal
                        maxLength={10}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              if (paymentMethod) {
                setPaymentMethod(null);
                setCashReceived('');
                setCardAmount('');
                setCashAmount('');
              } else {
                onClose();
              }
            }}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            {paymentMethod ? 'Atrás' : 'Cancelar'}
          </button>

          {paymentMethod && (
            <button
              onClick={handleConfirmPayment}
              disabled={!isPaymentValid() || createOrderMutation.isPending}
              className="flex items-center gap-2 px-8 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Confirmar Pago
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAYMENT METHOD BUTTON
// ============================================================================

interface PaymentMethodButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: 'green' | 'blue' | 'purple';
}

function PaymentMethodButton({ icon, label, description, onClick, color }: PaymentMethodButtonProps) {
  const colorClasses = {
    green: 'border-green-200 hover:bg-green-50 hover:border-green-300 text-green-600',
    blue: 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-600',
    purple: 'border-purple-200 hover:bg-purple-50 hover:border-purple-300 text-purple-600',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-8 border-2 rounded-xl transition-all hover:shadow-lg ${colorClasses[color]}`}
    >
      {icon}
      <h3 className="text-xl font-bold mt-4 mb-1">{label}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
}
