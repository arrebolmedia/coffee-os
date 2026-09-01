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
  useResetEmployeePassword,
  useUpdateEmployee,
} from '@/hooks/use-employees';
import { EmployeeFormData, EmployeeModal } from '@/components/hr/EmployeeModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useLocations } from '@/hooks/use-locations';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  KeyRound,
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
    // El backend devuelve snake_case (apps/api/src/modules/hr/employees.service.ts)
    name: `${e.first_name} ${e.last_name}`.trim(),
    email: e.email,
    phone: e.phone,
    role: e.role || '',
    status:
      e.status === 'ACTIVE'
        ? 'active'
        : e.status === 'ON_LEAVE'
          ? 'vacation'
          : 'inactive',
    hireDate: e.hire_date ?? '',
    salary: e.monthly_salary ?? 0,
    // El backend no devuelve sucursales en el listado
    location: '',
  };
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credencialNueva, setCredencialNueva] = useState<{
    nombre: string;
    email: string;
    password: string;
  } | null>(null);
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
  const resetPassword = useResetEmployeePassword();

  // Roles reales del backend (CreateEmployeeDto exige un role_id válido)
  const { data: rolesData } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: () => api.get<any>('/roles'),
    staleTime: 5 * 60 * 1000,
  });
  const roles: Array<{ id: string; name: string }> = (
    Array.isArray(rolesData) ? rolesData : (rolesData?.data ?? [])
  ).map((r: any) => ({ id: r.id, name: r.name }));

  // Sucursales reales del backend
  const { data: locationsData } = useLocations();
  const locations: Array<{ id: string; name: string }> = (
    Array.isArray(locationsData) ? locationsData : []
  ).map((l: any) => ({ id: l.id, name: l.name }));

  const employees: DisplayEmployee[] = (employeesData ?? []).map(toDisplay);

  // Handlers
  // Reponer la contraseña es lo único que rescata a un empleado que la olvidó:
  // no hay correo de recuperación y `change-password` pide la actual.
  const handleResetPassword = async (employee: DisplayEmployee) => {
    try {
      const res: any = await resetPassword.mutateAsync(employee.id);
      setCredencialNueva({
        nombre: employee.name,
        email: employee.email,
        password: res.temporary_password,
      });
    } catch {
      // El error lo reporta la capa de api.
    }
  };

  const handleSave = async (data: EmployeeFormData) => {
    try {
      if (data.id) {
        // Mapear al UpdateEmployeeDto real (snake_case, campos whitelisted)
        await updateMutation.mutateAsync({
          id: data.id,
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            location_id: data.locationIds[0] || undefined,
            role: (data.role || undefined) as any,
            employment_type: (data.employmentType || undefined) as any,
            status: data.active ? 'ACTIVE' : 'INACTIVE',
            monthly_salary: data.salary,
            emergency_contact_name: data.emergencyContact || undefined,
            emergency_contact_phone: data.emergencyContactPhone || undefined,
            address: data.address || undefined,
            city: data.city || undefined,
            state: data.state || undefined,
            postal_code: data.postalCode || undefined,
          },
        });
      } else {
        // Mapear al CreateEmployeeDto real (organization_id lo agrega el hook)
        const creado: any = await createMutation.mutateAsync({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          location_id: data.locationIds[0],
          role_id: data.roleId,
          role: data.role as any,
          employment_type: data.employmentType as any,
          hire_date: data.hireDate,
          monthly_salary: data.salary,
          emergency_contact_name: data.emergencyContact || undefined,
          emergency_contact_phone: data.emergencyContactPhone || undefined,
          address: data.address || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          postal_code: data.postalCode || undefined,
          rfc: data.rfc || undefined,
          curp: data.curp || undefined,
          nss: data.nss || undefined,
        });

        // La contraseña temporal viaja UNA vez, en la respuesta del alta. Si no
        // se enseña aquí, el empleado no puede entrar: no hay correo de
        // recuperación y `change-password` exige la contraseña actual.
        if (creado?.temporary_password) {
          setCredencialNueva({
            nombre: `${data.firstName} ${data.lastName}`.trim(),
            email: data.email,
            password: creado.temporary_password,
          });
        }
      }
      setIsModalOpen(false);
      setSelectedEmployee(null);
    } catch {
      // Error handled by mutation
    }
  };

  const handleEdit = (employee: DisplayEmployee) => {
    // Partir del registro crudo del backend (snake_case) para el formulario
    const raw = (employeesData ?? []).find((e) => e.id === employee.id);
    const formData: EmployeeFormData = {
      id: employee.id,
      firstName: raw?.first_name ?? '',
      lastName: raw?.last_name ?? '',
      email: raw?.email ?? '',
      phone: raw?.phone ?? '',
      // El backend no devuelve role_id en el listado; en edición es opcional
      roleId: '',
      active: raw?.status === 'ACTIVE',
      role: raw?.role || 'BARISTA',
      employmentType: raw?.employment_type || 'FULL_TIME',
      position: '',
      department: 'OPERATIONS',
      hireDate: raw?.hire_date
        ? String(raw.hire_date).split('T')[0]
        : new Date().toISOString().split('T')[0],
      salary: raw?.monthly_salary,
      locationIds: raw?.location_id ? [raw.location_id] : [],
      address: raw?.address,
      city: raw?.city,
      state: raw?.state,
      postalCode: raw?.postal_code,
      emergencyContact: raw?.emergency_contact_name,
      emergencyContactPhone: raw?.emergency_contact_phone,
      rfc: raw?.rfc,
      curp: raw?.curp,
      nss: raw?.nss,
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

  // La compuerta de carga no puede tragarse un diálogo abierto: el `return`
  // temprano sustituye la página entera —modales incluidos—, así que una
  // consulta de fondo que vuelve a cargar mientras el usuario escribe desmonta
  // el formulario y borra lo tecleado. Con un diálogo abierto se sigue de largo.
  const hayDialogoAbierto = isModalOpen || isDeleteDialogOpen;

  if (isLoading && !hayDialogoAbierto) {
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
      case 'MANAGER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ASSISTANT_MANAGER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'SHIFT_SUPERVISOR':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'CASHIER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'BARISTA':
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
      BARISTA: 'Barista',
      CASHIER: 'Cajero',
      COOK: 'Cocinero',
      MANAGER: 'Gerente',
      ASSISTANT_MANAGER: 'Subgerente',
      SHIFT_SUPERVISOR: 'Supervisor de Turno',
      CLEANER: 'Limpieza',
      DELIVERY: 'Repartidor',
    };
    return labels[role] || role || '—';
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
                        {employee.location || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {employee.hireDate
                          ? new Date(employee.hireDate).toLocaleDateString(
                              'es-MX',
                            )
                          : '—'}
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
                          title="Editar"
                          aria-label={`Editar a ${employee.name}`}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResetPassword(employee)}
                          disabled={resetPassword.isPending}
                          className="text-amber-600 hover:text-amber-900 disabled:opacity-50"
                          title="Reponer contraseña"
                          aria-label={`Reponer la contraseña de ${employee.name}`}
                        >
                          <KeyRound className="w-4 h-4" />
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
      {/*
        La contraseña temporal, para entregársela al empleado. Se enseña una
        sola vez porque solo se guarda hasheada: no hay forma de recuperarla
        después, únicamente de reponerla con otra.
      */}
      {credencialNueva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Datos de acceso de {credencialNueva.nombre}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Entrégaselos ahora. La contraseña no se vuelve a mostrar: si se
              pierde, hay que reponerla desde la lista de empleados.
            </p>

            <dl className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 font-mono text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Usuario</dt>
                <dd className="break-all text-gray-900">
                  {credencialNueva.email}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Contraseña</dt>
                <dd className="text-lg font-semibold tracking-wider text-gray-900">
                  {credencialNueva.password}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={() => setCredencialNueva(null)}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Ya la anoté
            </button>
          </div>
        </div>
      )}

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
