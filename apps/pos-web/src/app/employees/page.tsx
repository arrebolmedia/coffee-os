/**
 * CoffeeOS - Employees Module
 * Gestión de personal, roles y turnos
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  type Employee as HookEmployee,
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useUpdateEmployee,
} from '@/hooks/use-employees';
import { EmployeeFormData, EmployeeModal } from '@/components/hr/EmployeeModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  Loader2,
  Mail,
  Phone,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';

interface DisplayEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'vacation';
  hireDate: string;
  salary: number;
  location: string;
}

function toDisplay(e: HookEmployee): DisplayEmployee {
  return {
    id: e.id,
    name: `${e.firstName} ${e.lastName}`.trim(),
    email: e.email,
    phone: e.phone,
    role: e.role?.name?.toLowerCase() ?? '',
    status: e.active ? 'active' : 'inactive',
    hireDate: e.hireDate ?? '',
    salary: e.salary ?? 0,
    location: e.locations?.[0]?.name ?? '',
  };
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeFormData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] =
    useState<DisplayEmployee | null>(null);

  // Fetch data
  const { data: employeesData, isLoading, error } = useEmployees();

  // Mutations
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const deleteMutation = useDeleteEmployee();

  // Mock data for roles and locations (replace with actual hooks)
  const roles = [
    { id: '1', name: 'Administrador' },
    { id: '2', name: 'Gerente' },
    { id: '3', name: 'Cajero' },
    { id: '4', name: 'Barista' },
  ];

  const locations = [
    { id: '1', name: 'Sucursal Centro' },
    { id: '2', name: 'Sucursal Norte' },
    { id: '3', name: 'Sucursal Sur' },
  ];

  const employees: DisplayEmployee[] = (employeesData ?? []).map(toDisplay);

  // Handlers
  const handleSave = async (data: EmployeeFormData) => {
    try {
      if (data.id) {
        await updateMutation.mutateAsync({ id: data.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = (employee: DisplayEmployee) => {
    // Convert Employee to EmployeeFormData
    const formData: EmployeeFormData = {
      id: employee.id,
      firstName: employee.name.split(' ')[0] || '',
      lastName: employee.name.split(' ').slice(1).join(' ') || '',
      email: employee.email || '',
      phone: employee.phone || '',
      roleId:
        employee.role === 'admin'
          ? '1'
          : employee.role === 'manager'
            ? '2'
            : employee.role === 'cashier'
              ? '3'
              : '4',
      active: employee.status === 'active',
      position: '',
      department: '',
      hireDate: employee.hireDate,
      salary: employee.salary,
      locationIds: [employee.location],
    };
    setSelectedEmployee(formData);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (employee: DisplayEmployee) => {
    setEmployeeToDelete(employee);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    try {
      await deleteMutation.mutateAsync(employeeToDelete.id);
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-gray-600">Error al cargar empleados</p>
        </div>
      </MainLayout>
    );
  }

  const filteredEmployees = employees.filter((employee) => {
    const query = searchQuery.toLowerCase();
    return (
      employee.name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.phone.toLowerCase().includes(query)
    );
  });

  // Calculate stats
  const statsData = {
    total: employees.length,
    active: employees.filter((e) => e.status === 'active').length,
    vacation: employees.filter((e) => e.status === 'vacation').length,
    inactive: employees.filter((e) => e.status === 'inactive').length,
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'manager':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'cashier':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'barista':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'vacation':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: 'Propietario',
      admin: 'Administrador',
      manager: 'Gerente',
      cashier: 'Cajero',
      barista: 'Barista',
    };
    return labels[role] || role;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activo',
      vacation: 'Vacaciones',
      inactive: 'Inactivo',
    };
    return labels[status] || status;
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Empleados
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestión de personal y roles
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <Calendar className="w-4 h-4" />
                  <span>Turnos</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedEmployee(null);
                    setIsModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nuevo Empleado</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Empleados</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {statsData.total}
                  </p>
                </div>
                <Users className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Activos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {statsData.active}
                  </p>
                </div>
                <UserCheck className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vacaciones</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {statsData.vacation}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statsData.inactive}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Sucursal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha Ingreso
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                          {employee.name.charAt(0)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {employee.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {employee.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {employee.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${getRoleBadge(employee.role)}`}
                      >
                        <Shield className="w-3 h-3" />
                        {getRoleLabel(employee.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {employee.location}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {new Date(employee.hireDate).toLocaleDateString(
                          'es-MX',
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadge(employee.status)}`}
                      >
                        {getStatusLabel(employee.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(employee)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(employee)}
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
          </div>
        </div>
      </div>

      {/* Employee Modal */}
      <EmployeeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEmployee(null);
        }}
        onSave={handleSave}
        employee={selectedEmployee}
        roles={roles}
        locations={locations}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setEmployeeToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Empleado"
        message={
          employeeToDelete
            ? `¿Está seguro de que desea eliminar a ${employeeToDelete.name}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Eliminar"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </MainLayout>
  );
}
