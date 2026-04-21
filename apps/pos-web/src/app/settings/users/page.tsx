/**
 * CoffeeOS - Users Management Page
 * Gestión completa de usuarios y permisos
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Users,
  Shield,
  Edit,
  Trash2,
  UserPlus,
  Search,
  Mail,
  Phone,
  MapPin,
  Check,
  X,
  Lock,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  locations: string[];
  lastLogin: string;
  createdAt: string;
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const users: User[] = [
    {
      id: '1',
      name: 'Juan Pérez',
      email: 'juan.perez@cafecentral.mx',
      phone: '55 1234 5678',
      role: 'Admin',
      status: 'active',
      locations: ['Sucursal Centro', 'Sucursal Polanco'],
      lastLogin: '2025-10-23T10:30:00',
      createdAt: '2025-01-15',
    },
    {
      id: '2',
      name: 'Ana Rodríguez',
      email: 'ana.rodriguez@cafecentral.mx',
      phone: '55 2345 6789',
      role: 'Gerente',
      status: 'active',
      locations: ['Sucursal Centro'],
      lastLogin: '2025-10-23T09:15:00',
      createdAt: '2025-02-20',
    },
    {
      id: '3',
      name: 'Carlos Hernández',
      email: 'carlos.h@cafecentral.mx',
      phone: '55 3456 7890',
      role: 'Cajero',
      status: 'active',
      locations: ['Sucursal Polanco'],
      lastLogin: '2025-10-22T18:45:00',
      createdAt: '2025-03-10',
    },
    {
      id: '4',
      name: 'Laura Martínez',
      email: 'laura.m@cafecentral.mx',
      phone: '55 4567 8901',
      role: 'Barista',
      status: 'active',
      locations: ['Sucursal Centro'],
      lastLogin: '2025-10-23T08:00:00',
      createdAt: '2025-04-05',
    },
    {
      id: '5',
      name: 'Nuevo Usuario',
      email: 'nuevo@cafecentral.mx',
      phone: '55 5678 9012',
      role: 'Cajero',
      status: 'pending',
      locations: [],
      lastLogin: '',
      createdAt: '2025-10-23',
    },
  ];

  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    pending: users.filter((u) => u.status === 'pending').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
  };

  const roles = ['Admin', 'Gerente', 'Cajero', 'Barista'];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Gerente':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Cajero':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Barista':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Activo',
      pending: 'Pendiente',
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-sm text-gray-500">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.pending}
                  </p>
                </div>
                <Lock className="w-8 h-8 text-yellow-400" />
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
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
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
                <option value="pending">Pendientes</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Último Acceso
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            Desde:{' '}
                            {new Date(user.createdAt).toLocaleDateString(
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
                          {user.email}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {user.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role)}`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.locations.length > 0 ? (
                        <div className="text-xs text-gray-600 space-y-1">
                          {user.locations.map((loc, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {loc}
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
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(user.status)}`}
                      >
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.lastLogin ? (
                        <div className="text-xs text-gray-600">
                          {new Date(user.lastLogin).toLocaleDateString('es-MX')}
                          <br />
                          {new Date(user.lastLogin).toLocaleTimeString(
                            'es-MX',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Nunca
                        </span>
                      )}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
