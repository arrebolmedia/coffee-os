'use client';

import { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useEmployees } from '@/hooks/use-employees';
import {
  Check,
  Edit,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORG_ADMIN: 'Admin',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
  BARISTA: 'Barista',
  VIEWER: 'Visor',
};

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 border-red-300',
  ORG_ADMIN: 'bg-blue-100 text-blue-800 border-blue-300',
  MANAGER: 'bg-green-100 text-green-800 border-green-300',
  CASHIER: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  BARISTA: 'bg-orange-100 text-orange-800 border-orange-300',
  VIEWER: 'bg-gray-100 text-gray-800 border-gray-300',
};

function getRoleBadge(roleName?: string) {
  return (
    ROLE_BADGE[roleName ?? ''] ?? 'bg-gray-100 text-gray-800 border-gray-300'
  );
}

function getRoleLabel(roleName?: string) {
  return ROLE_LABELS[roleName ?? ''] ?? roleName ?? '—';
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: employees = [], isLoading, isError } = useEmployees();

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        fullName.includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());

      const roleName = emp.role?.name ?? '';
      const matchesRole = filterRole === 'all' || roleName === filterRole;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && emp.active) ||
        (filterStatus === 'inactive' && !emp.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, searchQuery, filterRole, filterStatus]);

  const stats = {
    total: employees.length,
    active: employees.filter((e) => e.active).length,
    inactive: employees.filter((e) => !e.active).length,
  };

  const uniqueRoles = Array.from(
    new Set(employees.map((e) => e.role?.name).filter((r): r is string => !!r)),
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Gestión de Usuarios
                  </h1>
                  <p className="text-sm text-gray-500">
                    Administra usuarios y permisos
                  </p>
                </div>
              </div>
              <button
                onClick={() => (window.location.href = '/invite-users')}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invitar Usuario</span>
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {stats.total}
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
                    {stats.active}
                  </p>
                </div>
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Inactivos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.inactive}
                  </p>
                </div>
                <X className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar usuarios..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role)}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              <span className="ml-3 text-gray-500">Cargando usuarios...</span>
            </div>
          ) : isError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center text-red-600">
              Error al cargar usuarios. Verifica la conexión con el servidor.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ubicaciones
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-400"
                      >
                        No se encontraron usuarios con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                              {emp.firstName.charAt(0)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {emp.firstName} {emp.lastName}
                              </div>
                              <div className="text-xs text-gray-500">
                                Desde:{' '}
                                {new Date(emp.createdAt).toLocaleDateString(
                                  'es-MX',
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 space-y-1">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {emp.email}
                            </div>
                            {emp.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {emp.phone}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(emp.role?.name)}`}
                          >
                            <Shield className="w-3 h-3" />
                            {getRoleLabel(emp.role?.name)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {emp.locations && emp.locations.length > 0 ? (
                            <div className="text-xs text-gray-600 space-y-1">
                              {emp.locations.map((loc) => (
                                <div
                                  key={loc.id}
                                  className="flex items-center gap-1"
                                >
                                  <MapPin className="w-3 h-3" />
                                  {loc.name}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">
                              Sin asignar
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${emp.active ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}`}
                          >
                            {emp.active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 text-sm">
                            <Edit className="w-4 h-4 inline" />
                          </button>
                          <button className="text-red-600 hover:text-red-900 text-sm">
                            <Trash2 className="w-4 h-4 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
