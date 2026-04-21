'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileCheck, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, FileText, XCircle, Check, Trash2, Loader2, Building } from 'lucide-react';
import { useAudits, useAuditStats, useOpenActions, useDeleteAudit, useCompleteAudit } from '@/hooks/use-audits';
import { AuditType, AuditResult } from '@/types';

export default function AuditsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  const { data: audits = [], isLoading, error } = useAudits();
  const { data: stats } = useAuditStats();
  const { data: openActions = [] } = useOpenActions();
  const deleteAudit = useDeleteAudit();
  const completeAudit = useCompleteAudit();

  const filteredAudits = audits.filter((audit) => {
    const matchesSearch = !searchTerm || 
      audit.auditor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audit.findings.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || audit.type === filterType;
    const matchesResult = filterResult === 'all' || audit.result === filterResult;
    const matchesOpen = !showOpenOnly || !audit.is_completed;
    
    return matchesSearch && matchesType && matchesResult && matchesOpen;
  });

  const getTypeLabel = (type: AuditType) => {
    const labels = {
      [AuditType.INTERNAL]: 'Interna',
      [AuditType.EXTERNAL]: 'Externa',
      [AuditType.SANITARY]: 'Sanitaria',
      [AuditType.FIRE_SAFETY]: 'Protección Civil',
      [AuditType.TAX]: 'Fiscal',
      [AuditType.LABOR]: 'Laboral',
      [AuditType.ENVIRONMENTAL]: 'Ambiental',
      [AuditType.FOOD_SAFETY]: 'Seguridad Alimentaria',
      [AuditType.OTHER]: 'Otra',
    };
    return labels[type];
  };

  const getResultColor = (result: AuditResult) => {
    const colors = {
      [AuditResult.APPROVED]: 'bg-green-100 text-green-700',
      [AuditResult.APPROVED_WITH_OBSERVATIONS]: 'bg-yellow-100 text-yellow-700',
      [AuditResult.REJECTED]: 'bg-red-100 text-red-700',
      [AuditResult.PENDING]: 'bg-blue-100 text-blue-700',
    };
    return colors[result];
  };

  const getResultLabel = (result: AuditResult) => {
    const labels = {
      [AuditResult.APPROVED]: 'Aprobado',
      [AuditResult.APPROVED_WITH_OBSERVATIONS]: 'Con Observaciones',
      [AuditResult.REJECTED]: 'Rechazado',
      [AuditResult.PENDING]: 'Pendiente',
    };
    return labels[result];
  };

  const getResultIcon = (result: AuditResult) => {
    const icons = {
      [AuditResult.APPROVED]: <CheckCircle className="h-4 w-4" />,
      [AuditResult.APPROVED_WITH_OBSERVATIONS]: <AlertTriangle className="h-4 w-4" />,
      [AuditResult.REJECTED]: <XCircle className="h-4 w-4" />,
      [AuditResult.PENDING]: <Clock className="h-4 w-4" />,
    };
    return icons[result];
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar esta auditoría?')) {
      deleteAudit.mutate(id);
    }
  };

  const handleComplete = (id: string) => {
    const completionDate = prompt('Fecha de completación (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (completionDate) {
      completeAudit.mutate({ id, completionDate });
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
            <p className="text-gray-600">Error al cargar auditorías</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Auditorías</h1>
            <p className="text-gray-600 mt-1">Gestión de auditorías y cumplimiento</p>
          </div>
          <FileCheck className="h-12 w-12 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Auditorías</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_audits || 0}</p>
              </div>
              <FileCheck className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Aprobadas</p>
                <p className="text-3xl font-bold mt-1">{stats?.approved || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Con Observaciones</p>
                <p className="text-3xl font-bold mt-1">{stats?.with_observations || 0}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Acciones Abiertas</p>
                <p className="text-3xl font-bold mt-1">{stats?.open_actions || 0}</p>
              </div>
              <Clock className="h-12 w-12 text-red-200" />
            </div>
          </div>
        </div>

        {stats?.average_score !== undefined && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Calificación Promedio</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.average_score.toFixed(1)} / 100</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-600">Basado en {stats.total_audits} auditorías</p>
              </div>
            </div>
          </div>
        )}

        {openActions.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">
                <strong>{openActions.length}</strong> {openActions.length === 1 ? 'acción correctiva pendiente' : 'acciones correctivas pendientes'}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por auditor o hallazgos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value={AuditType.INTERNAL}>Interna</option>
                <option value={AuditType.EXTERNAL}>Externa</option>
                <option value={AuditType.SANITARY}>Sanitaria</option>
                <option value={AuditType.FIRE_SAFETY}>Protección Civil</option>
                <option value={AuditType.TAX}>Fiscal</option>
                <option value={AuditType.LABOR}>Laboral</option>
                <option value={AuditType.ENVIRONMENTAL}>Ambiental</option>
                <option value={AuditType.FOOD_SAFETY}>Seguridad Alimentaria</option>
              </select>
              <select
                value={filterResult}
                onChange={(e) => setFilterResult(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los resultados</option>
                <option value={AuditResult.APPROVED}>Aprobado</option>
                <option value={AuditResult.APPROVED_WITH_OBSERVATIONS}>Con Observaciones</option>
                <option value={AuditResult.REJECTED}>Rechazado</option>
                <option value={AuditResult.PENDING}>Pendiente</option>
              </select>
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={showOpenOnly}
                  onChange={(e) => setShowOpenOnly(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700">Solo abiertas</span>
              </label>
            </div>
          </div>
        </div>

        {filteredAudits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay auditorías</h3>
            <p className="text-gray-600">{searchTerm ? 'No se encontraron resultados' : 'Comienza registrando una auditoría'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredAudits.map((audit) => (
              <div key={audit.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">{getTypeLabel(audit.type)}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${getResultColor(audit.result)}`}>
                        {getResultIcon(audit.result)}
                        {getResultLabel(audit.result)}
                      </span>
                      {audit.is_completed && (
                        <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Completada
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Auditor:</strong> {audit.auditor_name}{audit.auditor_organization && ` (${audit.auditor_organization})`}</p>
                      <p><strong>Fecha:</strong> {new Date(audit.audit_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!audit.is_completed && (
                      <button
                        onClick={() => handleComplete(audit.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Marcar como completada"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(audit.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {audit.score !== undefined && audit.score !== null && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Calificación</p>
                      <p className={`text-lg font-semibold ${audit.score >= 80 ? 'text-green-600' : audit.score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {audit.score} / 100
                      </p>
                    </div>
                  )}
                  {audit.completion_deadline && (
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Fecha Límite</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(audit.completion_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {audit.completion_date && (
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-green-600 mb-1">Completada</p>
                      <p className="text-sm font-semibold text-green-900">
                        {new Date(audit.completion_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <p className="text-sm font-medium text-red-900">Hallazgos</p>
                    </div>
                    <p className="text-sm text-red-800 whitespace-pre-wrap">{audit.findings}</p>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-900">Acciones Correctivas</p>
                    </div>
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{audit.corrective_actions}</p>
                  </div>
                </div>

                {audit.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{audit.notes}</p>
                  </div>
                )}

                {audit.documents_url && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href={audit.documents_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <FileText className="h-4 w-4" />
                      Ver documentación
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">💡 <strong>Gestión de Auditorías:</strong> Registra todas las auditorías internas y externas. Documenta hallazgos y acciones correctivas para mantener el cumplimiento normativo.</p>
        </div>
      </div>
    </MainLayout>
  );
}