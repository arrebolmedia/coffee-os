/**
 * CoffeeOS - Module In Development Banner
 * Banner estándar para módulos que están en desarrollo
 */

import { AlertCircle, Construction } from 'lucide-react';

interface ModuleInDevelopmentProps {
  moduleName: string;
  description?: string;
  estimatedDate?: string;
}

export function ModuleInDevelopment({
  moduleName,
  description,
  estimatedDate,
}: ModuleInDevelopmentProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Construction className="w-8 h-8 text-amber-600" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {moduleName}
          </h2>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">
              En Desarrollo
            </span>
          </div>

          {/* Description */}
          {description && (
            <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
          )}

          {/* Estimated Date */}
          {estimatedDate && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Fecha estimada de disponibilidad:</strong>{' '}
                {estimatedDate}
              </p>
            </div>
          )}

          {/* Message */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed">
              Este módulo está siendo desarrollado actualmente. La interfaz y
              funcionalidades estarán disponibles próximamente. Si tienes alguna
              pregunta o sugerencia sobre este módulo, por favor contacta al
              equipo de desarrollo.
            </p>
          </div>

          {/* Features Coming Soon */}
          <div className="mt-6 text-left">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              ✨ Características próximamente:
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Conexión completa con API backend</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Interfaz intuitiva y responsiva</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Reportes y análisis en tiempo real</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">•</span>
                <span>Integración con otros módulos del sistema</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
