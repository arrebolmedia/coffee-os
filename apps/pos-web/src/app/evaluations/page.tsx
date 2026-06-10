'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  AlertTriangle,
  Award,
  Calendar,
  ClipboardCheck,
  Filter,
  Loader2,
  Search,
  Star,
  Target,
  Trash2,
  User,
} from 'lucide-react';
import {
  useDeleteEvaluation,
  useEvaluations,
  useEvaluationStats,
} from '@/hooks/use-evaluations';
import { EvaluationPeriod, PerformanceRating } from '@/types';

export default function EvaluationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [filterRating, setFilterRating] = useState<string>('all');

  const {
    data: evaluations = [],
    isLoading,
    error,
  } = useEvaluations({
    period:
      filterPeriod !== 'all' ? (filterPeriod as EvaluationPeriod) : undefined,
    rating:
      filterRating !== 'all' ? (filterRating as PerformanceRating) : undefined,
  });

  const { data: stats } = useEvaluationStats();
  const deleteEvaluation = useDeleteEvaluation();

  const filteredEvaluations = evaluations.filter((evaluation) => {
    if (!searchTerm) return true;
    return evaluation.employee_id
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
  });

  const getRatingColor = (rating: PerformanceRating) => {
    const colors = {
      [PerformanceRating.EXCELLENT]: 'bg-green-100 text-green-700',
      [PerformanceRating.GOOD]: 'bg-blue-100 text-blue-700',
      [PerformanceRating.SATISFACTORY]: 'bg-yellow-100 text-yellow-700',
      [PerformanceRating.NEEDS_IMPROVEMENT]: 'bg-orange-100 text-orange-700',
      [PerformanceRating.UNSATISFACTORY]: 'bg-red-100 text-red-700',
    };
    return colors[rating];
  };

  const getRatingLabel = (rating: PerformanceRating) => {
    const labels = {
      [PerformanceRating.EXCELLENT]: 'Excelente',
      [PerformanceRating.GOOD]: 'Bueno',
      [PerformanceRating.SATISFACTORY]: 'Satisfactorio',
      [PerformanceRating.NEEDS_IMPROVEMENT]: 'Necesita Mejorar',
      [PerformanceRating.UNSATISFACTORY]: 'Insatisfactorio',
    };
    return labels[rating];
  };

  const getPeriodLabel = (period: EvaluationPeriod) => {
    const labels = {
      [EvaluationPeriod.MONTHLY]: 'Mensual',
      [EvaluationPeriod.QUARTERLY]: 'Trimestral',
      [EvaluationPeriod.SEMI_ANNUAL]: 'Semestral',
      [EvaluationPeriod.ANNUAL]: 'Anual',
    };
    return labels[period];
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta evaluación?')) {
      deleteEvaluation.mutate(id);
    }
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
            <p className="text-gray-600">Error al cargar evaluaciones</p>
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
              Evaluaciones de Desempeño
            </h1>
            <p className="text-gray-600 mt-1">
              Sistema de evaluaciones y feedback
            </p>
          </div>
          <ClipboardCheck className="h-12 w-12 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Total Evaluaciones
                </p>
                <p className="text-3xl font-bold mt-1">{stats?.total || 0}</p>
              </div>
              <ClipboardCheck className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">
                  Promedio General
                </p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.avg_overall_score?.toFixed(1) || '0.0'}
                </p>
              </div>
              <Star className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Puntualidad
                </p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.avg_punctuality?.toFixed(1) || '0.0'}
                </p>
              </div>
              <Calendar className="h-12 w-12 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Calidad</p>
                <p className="text-3xl font-bold mt-1">
                  {stats?.avg_quality_of_work?.toFixed(1) || '0.0'}
                </p>
              </div>
              <Award className="h-12 w-12 text-yellow-200" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Promedio por Categoría</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Servicio al Cliente</span>
                <span className="text-gray-600">
                  {stats?.avg_customer_service?.toFixed(1) || '0.0'} / 5.0
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${((stats?.avg_customer_service || 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Trabajo en Equipo</span>
                <span className="text-gray-600">
                  {stats?.avg_teamwork?.toFixed(1) || '0.0'} / 5.0
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${((stats?.avg_teamwork || 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Iniciativa</span>
                <span className="text-gray-600">
                  {stats?.avg_initiative?.toFixed(1) || '0.0'} / 5.0
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${((stats?.avg_initiative || 0) / 5) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por empleado..."
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
                <option value="all">Todos los períodos</option>
                <option value={EvaluationPeriod.MONTHLY}>Mensual</option>
                <option value={EvaluationPeriod.QUARTERLY}>Trimestral</option>
                <option value={EvaluationPeriod.SEMI_ANNUAL}>Semestral</option>
                <option value={EvaluationPeriod.ANNUAL}>Anual</option>
              </select>
              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las calificaciones</option>
                <option value={PerformanceRating.EXCELLENT}>Excelente</option>
                <option value={PerformanceRating.GOOD}>Bueno</option>
                <option value={PerformanceRating.SATISFACTORY}>
                  Satisfactorio
                </option>
                <option value={PerformanceRating.NEEDS_IMPROVEMENT}>
                  Necesita Mejorar
                </option>
                <option value={PerformanceRating.UNSATISFACTORY}>
                  Insatisfactorio
                </option>
              </select>
            </div>
          </div>
        </div>

        {filteredEvaluations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay evaluaciones
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'No se encontraron resultados'
                : 'Comienza creando una evaluación'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredEvaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="bg-white rounded-lg shadow p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Empleado #{evaluation.employee_id}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getRatingColor(evaluation.overall_rating)}`}
                      >
                        {getRatingLabel(evaluation.overall_rating)}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {getPeriodLabel(evaluation.period)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(
                          evaluation.evaluation_date,
                        ).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-4 w-4" />
                        Score: {evaluation.average_score.toFixed(1)} / 5.0
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(evaluation.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-green-600 h-3 rounded-full transition-all"
                      style={{
                        width: `${(evaluation.average_score / 5) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Puntualidad</p>
                    <p className="text-lg font-bold text-gray-900">
                      {evaluation.punctuality_score}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Calidad</p>
                    <p className="text-lg font-bold text-gray-900">
                      {evaluation.quality_of_work_score}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Servicio</p>
                    <p className="text-lg font-bold text-gray-900">
                      {evaluation.customer_service_score}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Equipo</p>
                    <p className="text-lg font-bold text-gray-900">
                      {evaluation.teamwork_score}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Iniciativa</p>
                    <p className="text-lg font-bold text-gray-900">
                      {evaluation.initiative_score}
                    </p>
                  </div>
                </div>

                {evaluation.strengths && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      ✅ Fortalezas:
                    </p>
                    <p className="text-sm text-gray-600">
                      {evaluation.strengths}
                    </p>
                  </div>
                )}

                {evaluation.areas_for_improvement && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      🎯 Áreas de Mejora:
                    </p>
                    <p className="text-sm text-gray-600">
                      {evaluation.areas_for_improvement}
                    </p>
                  </div>
                )}

                {evaluation.goals && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      🎓 Objetivos:
                    </p>
                    <p className="text-sm text-gray-600">{evaluation.goals}</p>
                  </div>
                )}

                {evaluation.evaluator_comments && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      💬 Comentarios del Evaluador:
                    </p>
                    <p className="text-sm text-gray-600">
                      {evaluation.evaluator_comments}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            📊 <strong>Sistema de Evaluaciones:</strong> Evaluaciones de
            desempeño con 5 métricas clave y ratings de EXCELENTE a
            INSATISFACTORIO.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
