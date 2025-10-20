import Image from 'next/image';
import Link from 'next/link';
import { Coffee, ShoppingCart, Users, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Coffee className="w-12 h-12 text-amber-700 mr-4" />
            <h1 className="text-4xl font-bold text-gray-800">CoffeeOS POS</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema punto de venta integral para cafeterías modernas
          </p>
        </header>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Link href="/pos" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-lg mb-4 mx-auto group-hover:bg-green-200 transition-colors">
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Punto de Venta
              </h3>
              <p className="text-gray-600 text-sm text-center">
                Procesar ventas y cobros
              </p>
            </div>
          </Link>

          <Link href="/inventory" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-lg mb-4 mx-auto group-hover:bg-blue-200 transition-colors">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Inventario
              </h3>
              <p className="text-gray-600 text-sm text-center">
                Gestionar stock y productos
              </p>
            </div>
          </Link>

          <Link href="/quality" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-lg mb-4 mx-auto group-hover:bg-purple-200 transition-colors">
                <Coffee className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Calidad
              </h3>
              <p className="text-gray-600 text-sm text-center">
                Checklists y temperaturas
              </p>
            </div>
          </Link>

          <Link href="/customers" className="group">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-lg mb-4 mx-auto group-hover:bg-orange-200 transition-colors">
                <Users className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2 text-center">
                Clientes
              </h3>
              <p className="text-gray-600 text-sm text-center">
                CRM y programa de lealtad
              </p>
            </div>
          </Link>
        </div>

        {/* Today's Summary */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Resumen del Día
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                $2,450
              </div>
              <div className="text-gray-600">Ventas Total</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">87</div>
              <div className="text-gray-600">Tickets Vendidos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                $28.16
              </div>
              <div className="text-gray-600">Ticket Promedio</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>CoffeeOS v1.0.0 - Sistema Multi-Tenant para Cafeterías</p>
        </footer>
      </div>
    </main>
  );
}
