'use client';

/**
 * Control de Calidad — conectado SOLO a los endpoints reales del backend:
 * /quality/checklists y /quality/temperature-logs(+/alerts).
 *
 * Las secciones de plantillas/ejecuciones, NOM-251 y acciones correctivas
 * muestran un empty-state claro porque su backend aún no existe.
 */

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TemperaturaModal } from '@/components/quality/TemperaturaModal';
import { ChecklistModal } from '@/components/quality/ChecklistModal';
import {
  useChecklists,
  useTemperatureAlerts,
  useTemperatureLogs,
} from '@/hooks/use-quality-control';
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Construction,
  Loader2,
  Shield,
  Thermometer,
} from 'lucide-react';

const TEMPERATURE_TYPE_LABELS: Record<string, string> = {
  REFRIGERATOR: 'Refrigerador',
  FREEZER: 'Congelador',
  HOT_HOLDING: 'Mantenimiento caliente',
  COLD_HOLDING: 'Mantenimiento frío',
  COOKING: 'Cocción',
  COOLING: 'Enfriamiento',
  RECEIVING: 'Recepción',
};

export default function QualityPage() {
  const [registrandoTemperatura, setRegistrandoTemperatura] = useState(false);
  const [creandoChecklist, setCreandoChecklist] = useState(false);
  const { data: checklists, isLoading: checklistsLoading } = useChecklists();
  const { data: temperatureLogs, isLoading: tempLoading } =
    useTemperatureLogs();
  const { data: temperatureAlerts } = useTemperatureAlerts();

  const isLoading = checklistsLoading || tempLoading;

  const checklistList = checklists || [];
  const logs = temperatureLogs || [];
  const alerts = temperatureAlerts || [];

  // La compuerta de carga no puede tragarse un diálogo abierto: el `return`
  // temprano sustituye la página entera —modales incluidos—, así que una
  // consulta de fondo que vuelve a cargar mientras el usuario escribe desmonta
  // el formulario y borra lo tecleado. Con un diálogo abierto se sigue de largo.
  const hayDialogoAbierto = creandoChecklist || registrandoTemperatura;

  if (isLoading && !hayDialogoAbierto) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  const stats = {
    totalChecklists: checklistList.length,
    completedChecklists: checklistList.filter((c) => c.completed).length,
    totalTempLogs: logs.length,
    outOfRange: logs.filter((l) => !l.is_within_range).length,
    activeAlerts: alerts.length,
  };

  const recentLogs = [...logs]
    .sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
    )
    .slice(0, 10);

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-indigo-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Control de Calidad
                </h1>
                <p className="text-sm text-gray-500">
                  Checklists y monitoreo de temperatura
                </p>
              </div>
            </div>
            {/* La pantalla listaba los checklists y no habia forma de crear
                uno: el hook existia y no lo llamaba nadie. */}
            <button
              type="button"
              onClick={() => setCreandoChecklist(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Nuevo checklist
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats reales (checklists + temperatura) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Checklists</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.totalChecklists}
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
                    {stats.completedChecklists}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Registros de Temperatura
                  </p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {stats.totalTempLogs}
                  </p>
                </div>
                <Thermometer className="w-8 h-8 text-indigo-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Fuera de Rango</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.outOfRange}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Alertas de temperatura activas */}
          {alerts.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">
                  <strong>{alerts.length}</strong>{' '}
                  {alerts.length === 1
                    ? 'alerta de temperatura activa'
                    : 'alertas de temperatura activas'}
                </p>
              </div>
            </div>
          )}

          {/* Registros de temperatura recientes (backend real) */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            {/* La pantalla leía los registros pero no había forma de crear
                uno: el hook existía y no lo llamaba nadie. La NOM-251 exige
                llevar el control, así que sin este botón simplemente no se
                llevaba. */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Registros de Temperatura Recientes
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setRegistrandoTemperatura(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                Registrar temperatura
              </button>
            </div>
            {recentLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Thermometer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay registros de temperatura</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Equipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temperatura
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.equipment_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {TEMPERATURE_TYPE_LABELS[log.type] || log.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {log.temperature}°
                        {log.unit === 'FAHRENHEIT' ? 'F' : 'C'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(log.recorded_at).toLocaleString('es-MX')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.is_within_range
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {log.is_within_range ? 'En rango' : 'Fuera de rango'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Secciones sin backend: empty-state claro */}
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Construction className="w-16 h-16 mx-auto mb-4 text-amber-500" />
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Módulo en construcción
            </h3>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              El backend de plantillas y ejecuciones de checklist, reportes de
              cumplimiento NOM-251 y acciones correctivas aún no existe. Estas
              secciones se habilitarán cuando la API los implemente.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <div className="p-4 bg-gray-50 rounded-lg">
                <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-gray-500">
                  Plantillas y Ejecuciones
                </p>
                <p className="text-sm text-gray-400 mt-1">Próximamente</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-gray-500">Reportes NOM-251</p>
                <p className="text-sm text-gray-400 mt-1">Próximamente</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-semibold text-gray-500">
                  Acciones Correctivas
                </p>
                <p className="text-sm text-gray-400 mt-1">Próximamente</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChecklistModal
        abierto={creandoChecklist}
        onClose={() => setCreandoChecklist(false)}
      />

      <TemperaturaModal
        abierto={registrandoTemperatura}
        onClose={() => setRegistrandoTemperatura(false)}
      />
    </MainLayout>
  );
}
