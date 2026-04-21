'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coffee, TrendingUp, ShoppingCart, Users, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('auth_token');
    const currentUser = localStorage.getItem('current_user');
    
    if (!token) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      setUser(JSON.parse(currentUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.clear();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coffee-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Coffee className="h-8 w-8 text-coffee-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">CoffeeOS Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {user.name}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-coffee-600 hover:bg-coffee-700 rounded-lg transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ¡Bienvenido de nuevo, {user.name}! ☕
          </h2>
          <p className="text-gray-600">
            Este es tu panel de control. Aquí podrás gestionar tu negocio de café.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Ventas Hoy"
            value="$0.00"
            icon={<DollarSign className="h-6 w-6" />}
            color="blue"
          />
          <StatCard
            title="Órdenes"
            value="0"
            icon={<ShoppingCart className="h-6 w-6" />}
            color="green"
          />
          <StatCard
            title="Clientes"
            value="0"
            icon={<Users className="h-6 w-6" />}
            color="purple"
          />
          <StatCard
            title="Crecimiento"
            value="0%"
            icon={<TrendingUp className="h-6 w-6" />}
            color="orange"
          />
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎉 ¡Sistema Funcionando!
          </h3>
          <p className="text-blue-800 mb-4">
            El login está funcionando correctamente. Los módulos completos del dashboard estarán disponibles próximamente.
          </p>
          <div className="space-y-2 text-sm text-blue-700">
            <p>✅ API: http://localhost:4001</p>
            <p>✅ Admin Web: http://localhost:3002</p>
            <p>✅ Usuario: {user.email}</p>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
