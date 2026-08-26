/**
 * CoffeeOS - Suppliers Module
 * Gestión completa de proveedores y contactos
 */

'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCreateSupplier,
  useDeleteSupplier,
  useSuppliers,
  useSupplierStats,
  useUpdateSupplier,
} from '@/hooks/use-suppliers';
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Supplier } from '@/services/suppliers.service';
import { logger } from '@/lib/logger';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Edit,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';

interface SupplierDisplay {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: number | null;
  active: boolean;
}

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  // Delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] =
    useState<SupplierDisplay | null>(null);

  // Obtener datos del backend
  const {
    data: suppliersData,
    isLoading,
    error,
  } = useSuppliers({
    active: filterStatus !== 'all' ? filterStatus === 'active' : undefined,
    search: searchQuery || undefined,
  });
  const { data: stats } = useSupplierStats();

  // Mutations
  const createSupplierMutation = useCreateSupplier();
  const updateSupplierMutation = useUpdateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Transformar datos del backend al formato de display
  const suppliers: SupplierDisplay[] = useMemo(() => {
    if (!suppliersData) return [];

    return suppliersData.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      contactPerson: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      paymentTerms: supplier.payment_terms || '',
      leadTimeDays: supplier.lead_time_days ?? null,
      active: supplier.active,
    }));
  }, [suppliersData]);

  // Filtrar localmente
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = searchQuery
        ? supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          supplier.contactPerson
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          supplier.email.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' ? supplier.active : !supplier.active);
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, filterStatus]);

  // Stats locales
  const localStats = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((s) => s.active).length,
      inactive: suppliers.filter((s) => !s.active).length,
    }),
    [suppliers],
  );

  // Handlers
  const handleCreate = () => {
    setSelectedSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: SupplierDisplay) => {
    // Convert back to Supplier type
    const supplierData: Supplier = {
      id: supplier.id,
      organization_id: '', // Will be set by mutation
      name: supplier.name,
      contact_person: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      payment_terms: supplier.paymentTerms,
      lead_time_days: supplier.leadTimeDays ?? undefined,
      active: supplier.active,
      created_at: '',
      updated_at: '',
    };
    setSelectedSupplier(supplierData);
    setIsModalOpen(true);
  };

  const handleDelete = (supplier: SupplierDisplay) => {
    setSupplierToDelete(supplier);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteSupplierMutation.mutateAsync(supplierToDelete.id);
      setIsDeleteDialogOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      logger.error('Error deleting supplier:', error);
    }
  };

  const handleSubmit = async (data: any) => {
    if (selectedSupplier) {
      await updateSupplierMutation.mutateAsync({
        id: selectedSupplier.id,
        data,
      });
    } else {
      await createSupplierMutation.mutateAsync(data);
    }
    setIsModalOpen(false);
    setSelectedSupplier(null);
  };

  const isMutating =
    createSupplierMutation.isPending ||
    updateSupplierMutation.isPending ||
    deleteSupplierMutation.isPending;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-screen text-red-600">
          <AlertCircle className="w-12 h-12 mb-4" />
          <p>Error al cargar proveedores</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Truck className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Proveedores
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestión de proveedores y contactos
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Proveedor</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Proveedores</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats?.total_suppliers ?? localStats.total}
                  </p>
                </div>
                <Truck className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.active_count ?? localStats.active}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.inactive_count ?? localStats.inactive}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, contacto o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Términos de Pago
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiempo de Entrega
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
                {filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {supplier.name}
                        </div>
                        {supplier.address && (
                          <div className="text-sm text-gray-500">
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {supplier.contactPerson || '—'}
                        </div>
                        {supplier.phone && (
                          <div className="text-gray-500 flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {supplier.paymentTerms || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {supplier.leadTimeDays != null
                          ? `${supplier.leadTimeDays} días`
                          : '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {supplier.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                          disabled={isMutating}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron proveedores</p>
              </div>
            )}
          </div>
        </div>

        {/* Supplier Form Modal */}
        <SupplierFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSupplier(null);
          }}
          onSubmit={handleSubmit}
          supplier={selectedSupplier}
          isLoading={isMutating}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSupplierToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Eliminar Proveedor"
          message={`¿Estás seguro de que deseas eliminar al proveedor "${supplierToDelete?.name}"? El proveedor quedará marcado como inactivo.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteSupplierMutation.isPending}
        />
      </div>
    </MainLayout>
  );
}
