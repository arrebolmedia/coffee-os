/**
 * CoffeeOS - Customers/CRM Module
 * Gestión de clientes, programa de lealtad y segmentación
 */

'use client';

import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCustomers,
  useCustomerStats,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import { CustomerModal } from '@/components/customers/CustomerModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Customer } from '@/types';
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Gift,
  TrendingUp,
  Calendar,
  Heart,
  Star,
  MessageSquare,
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Eye,
  Award,
  Download,
  Filter,
} from 'lucide-react';

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState<string>('all');
  const [filterLoyalty, setFilterLoyalty] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null,
  );

  // Obtener datos del backend
  const { data: customersData, isLoading, error } = useCustomers();

  // Mutations
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  // Transformar datos del backend para display local
  const customers: Customer[] = useMemo(() => {
    if (!customersData?.data) return [];
    return customersData.data;
  }, [customersData]);

  // Filtrar localmente
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch = searchQuery
        ? customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (customer.phone && customer.phone.includes(searchQuery)) ||
          (customer.email &&
            customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      const matchesSegment =
        filterSegment === 'all' || customer.rfm_segment === filterSegment;

      const matchesLoyalty =
        filterLoyalty === 'all' ||
        (filterLoyalty === 'eligible' && customer.loyalty_points >= 9) ||
        (filterLoyalty === 'active' &&
          customer.loyalty_points > 0 &&
          customer.loyalty_points < 9) ||
        (filterLoyalty === 'none' && customer.loyalty_points === 0);

      return matchesSearch && matchesSegment && matchesLoyalty;
    });
  }, [customers, searchQuery, filterSegment, filterLoyalty]);

  // Stats locales
  const localStats = useMemo(
    () => ({
      total: customers.length,
      vip: customers.filter((c) => c.rfm_segment === 'VIP').length,
      regular: customers.filter((c) => c.rfm_segment === 'Regular').length,
      atRisk: customers.filter((c) => c.rfm_segment === 'At Risk').length,
      newCustomers: customers.filter((c) => c.rfm_segment === 'New').length,
      eligibleRewards: customers.filter((c) => c.loyalty_points >= 9).length,
      withLoyalty: customers.filter((c) => c.loyalty_points > 0).length,
    }),
    [customers],
  );

  const getSegmentBadge = (segment: string | undefined) => {
    if (!segment) return 'bg-gray-100 text-gray-800 border-gray-300';

    const styles = {
      VIP: 'bg-purple-100 text-purple-800 border-purple-300',
      Regular: 'bg-blue-100 text-blue-800 border-blue-300',
      'At Risk': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      New: 'bg-green-100 text-green-800 border-green-300',
    };
    return (
      styles[segment as keyof typeof styles] ||
      'bg-gray-100 text-gray-800 border-gray-300'
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return date.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ============================================================================
  // CRUD HANDLERS
  // ============================================================================

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (data: Partial<Customer>) => {
    if (selectedCustomer) {
      await updateCustomer.mutateAsync({
        id: selectedCustomer.id,
        data,
      });
    } else {
      await createCustomer.mutateAsync(data);
    }
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      setIsDeleteDialogOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
    setCustomerToDelete(null);
  };

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
          <p>Error al cargar clientes</p>
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
                <Users className="w-8 h-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Clientes & CRM
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestión de clientes y programa de lealtad
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Download className="w-4 h-4" />
                  <span>Exportar</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <MessageSquare className="w-4 h-4" />
                  <span>Campaña</span>
                </button>
                <button
                  onClick={handleCreateCustomer}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Cliente</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {localStats.total}
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">VIP</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {localStats.vip}
                  </p>
                </div>
                <Award className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Regulares</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {localStats.regular}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">En Riesgo</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {localStats.atRisk}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Nuevos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {localStats.newCustomers}
                  </p>
                </div>
                <Star className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bebida Gratis</p>
                  <p className="text-2xl font-bold text-pink-600">
                    {localStats.eligibleRewards}
                  </p>
                </div>
                <Gift className="w-8 h-8 text-pink-400" />
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
                  placeholder="Buscar por nombre, teléfono o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Segment Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterSegment}
                  onChange={(e) => setFilterSegment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los segmentos</option>
                  <option value="VIP">VIP</option>
                  <option value="Regular">Regular</option>
                  <option value="At Risk">En Riesgo</option>
                  <option value="New">Nuevos</option>
                </select>
              </div>

              {/* Loyalty Filter */}
              <div className="relative">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filterLoyalty}
                  onChange={(e) => setFilterLoyalty(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none"
                >
                  <option value="all">Todos los puntos</option>
                  <option value="eligible">Bebida gratis (9+)</option>
                  <option value="active">Con puntos (1-8)</option>
                  <option value="none">Sin puntos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Puntos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Compras
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Última Visita
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Segmento
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {customer.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {customer.total_orders}{' '}
                            {customer.total_orders === 1 ? 'compra' : 'compras'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-1 text-gray-900">
                          <Phone className="w-3 h-3" />
                          {customer.phone || 'N/A'}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-gray-500 mt-1">
                            <Mail className="w-3 h-3" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(9)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < customer.loyalty_points
                                  ? 'bg-pink-500'
                                  : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {customer.loyalty_points}/9
                        </span>
                        {customer.loyalty_points >= 9 && (
                          <Gift className="w-4 h-4 text-pink-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          ${customer.total_spent.toLocaleString('es-MX')}
                        </div>
                        <div className="text-gray-500">
                          {customer.total_orders} órdenes
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {formatDate(
                          customer.updated_at?.toString() ||
                            customer.created_at.toString(),
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSegmentBadge(customer.rfm_segment)}`}
                      >
                        {customer.rfm_segment || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-indigo-600 hover:text-indigo-900">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(customer)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No se encontraron clientes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        onSave={handleSaveCustomer}
        customer={selectedCustomer}
      />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Eliminar Cliente"
        message={`¿Estás seguro de que deseas eliminar a ${customerToDelete?.name}? Esta acción no se puede deshacer y se perderán todos los puntos de lealtad.`}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        confirmText="Eliminar"
        cancelText="Cancelar"
        type="danger"
      />
    </MainLayout>
  );
}
