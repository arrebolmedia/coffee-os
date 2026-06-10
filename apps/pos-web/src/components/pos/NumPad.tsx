/**
 * CoffeeOS POS Web - NumPad Component
 * Teclado numérico para entrada de cantidades y precios
 */

'use client';

import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';

interface NumPadProps {
  onNumberEnter: (value: string) => void;
  onClear?: () => void;
  onConfirm?: (value: string) => void;
  initialValue?: string;
  maxLength?: number;
  allowDecimal?: boolean;
  showConfirm?: boolean;
}

export function NumPad({
  onNumberEnter,
  onClear,
  onConfirm,
  initialValue = '',
  maxLength = 10,
  allowDecimal = false,
  showConfirm = false,
}: NumPadProps) {
  const [value, setValue] = useState(initialValue);

  // Sync internal state when the parent resets/initialValue changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handlePress = (digit: string) => {
    if (value.length >= maxLength) return;

    const newValue = value + digit;
    setValue(newValue);
    onNumberEnter(newValue);
  };

  const handleDecimal = () => {
    if (!allowDecimal) return;
    if (value.includes('.')) return;
    if (value === '') {
      const newValue = '0.';
      setValue(newValue);
      onNumberEnter(newValue);
    } else {
      const newValue = value + '.';
      setValue(newValue);
      onNumberEnter(newValue);
    }
  };

  const handleBackspace = () => {
    const newValue = value.slice(0, -1);
    setValue(newValue);
    onNumberEnter(newValue);
  };

  const handleClear = () => {
    setValue('');
    onNumberEnter('');
    onClear?.();
  };

  const handleConfirm = () => {
    if (value && onConfirm) {
      onConfirm(value);
    }
  };

  const buttons = [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    {
      label: allowDecimal ? '.' : '0',
      value: allowDecimal ? '.' : '0',
      span: allowDecimal,
    },
    { label: '0', value: '0' },
    { label: '⌫', value: 'backspace', icon: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Display */}
      <div className="bg-gray-100 rounded-lg p-4 min-h-[60px] flex items-center justify-end">
        <span className="text-3xl font-bold text-gray-900 font-mono">
          {value || '0'}
        </span>
      </div>

      {/* Number Grid */}
      <div className="grid grid-cols-3 gap-2">
        {buttons.map((button, index) => {
          if (button.value === '.' && !allowDecimal && button.span) {
            return (
              <button
                key={index}
                onClick={() => handlePress('0')}
                className="col-span-2 h-16 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg text-2xl font-semibold text-gray-900 transition-colors active:scale-95"
              >
                0
              </button>
            );
          }

          if (button.value === 'backspace') {
            return (
              <button
                key={index}
                onClick={handleBackspace}
                className="h-16 bg-red-50 hover:bg-red-100 border-2 border-red-200 rounded-lg text-red-600 transition-colors active:scale-95 flex items-center justify-center"
              >
                <Delete className="w-6 h-6" />
              </button>
            );
          }

          if (button.value === '.') {
            return (
              <button
                key={index}
                onClick={handleDecimal}
                disabled={value.includes('.')}
                className="h-16 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg text-2xl font-semibold text-gray-900 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {button.label}
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handlePress(button.value)}
              className={`h-16 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-lg text-2xl font-semibold text-gray-900 transition-colors active:scale-95 ${
                button.span ? 'col-span-2' : ''
              }`}
            >
              {button.label}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={handleClear}
          className="h-12 bg-gray-100 hover:bg-gray-200 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 transition-colors"
        >
          Limpiar
        </button>

        {showConfirm && (
          <button
            onClick={handleConfirm}
            disabled={!value}
            className="h-12 bg-amber-500 hover:bg-amber-600 border-2 border-amber-600 rounded-lg font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        )}
      </div>
    </div>
  );
}
