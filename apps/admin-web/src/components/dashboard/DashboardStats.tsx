'use client';

import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Receipt } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { DashboardStats as DashboardStatsType } from '@/types';

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery<DashboardStatsType>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/dashboard/stats'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      name: 'Ventas del Día',
      value: `$${stats?.today.sales.toLocaleString('es-MX') || 0}`,
      change: stats?.today.growth || 0,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      name: 'Órdenes',
      value: stats?.today.orders || 0,
      change: stats?.today.growth || 0,
      icon: Receipt,
      color: 'bg-blue-500',
    },
    {
      name: 'Clientes',
      value: stats?.today.customers || 0,
      change: stats?.today.growth || 0,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      name: 'Ticket Promedio',
      value: `$${stats?.today.average_ticket.toLocaleString('es-MX') || 0}`,
      change: stats?.today.growth || 0,
      icon: ShoppingBag,
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        const isPositive = stat.change >= 0;

        return (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className={`flex items-center text-sm font-medium ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(stat.change)}%
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
