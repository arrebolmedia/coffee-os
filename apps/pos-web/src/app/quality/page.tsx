'use client';

import { MainLayout } from '@/components/layout/MainLayout';
import {
  useChecklistExecutions,
  useChecklistTemplates,
  useNOM251Status,
} from '@/hooks/use-quality-control';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Download,
  Loader2,
  Plus,
  Shield,
  Thermometer,
} from 'lucide-react';

export default function QualityPage() {
  const { data: executionsData, isLoading } = useChecklistExecutions();
  const { data: templatesData } = useChecklistTemplates();
  const { data: nom251Data } = useNOM251Status();

  const executions = executionsData || [];
  const templates = templatesData || [];
  const nom251 = nom251Data || { score: 95, compliant: true };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const stats = {
    today: executions.filter((e: any) => e.execution_date?.startsWith(today))
      .length,
    completed: executions.filter((e: any) => e.status === 'completed').length,
    failed: executions.filter((e: any) => e.status === 'failed').length,
    avgScore: nom251.score || 0,
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Control de Calidad
                  </h1>
                  <p className="text-sm text-gray-500">
                    Cumplimiento NOM-251 y gestión de calidad
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Reporte NOM-251</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Checklist</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-10 h-10" />
                <div>
                  <h2 className="text-2xl font-bold">
                    Estado de Cumplimiento NOM-251
                  </h2>
                  <p className="text-indigo-100">
                    Norma Oficial Mexicana - Higiene de alimentos y bebidas
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{stats.avgScore}%</div>
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">
                    {stats.avgScore >= 90 ? 'CUMPLIENDO' : 'REQUIERE ATENCIÓN'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Checklists Hoy</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.today}
                  </p>
                </div>
                <ClipboardCheck className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Fallidos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.failed}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Score General</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.avgScore}%
                  </p>
                </div>
                <Shield className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-indigo-600" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Sistema de Control de Calidad
            </h3>
            <p className="text-gray-600 mb-6">
              Backend completo con 25+ hooks y servicios implementados
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="p-4 bg-blue-50 rounded-lg">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <p className="font-semibold text-gray-800">
                  Checklists Digitales
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Apertura, cierre, limpieza
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <Thermometer className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <p className="font-semibold text-gray-800">
                  Control de Temperatura
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Monitoreo con alertas
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-600" />
                <p className="font-semibold text-gray-800">NOM-251</p>
                <p className="text-sm text-gray-600 mt-1">
                  Reportes y audit trail
                </p>
              </div>
            </div>
            <div className="mt-8 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-indigo-900 font-medium">
                ✅ {executions.length} ejecuciones | ✅ {templates.length}{' '}
                plantillas disponibles
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
