'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ModifierGroupsList from '@/components/products/ModifierGroupsList';

export default function ModifiersPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard/products"
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Productos
        </Link>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 font-medium">Modificadores</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Modificadores</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona grupos de opciones personalizables para tus productos como tamaños,
          extras, tipos de leche, ingredientes adicionales, etc.
        </p>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow p-6">
        <ModifierGroupsList />
      </div>
    </div>
  );
}
