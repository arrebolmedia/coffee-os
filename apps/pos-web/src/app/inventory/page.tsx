/**
 * CoffeeOS - Inventory Module
 * Gestión completa de inventario con alertas y control de stock
 */

'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useInventory,
  useInventoryStats,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
} from '@/hooks/use-inventory';
import {
  useOrganizationTheoreticalStock,
  useCreateReconciliation,
  useStockStatus,
} from '@/hooks/use-inventory-automation';
import { useAuth } from '@/hooks/use-auth';
import { InventoryItemModal } from '@/components/inventory/InventoryItemModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  Package,
  Search,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Filter,
  Download,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Scale,
} from 'lucide-react';

interface InventoryItemDisplay {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  unit: string;
  minStock: number;
  maxStock: number;
  cost: number;
  lastUpdated: string;
  status: 'ok' | 'low' | 'critical' | 'overstock';
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [selectedItemForReconciliation, setSelectedItemForReconciliation] =
    useState<any>(null);
  const [physicalCount, setPhysicalCount] = useState('');
  const [reconciliationReason, setReconciliationReason] = useState('');
  const [reconciliationNotes, setReconciliationNotes] = useState('');

  // Manager state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const { user } = useAuth();

  // Obtener datos del backend
  const { data: inventoryData, isLoading, error } = useInventory();
  const { data: stats } = useInventoryStats();

  // Mutations para CRUD
  const createMutation = useCreateInventoryItem();
  const updateMutation = useUpdateInventoryItem();
  const deleteMutation = useDeleteInventoryItem();

  // Obtener stock teórico vs físico
  const { data: theoreticalStockData, isLoading: loadingTheoretical } =
    useOrganizationTheoreticalStock(
      user?.organizationId || '',
      { show_discrepancies_only: false },
      !!user?.organizationId,
    );

  // Mutation para reconciliación
  const reconciliationMutation = useCreateReconciliation();

  // Transformar datos del backend al formato de display
  const inventoryItems: InventoryItemDisplay[] = useMemo(() => {
    if (!inventoryData) return [];

    return inventoryData.map((item) => {
      const stock = item.current_stock || 0;
      const minStock = item.min_stock || 0;
      const maxStock = item.max_stock || 100;

      let status: 'ok' | 'low' | 'critical' | 'overstock' = 'ok';
      if (stock === 0) {
        status = 'critical';
      } else if (stock <= minStock * 0.5) {
        status = 'critical';
      } else if (stock <= minStock) {
        status = 'low';
      } else if (stock > maxStock) {
        status = 'overstock';
      }

      return {
        id: item.id,
        name: item.product?.name || 'Sin nombre',
        sku: item.product?.sku || 'N/A',
        category: item.product?.category?.name || 'Sin categoría',
        stock,
        unit: 'unidades',
        minStock,
        maxStock,
        cost: item.unit_cost || 0,
        lastUpdated: item.updated_at?.toString() || new Date().toISOString(),
        status,
      };
    });
  }, [inventoryData]);

  const categories = [
    'all',
    ...Array.from(new Set(inventoryItems.map((item) => item.category))),
  ];

  const filteredItems = useMemo(() => {
    return inventoryItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        filterCategory === 'all' || item.category === filterCategory;
      const matchesStatus =
        filterStatus === 'all' || item.status === filterStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [searchQuery, filterCategory, filterStatus, inventoryItems]);

  // Calcular stats locales basados en inventoryItems
  const localStats = useMemo(
    () => ({
      totalItems: inventoryItems.length,
      critical: inventoryItems.filter((i) => i.status === 'critical').length,
      low: inventoryItems.filter((i) => i.status === 'low').length,
      ok: inventoryItems.filter((i) => i.status === 'ok').length,
      overstock: inventoryItems.filter((i) => i.status === 'overstock').length,
    }),
    [inventoryItems],
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'ok':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'overstock':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical':
      case 'low':
        return <TrendingDown className="w-4 h-4" />;
      case 'overstock':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  // Handlers para CRUD
  const handleSaveItem = async (item: any) => {
    try {
      if (item.id) {
        await updateMutation.mutateAsync({ id: item.id, data: item });
      } else {
        await createMutation.mutateAsync(item);
      }
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving inventory item:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      try {
        await deleteMutation.mutateAsync(itemToDelete.id);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
      } catch (error) {
        console.error('Error deleting inventory item:', error);
      }
    }
  };

  return (
    <MainLayout>
      {isLoading ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Cargando inventario...</p>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center text-red-600">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>Error al cargar inventario</p>
          </div>
        </div>
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-8 h-8 text-blue-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                      Inventario
                    </h1>
                    <p className="text-sm text-gray-500">
                      Gestión y control de stock
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Exportar</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(null);
                      setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Producto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Productos</p>
                    <p className="text-2xl font-bold text-gray-800">
                      {localStats.totalItems}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Crítico</p>
                    <p className="text-2xl font-bold text-red-600">
                      {localStats.critical}
                    </p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Stock Bajo</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {localStats.low}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Normal</p>
                    <p className="text-2xl font-bold text-green-600">
                      {localStats.ok}
                    </p>
                  </div>
                  <Package className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Sobrestockeado</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {localStats.overstock}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Stock Reconciliation Widget */}
            {theoreticalStockData && theoreticalStockData.length > 0 && (
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Scale className="w-6 h-6 text-purple-600" />
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        Conciliación de Stock
                      </h2>
                      <p className="text-sm text-gray-500">
                        Stock teórico vs físico - Discrepancias detectadas
                      </p>
                    </div>
                  </div>
                  {loadingTheoretical && (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  )}
                </div>

                <div className="p-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">
                        Items Rastreados
                      </p>
                      <p className="text-2xl font-bold text-gray-800">
                        {theoreticalStockData.length}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Precisos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {
                          theoreticalStockData.filter(
                            (item) => Math.abs(item.discrepancy_percentage) < 2,
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">
                        Con Discrepancia
                      </p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {
                          theoreticalStockData.filter(
                            (item) =>
                              Math.abs(item.discrepancy_percentage) >= 5,
                          ).length
                        }
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600 mb-1">Críticos</p>
                      <p className="text-2xl font-bold text-red-600">
                        {
                          theoreticalStockData.filter(
                            (item) =>
                              Math.abs(item.discrepancy_percentage) >= 10,
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  {/* Items with Discrepancies Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Producto
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Stock Físico
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Stock Teórico
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Discrepancia
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                            Acción
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {theoreticalStockData
                          .filter(
                            (item) =>
                              Math.abs(item.discrepancy_percentage) >= 5,
                          )
                          .slice(0, 10)
                          .map((item) => {
                            const discrepancy = Math.abs(
                              item.discrepancy_percentage,
                            );
                            let statusColor = 'text-green-600 bg-green-50';
                            let statusText = 'Preciso';
                            let statusIcon = (
                              <CheckCircle className="w-4 h-4" />
                            );

                            if (discrepancy >= 10) {
                              statusColor = 'text-red-600 bg-red-50';
                              statusText = 'Crítico';
                              statusIcon = <XCircle className="w-4 h-4" />;
                            } else if (discrepancy >= 5) {
                              statusColor = 'text-yellow-600 bg-yellow-50';
                              statusText = 'Alerta';
                              statusIcon = <AlertCircle className="w-4 h-4" />;
                            }

                            return (
                              <tr
                                key={item.inventory_item_id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">
                                    {item.inventory_item_name}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="font-semibold text-gray-900">
                                    {item.physical_stock}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-gray-600">
                                    {item.theoretical_stock.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span
                                      className={`font-semibold ${item.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                      {item.discrepancy > 0 ? '+' : ''}
                                      {item.discrepancy.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({item.discrepancy_percentage.toFixed(1)}
                                      %)
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center">
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                    >
                                      {statusIcon}
                                      {statusText}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => {
                                      setSelectedItemForReconciliation(item);
                                      setPhysicalCount(
                                        item.physical_stock.toString(),
                                      );
                                      setShowReconciliationModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Ajustar
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {theoreticalStockData.filter(
                    (item) => Math.abs(item.discrepancy_percentage) >= 5,
                  ).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <p className="font-medium">
                        ¡Excelente! No hay discrepancias significativas
                      </p>
                      <p className="text-sm mt-1">
                        Todo el inventario está sincronizado
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'Todas las categorías' : cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="critical">Crítico</option>
                    <option value="low">Stock Bajo</option>
                    <option value="ok">Normal</option>
                    <option value="overstock">Sobrestockeado</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rango
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Costo Unit.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.sku}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {item.stock} {item.unit}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          Min: {item.minStock} / Max: {item.maxStock}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${
                              item.status === 'critical'
                                ? 'bg-red-500'
                                : item.status === 'low'
                                  ? 'bg-yellow-500'
                                  : item.status === 'overstock'
                                    ? 'bg-blue-500'
                                    : 'bg-green-500'
                            }`}
                            style={{
                              width: `${Math.min((item.stock / item.maxStock) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          ${item.cost.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}
                        >
                          {getStatusIcon(item.status)}
                          {item.status === 'critical'
                            ? 'Crítico'
                            : item.status === 'low'
                              ? 'Bajo'
                              : item.status === 'overstock'
                                ? 'Sobrestockeado'
                                : 'Normal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setIsModalOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 p-1 hover:bg-blue-50 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron productos</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reconciliation Modal */}
      {showReconciliationModal && selectedItemForReconciliation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">
                  Conciliar Stock
                </h3>
                <button
                  onClick={() => {
                    setShowReconciliationModal(false);
                    setSelectedItemForReconciliation(null);
                    setPhysicalCount('');
                    setReconciliationReason('');
                    setReconciliationNotes('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Item Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Producto:</p>
                <p className="font-semibold text-gray-900">
                  {selectedItemForReconciliation.inventory_item_name}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Stock Físico</p>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedItemForReconciliation.physical_stock}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Stock Teórico</p>
                    <p className="text-lg font-bold text-gray-600">
                      {selectedItemForReconciliation.theoretical_stock.toFixed(
                        2,
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-500">Discrepancia</p>
                  <p
                    className={`text-lg font-bold ${selectedItemForReconciliation.discrepancy > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {selectedItemForReconciliation.discrepancy > 0 ? '+' : ''}
                    {selectedItemForReconciliation.discrepancy.toFixed(2)} (
                    {selectedItemForReconciliation.discrepancy_percentage.toFixed(
                      1,
                    )}
                    %)
                  </p>
                </div>
              </div>

              {/* Physical Count Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conteo Físico Real
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={physicalCount}
                  onChange={(e) => setPhysicalCount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Cantidad contada"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de Discrepancia
                </label>
                <select
                  value={reconciliationReason}
                  onChange={(e) => setReconciliationReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Seleccionar motivo...</option>
                  <option value="conteo_fisico">Conteo físico</option>
                  <option value="merma">Merma o desperdicio</option>
                  <option value="robo">Robo o pérdida</option>
                  <option value="error_sistema">Error del sistema</option>
                  <option value="vencimiento">Producto vencido</option>
                  <option value="devolucion">Devolución proveedor</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (Opcional)
                </label>
                <textarea
                  value={reconciliationNotes}
                  onChange={(e) => setReconciliationNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Detalles adicionales..."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowReconciliationModal(false);
                  setSelectedItemForReconciliation(null);
                  setPhysicalCount('');
                  setReconciliationReason('');
                  setReconciliationNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!physicalCount || !reconciliationReason) {
                    alert('Por favor completa todos los campos requeridos');
                    return;
                  }

                  await reconciliationMutation.mutateAsync({
                    inventory_item_id:
                      selectedItemForReconciliation.inventory_item_id,
                    physical_count: parseFloat(physicalCount),
                    reason: reconciliationReason,
                    notes: reconciliationNotes,
                    performed_by: user?.id || 'system',
                  });

                  setShowReconciliationModal(false);
                  setSelectedItemForReconciliation(null);
                  setPhysicalCount('');
                  setReconciliationReason('');
                  setReconciliationNotes('');
                }}
                disabled={
                  !physicalCount ||
                  !reconciliationReason ||
                  reconciliationMutation.isPending
                }
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {reconciliationMutation.isPending
                  ? 'Guardando...'
                  : 'Conciliar Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modals */}
      <InventoryItemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleSaveItem}
        item={selectedItem}
        isLoading={createMutation.isPending || updateMutation.isPending}
        organizationId={user?.organizationId || 'cml9tug36000312cbnrwcbbzt'}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Producto"
        message={`¿Estás seguro de que deseas eliminar "${itemToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </MainLayout>
  );
}
