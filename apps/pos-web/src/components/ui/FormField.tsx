/**
 * FormField Component - Reusable form field with label and validation
 */

'use client';

import {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface BaseFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

interface InputFieldProps
  extends BaseFieldProps,
    InputHTMLAttributes<HTMLInputElement> {
  type?: 'text' | 'email' | 'number' | 'password' | 'date' | 'tel';
}

interface TextareaFieldProps
  extends BaseFieldProps,
    TextareaHTMLAttributes<HTMLTextAreaElement> {}

interface SelectFieldProps
  extends BaseFieldProps,
    SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string | number; label: string }[];
}

export function InputField({
  label,
  error,
  required,
  helperText,
  ...props
}: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        {...props}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
        } ${props.className || ''}`}
      />
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function TextareaField({
  label,
  error,
  required,
  helperText,
  ...props
}: TextareaFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        {...props}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-none ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
        } ${props.className || ''}`}
      />
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function SelectField({
  label,
  error,
  required,
  helperText,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        {...props}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors appearance-none bg-white ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
        } ${props.className || ''}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p className="mt-1 text-xs text-gray-500">{helperText}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
