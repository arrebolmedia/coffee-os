'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FileCheck, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, FileText, RefreshCw, Trash2, Loader2, Building } from 'lucide-react';
import { usePermits, usePermitStats, useDeletePermit, useRenewPermit } from '@/hooks/use-permits';
import { PermitType, PermitStatus } from '@/types';

export default function PermitsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState<string>('all');

  const { data: permits = [], isLoading, error } = usePermits();
  const { data: stats } = usePermitStats();
  const deletePermit = useDeletePermit();
  const renewPermit = useRenewPermit();

  const filteredPermits = permits.filter((permit) => {
    const matchesSearch = !searchTerm || 
      permit.permit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permit.issuing_authority.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || permit.location_id === filterLocation;
    
    return matchesSearch && matchesLocation;
  });

  const getStatusColor = (status: PermitStatus) => {
    const colors = {
      [PermitStatus.ACTIVE]: 'bg-green-100 text-green-700',
      [PermitStatus.RENEWAL_DUE]: 'bg-yellow-100 text-yellow-700',
      [PermitStatus.EXPIRED]: 'bg-red-100 text-red-700',
      [PermitStatus.PENDING]: 'bg-blue-100 text-blue-700',
      [PermitStatus.CANCELLED]: 'bg-gray-100 text-gray-700',
    };
    return colors[status];
  };

  const getStatusLabel = (status: PermitStatus) => {
    const labels = {
      [PermitStatus.ACTIVE]: 'Vigente',
      [PermitStatus.RENEWAL_DUE]: 'Por Renovar',
      [PermitStatus.EXPIRED]: 'Vencido',
      [PermitStatus.PENDING]: 'En Trámite',
      [PermitStatus.CANCELLED]: 'Cancelado',
    };
    return labels[status];
  };

  const getTypeLabel = (type: PermitType) => {
    const labels = {
      [PermitType.USO_SUELO]: 'Uso de Suelo',
      [PermitType.FUNCIONAMIENTO]: 'Funcionamiento',
      [PermitType.PROTECCION_CIVIL]: 'Protección Civil',
      [PermitType.ANUNCIO]: 'Anuncio',
      [PermitType.SALUBRIDAD]: 'Salubridad',
      [PermitType.BOMBEROS]: 'Bomberos',
      [PermitType.ECOLOGIA]: 'Ecología',
      [PermitType.ALCOHOL]: 'Venta de Alcohol',
      [PermitType.IMSS]: 'IMSS',
      [PermitType.SAT]: 'SAT',
      [PermitType.INFONAVIT]: 'INFONAVIT',
      [PermitType.STPS]: 'STPS',
      [PermitType.OTHER]: 'Otro',
    };
    return labels[type];
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este permiso?')) {
      deletePermit.mutate(id);
    }
  };

  const handleRenew = (id: string) => {
    const newExpiry = prompt('Nueva fecha de vencimiento (YYYY-MM-DD):');
    if (newExpiry) {
      renewPermit.mutate({ id, expiryDate: newExpiry });
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
            <p className="text-gray-600">Error al cargar permisos</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Permisos y Licencias</h1>
            <p className="text-gray-600 mt-1">Gestión de compliance legal</p>
          </div>
          <FileCheck className="h-12 w-12 text-blue-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Permisos</p>
                <p className="text-3xl font-bold mt-1">{stats?.total_permits || 0}</p>
              </div>
              <FileCheck className="h-12 w-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Vigentes</p>
                <p className="text-3xl font-bold mt-1">{stats?.active || 0}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Por Renovar</p>
                <p className="text-3xl font-bold mt-1">{stats?.renewal_due || 0}</p>
              </div>
              <Clock className="h-12 w-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Vencidos</p>
                <p className="text-3xl font-bold mt-1">{stats?.expired || 0}</p>
              </div>
              <AlertTriangle className="h-12 w-12 text-red-200" />
            </div>
          </div>
        </div>

        {stats?.expiring_soon && stats.expiring_soon > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                <strong>{stats.expiring_soon}</strong> permisos vencen en los próximos 30 días
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
                placeholder="Buscar por folio o autoridad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todas las ubicaciones</option>
              </select>
            </div>
          </div>
        </div>

        {filteredPermits.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay permisos</h3>
            <p className="text-gray-600">{searchTerm ? 'No se encontraron resultados' : 'Comienza registrando un permiso'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredPermits.map((permit) => (
              <div key={permit.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">{getTypeLabel(permit.type)}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(permit.status)}`}>
                        {getStatusLabel(permit.status)}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Folio:</strong> {permit.permit_number}</p>
                      <p><strong>Autoridad Emisora:</strong> {permit.issuing_authority}</p>
                      {permit.responsible_person && (
                        <p><strong>Responsable:</strong> {permit.responsible_person}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRenew(permit.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Renovar"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(permit.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Emisión</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(permit.issue_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Vencimiento</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(permit.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                    <p className={`text-sm font-semibold ${permit.days_until_expiry && permit.days_until_expiry < 30 ? 'text-red-600' : 'text-gray-900'}`}>
                      {permit.days_until_expiry || 0}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Costo</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {permit.cost ? `$${permit.cost.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                </div>

                {permit.is_expiring_soon && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200 mb-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-700">Este permiso vence pronto</p>
                  </div>
                )}

                {permit.last_renewal_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <Calendar className="h-4 w-4" />
                    <span>Última renovación: {new Date(permit.last_renewal_date).toLocaleDateString()}</span>
                    {permit.renewal_cost && <span className="ml-2">- Costo: ${permit.renewal_cost.toLocaleString()}</span>}
                  </div>
                )}

                {permit.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-1">Notas:</p>
                    <p className="text-sm text-gray-600">{permit.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">📋 <strong>Compliance Legal:</strong> Gestiona todos los permisos y licencias requeridos para operación legal. Recibe alertas 30 días antes del vencimiento.</p>
        </div>
      </div>
    </MainLayout>
  );
}