/**
 * CoffeeOS - Generic Placeholder Page
 * Página genérica para módulos en desarrollo
 */

'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  features: string[];
  comingSoon?: boolean;
}

export function PlaceholderPage({
  title,
  description,
  icon: Icon,
  iconColor,
  features,
  comingSoon = true,
}: PlaceholderPageProps) {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div
              className={`w-16 h-16 ${iconColor} rounded-xl flex items-center justify-center mx-auto mb-6`}
            >
              <Icon className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-gray-800 mb-3">{title}</h1>
            <p className="text-gray-600 mb-8">{description}</p>

            {comingSoon && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-6 mb-8">
                <h2 className="text-xl font-semibold text-amber-800 mb-2">
                  🚧 Módulo en Desarrollo
                </h2>
                <p className="text-amber-700">
                  Este módulo está siendo implementado. Pronto estará disponible
                  con todas sus funcionalidades.
                </p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Funcionalidades Planeadas:
              </h3>
              <ul className="space-y-2 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Volver al Dashboard
              </Link>
              <Link
                href="/pos"
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Ir al POS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
