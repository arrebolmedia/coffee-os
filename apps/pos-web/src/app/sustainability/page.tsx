'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Leaf, Search, Filter, Trash2, AlertTriangle, Loader2, TrendingDown, TrendingUp, Recycle, Package } from 'lucide-react';
import { useWasteLogs, useWasteStats, useDeleteWasteLog } from '@/hooks/use-waste';
import { WasteCategory, WasteReason, DisposalMethod } from '@/types';

export default function SustainabilityPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');

  const { data: wasteLogs = [], isLoading, error } = useWasteLogs();
  const { data: stats } = useWasteStats();
  const deleteWasteLog = useDeleteWasteLog();

  const filteredLogs = wasteLogs.filter((log) => {
    const matchesSearch = !searchTerm || 
      log.item_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    const matchesReason = filterReason === 'all' || log.reason === filterReason;
    
    return matchesSearch && matchesCategory && matchesReason;
  });

  const getCategoryLabel = (category: WasteCategory) => {
    const labels = {
      [WasteCategory.FOOD]: 'Alimento',
      [WasteCategory.BEVERAGE]: 'Bebida',
      [WasteCategory.PACKAGING]: 'Empaque',
      [WasteCategory.PAPER]: 'Papel',
      [WasteCategory.PLASTIC]: 'Plástico',
      [WasteCategory.GLASS]: 'Vidrio',
      [WasteCategory.METAL]: 'Metal',
      [WasteCategory.ORGANIC]: 'Orgánico',
      [WasteCategory.HAZARDOUS]: 'Peligroso',
      [WasteCategory.OTHER]: 'Otro',
    };
    return labels[category];
  };

  const getReasonLabel = (reason: WasteReason) => {
    const labels = {
      [WasteReason.EXPIRED]: 'Vencido',
      [WasteReason.DAMAGED]: 'Dañado',
      [WasteReason.OVERPRODUCTION]: 'Sobreproducción',
      [WasteReason.SPILLAGE]: 'Derrame',
      [WasteReason.CUSTOMER_RETURN]: 'Devolución',
      [WasteReason.QUALITY_ISSUE]: 'Calidad',
      [WasteReason.PREPARATION_ERROR]: 'Error Prep',
      [WasteReason.EQUIPMENT_FAILURE]: 'Falla Equipo',
      [WasteReason.OTHER]: 'Otro',
    };
    return labels[reason];
  };

  const getDisposalLabel = (method: DisposalMethod) => {
    const labels = {
      [DisposalMethod.TRASH]: 'Basura',
      [DisposalMethod.RECYCLING]: 'Reciclaje',
      [DisposalMethod.COMPOST]: 'Composta',
      [DisposalMethod.DONATION]: 'Donación',
      [DisposalMethod.BIODIGESTER]: 'Biodigestor',
      [DisposalMethod.INCINERATION]: 'Incineración',
      [DisposalMethod.SPECIAL_HANDLING]: 'Manejo Especial',
    };
    return labels[method];
  };

  const getDisposalColor = (method: DisposalMethod) => {
    const colors = {
      [DisposalMethod.TRASH]: 'bg-gray-100 text-gray-700',
      [DisposalMethod.RECYCLING]: 'bg-green-100 text-green-700',
      [DisposalMethod.COMPOST]: 'bg-green-100 text-green-700',
      [DisposalMethod.DONATION]: 'bg-blue-100 text-blue-700',
      [DisposalMethod.BIODIGESTER]: 'bg-green-100 text-green-700',
      [DisposalMethod.INCINERATION]: 'bg-red-100 text-red-700',
      [DisposalMethod.SPECIAL_HANDLING]: 'bg-yellow-100 text-yellow-700',
    };
    return colors[method];
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este registro de desperdicio?')) {
      deleteWasteLog.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
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
            <p className="text-gray-600">Error al cargar datos de sostenibilidad</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Sostenibilidad & Desperdicio</h1>
            <p className="text-gray-600 mt-1">Gestión de residuos y métricas eco-friendly</p>
          </div>
          <Leaf className="h-12 w-12 text-green-600" />
        </div>

        {/* Stats Cards */}
        {stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Registros</p>
                    <p className="text-3xl font-bold mt-1">{stats.total_logs}</p>
                  </div>
                  <Package className="h-12 w-12 text-red-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Costo Total</p>
                    <p className="text-3xl font-bold mt-1">${(stats.total_cost / 1000).toFixed(1)}k</p>
                  </div>
                  <TrendingDown className="h-12 w-12 text-orange-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Peso Total</p>
                    <p className="text-3xl font-bold mt-1">{stats.total_weight_kg.toFixed(1)} kg</p>
                  </div>
                  <Package className="h-12 w-12 text-purple-200" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Promedio Diario</p>
                    <p className="text-3xl font-bold mt-1">{stats.trends.daily_average.toFixed(1)} kg</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-200" />
                </div>
              </div>
            </div>

            {/* Top Items */}
            {stats.top_items && stats.top_items.length > 0 && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                  <p className="text-sm font-semibold text-yellow-800">Items con Mayor Desperdicio</p>
                </div>
                <div className="space-y-1">
                  {stats.top_items.slice(0, 3).map((item, index) => (
                    <p key={index} className="text-sm text-yellow-700">
                      {index + 1}. {item.item_name} - {item.quantity} unidades (${item.cost.toFixed(2)})
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Buscar por producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todas las categorías</option>
                <option value={WasteCategory.FOOD}>Alimento</option>
                <option value={WasteCategory.BEVERAGE}>Bebida</option>
                <option value={WasteCategory.PACKAGING}>Empaque</option>
                <option value={WasteCategory.PAPER}>Papel</option>
                <option value={WasteCategory.PLASTIC}>Plástico</option>
                <option value={WasteCategory.GLASS}>Vidrio</option>
                <option value={WasteCategory.ORGANIC}>Orgánico</option>
              </select>
              <select
                value={filterReason}
                onChange={(e) => setFilterReason(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">Todas las razones</option>
                <option value={WasteReason.EXPIRED}>Vencido</option>
                <option value={WasteReason.DAMAGED}>Dañado</option>
                <option value={WasteReason.OVERPRODUCTION}>Sobreproducción</option>
                <option value={WasteReason.SPILLAGE}>Derrame</option>
                <option value={WasteReason.QUALITY_ISSUE}>Problema de Calidad</option>
              </select>
            </div>
          </div>
        </div>

        {/* Waste Logs */}
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Leaf className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay registros</h3>
            <p className="text-gray-600">{searchTerm ? 'No se encontraron resultados' : 'Comienza registrando desperdicios'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Package className="h-5 w-5 text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900">{log.item_name}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {getCategoryLabel(log.category)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getDisposalColor(log.disposal_method)}`}>
                        {getDisposalLabel(log.disposal_method)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600">Cantidad</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {log.quantity} {log.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Razón</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {getReasonLabel(log.reason)}
                        </p>
                      </div>
                      {log.total_cost && (
                        <div>
                          <p className="text-xs text-gray-600">Costo</p>
                          <p className="text-sm font-semibold text-red-600">
                            ${log.total_cost.toFixed(2)}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Fecha</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {new Date(log.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {log.notes && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">{log.notes}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">🌱 <strong>Sostenibilidad:</strong> Registra y monitorea los desperdicios para reducir el impacto ambiental. Recicla, composta y dona cuando sea posible para minimizar residuos.</p>
        </div>
      </div>
    </MainLayout>
  );
}