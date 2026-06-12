'use client';

/**
 * Auditorías — MÓDULO NO DISPONIBLE.
 *
 * No existe backend para /audits en CoffeeOS API; esta página muestra un
 * empty-state permanente en lugar de pegar a rutas fantasma.
 *
 * TODO(backend): implementar el módulo audits en apps/api y restaurar la UI
 * completa (lista, filtros, stats, completar/eliminar) que vive en el
 * historial de git de este archivo.
 */

import { MainLayout } from '@/components/layout/MainLayout';
import { Construction, FileCheck } from 'lucide-react';

export default function AuditsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Auditorías</h1>
            <p className="text-gray-600 mt-1">
              Gestión de auditorías y cumplimiento
            </p>
          </div>
          <FileCheck className="h-12 w-12 text-blue-600" />
        </div>

        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Construction className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Módulo no disponible
          </h3>
          <p className="text-gray-600 max-w-2xl mx-auto">
            El backend de auditorías aún no existe en CoffeeOS API. Este módulo
            se habilitará cuando la API implemente los endpoints de auditorías
            (registro, hallazgos, acciones correctivas y estadísticas).
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
