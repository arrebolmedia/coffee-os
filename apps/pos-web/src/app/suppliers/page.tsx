/**
 * CoffeeOS - Suppliers Module
 * Gestión completa de proveedores y contactos
 */

'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useSuppliers,
  useSupplierStats,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/hooks/use-suppliers';
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Supplier } from '@/services/suppliers.service';
import {
  Truck,
  Search,
  AlertCircle,
  CheckCircle,
  Star,
  Phone,
  MapPin,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Package,
  DollarSign,
  XCircle,
  Download,
  Filter,
  Eye,
  Mail,
  ArrowUpDown,
} from 'lucide-react';

interface SupplierDisplay {
  id: string;
  name: string;
  businessName: string;
  rfc: string;
  category: string;
  rating: number;
  status: 'active' | 'inactive' | 'pending';
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  paymentTerms: string;
  productsSupplied: string[];
  totalPurchases: number;
}

export default function SuppliersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
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
    category: filterCategory !== 'all' ? filterCategory : undefined,
    status: filterStatus !== 'all' ? filterStatus : undefined,
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
      businessName: supplier.business_name,
      rfc: supplier.rfc || '',
      category: supplier.category,
      rating: supplier.rating,
      status: supplier.status,
      contactName: supplier.contact_name,
      contactEmail: supplier.contact_email || '',
      contactPhone: supplier.contact_phone,
      city: supplier.address_city || '',
      state: supplier.address_state || '',
      paymentTerms: supplier.payment_terms || '',
      productsSupplied: supplier.products_supplied || [],
      totalPurchases: supplier.total_purchases,
    }));
  }, [suppliersData]);

  // Filtrar localmente
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch = searchQuery
        ? supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          supplier.businessName
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
        : true;
      const matchesCategory =
        filterCategory === 'all' || supplier.category === filterCategory;
      const matchesStatus =
        filterStatus === 'all' || supplier.status === filterStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [suppliers, searchQuery, filterCategory, filterStatus]);

  // Stats locales
  const localStats = useMemo(
    () => ({
      total: suppliers.length,
      active: suppliers.filter((s) => s.status === 'active').length,
      pending: suppliers.filter((s) => s.status === 'pending').length,
      inactive: suppliers.filter((s) => s.status === 'inactive').length,
      totalSpent: suppliers.reduce((sum, s) => sum + s.totalPurchases, 0),
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
      business_name: supplier.businessName,
      rfc: supplier.rfc,
      category: supplier.category,
      rating: supplier.rating,
      status: supplier.status,
      contact_name: supplier.contactName,
      contact_email: supplier.contactEmail,
      contact_phone: supplier.contactPhone,
      address_city: supplier.city,
      address_state: supplier.state,
      payment_terms: supplier.paymentTerms,
      products_supplied: supplier.productsSupplied,
      total_purchases: supplier.totalPurchases,
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
      console.error('Error deleting supplier:', error);
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
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
                    {stats?.active_suppliers ?? localStats.active}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.pending_suppliers ?? localStats.pending}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {localStats.inactive}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Comprado</p>
                  <p className="text-2xl font-bold text-blue-600">
                    $
                    {(
                      stats?.total_purchases ?? localStats.totalSpent
                    ).toLocaleString('es-MX')}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
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
                  <option value="all">Todas las categorías</option>
                  <option value="café">Café</option>
                  <option value="lácteos">Lácteos</option>
                  <option value="insumos">Insumos</option>
                  <option value="empaque">Empaque</option>
                  <option value="limpieza">Limpieza</option>
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
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="pending">Pendiente</option>
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
                    RFC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Calificación
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
                        <div className="text-sm text-gray-500">
                          {supplier.businessName}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono">
                        {supplier.rfc || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {supplier.contactName}
                        </div>
                        <div className="text-gray-500 flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" />
                          {supplier.contactPhone}
                        </div>
                        {supplier.contactEmail && (
                          <div className="text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {supplier.contactEmail}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {supplier.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < supplier.rating
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-1">
                          ({supplier.rating})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          supplier.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : supplier.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {supplier.status === 'active'
                          ? 'Activo'
                          : supplier.status === 'pending'
                            ? 'Pendiente'
                            : 'Inactivo'}
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
          message={`¿Estás seguro de que deseas eliminar al proveedor "${supplierToDelete?.name}"? Esta acción no se puede deshacer y eliminará también su historial de compras.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteSupplierMutation.isPending}
        />
      </div>
    </MainLayout>
  );
}
