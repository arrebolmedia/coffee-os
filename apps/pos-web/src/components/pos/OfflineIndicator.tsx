/**
 * CoffeeOS POS Web - Offline Indicator Component
 * Indicador visual del estado de conexión y sincronización
 */

'use client';

import { useOffline } from '@/hooks/use-offline';
import { Wifi, WifiOff, RefreshCw, AlertCircle, Check, Database } from 'lucide-react';
import { useState } from 'react';

export function OfflineIndicator() {
  const {
    isOnline,
    isSyncing,
    syncError,
    syncQueueSize,
    dbStats,
    triggerSync,
  } = useOffline();

  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      {/* Main Indicator */}
      <button
        onClick={() => setShowDetails(true)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
          ${isOnline ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}
        `}
      >
        {isOnline ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        <span className="text-sm font-medium hidden sm:inline">
          {isOnline ? 'En línea' : 'Sin conexión'}
        </span>

        {syncQueueSize > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-red-200 text-red-800 text-xs font-bold rounded-full">
            {syncQueueSize}
          </span>
        )}

        {isSyncing && (
          <RefreshCw className="w-3 h-3 animate-spin" />
        )}
      </button>

      {/* Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Wifi className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <WifiOff className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Estado de Conexión
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isOnline ? 'Conectado al servidor' : 'Modo offline activado'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <span className="text-2xl text-gray-400">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Sync Status */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Estado de Sincronización
                </h3>
                
                {syncError && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900">Error de sincronización</p>
                      <p className="text-xs text-red-700 mt-1">{syncError}</p>
                    </div>
                  </div>
                )}

                {syncQueueSize > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <RefreshCw className={`w-5 h-5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">
                        {syncQueueSize} {syncQueueSize === 1 ? 'elemento' : 'elementos'} pendiente{syncQueueSize === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        {isSyncing ? 'Sincronizando...' : 'Se sincronizarán al reconectar'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Todo sincronizado</p>
                      <p className="text-xs text-green-700 mt-1">No hay cambios pendientes</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Database Stats */}
              {dbStats && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Datos Locales
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Productos" value={dbStats.products} />
                    <StatCard label="Categorías" value={dbStats.categories} />
                    <StatCard label="Modificadores" value={dbStats.modifiers} />
                    <StatCard label="Órdenes" value={dbStats.orders} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Acciones
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      triggerSync();
                      setShowDetails(false);
                    }}
                    disabled={!isOnline || isSyncing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Database className="w-5 h-5 text-blue-600" />
      </div>
      <div>
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
