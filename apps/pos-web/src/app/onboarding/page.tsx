'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  GraduationCap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Users,
  Filter,
  Search,
  Loader2,
  AlertTriangle,
  FileText,
  Package,
  Monitor,
  Shield,
  Heart,
  BookOpen,
} from 'lucide-react';
import {
  useOnboardingPlans,
  useOnboardingStats,
  useCompleteTask,
} from '@/hooks/use-onboarding';
import { OnboardingPeriod, TaskCategory } from '@/types';

export default function OnboardingPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');

  const {
    data: plans = [],
    isLoading,
    error,
  } = useOnboardingPlans(
    undefined,
    filterPeriod === 'all' ? undefined : (filterPeriod as OnboardingPeriod),
  );

  const { data: stats } = useOnboardingStats();
  const completeTask = useCompleteTask();

  const filteredPlans = useMemo(() => {
    if (!searchTerm) return plans;
    return plans.filter((plan) =>
      plan.tasks.some(
        (task) =>
          task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task.description.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [plans, searchTerm]);

  const handleToggleTask = (
    planId: string,
    taskId: string,
    completed: boolean,
  ) => {
    completeTask.mutate({ planId, taskId, completed: !completed });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">
              Error al cargar planes de capacitación
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Capacitación 30/60/90
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema de onboarding por fases
            </p>
          </div>
          <GraduationCap className="h-12 w-12 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Total Planes
                </p>
                <p className="text-3xl font-bold mt-1">{stats?.total || 0}</p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Completados
                </p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.completed || 0}
                </p>
              </div>
              <CheckCircle2 className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">
                  En Progreso
                </p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.in_progress || 0}
                </p>
              </div>
              <Clock className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Promedio</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.avg_completion_percentage?.toFixed(0) || 0}%
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-purple-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las fases</option>
                <option value={OnboardingPeriod.DAY_30}>30 días</option>
                <option value={OnboardingPeriod.DAY_60}>60 días</option>
                <option value={OnboardingPeriod.DAY_90}>90 días</option>
              </select>
            </div>
          </div>
        </div>

        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <GraduationCap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay planes de capacitación
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'No se encontraron resultados para tu búsqueda'
                : 'Comienza creando un plan de onboarding'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Empleado #{plan.employee_id}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                      {plan.day_30_completed && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          30 días ✓
                        </span>
                      )}
                      {plan.day_60_completed && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          60 días ✓
                        </span>
                      )}
                      {plan.day_90_completed && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                          90 días ✓
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {plan.completion_percentage}%
                    </p>
                    <p className="text-sm text-gray-600">Completado</p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${plan.completion_percentage}%` }}
                    />
                  </div>
                </div>

                {plan.notes && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notas:</span> {plan.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Sistema 30/60/90:</strong> Onboarding estructurado en 3
            fases para garantizar la integración efectiva de nuevos empleados.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
