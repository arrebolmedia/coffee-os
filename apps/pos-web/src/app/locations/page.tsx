/**
 * CoffeeOS - Locations/Branches Module
 * Gestión completa de sucursales y configuración multi-tenancy
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  MapPin,
  Plus,
  Search,
  Edit,
  Trash2,
  Clock,
  Phone,
  Mail,
  User,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Eye,
  Calendar,
} from 'lucide-react';

interface Location {
  id: string;
  name: string;
  code: string;
  type: 'principal' | 'sucursal' | 'kiosko';
  status: 'active' | 'inactive' | 'maintenance';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  contact: {
    manager: string;
    phone: string;
    email: string;
  };
  schedule: {
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
    sunday: string;
  };
  metrics: {
    employees: number;
    avgSales: number;
    avgCustomers: number;
    inventory: number;
  };
  openingDate: string;
  lastSale: string;
}

export default function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Locations (empty - to be populated from API)
  const locations: Location[] = [];

  // Calcular estadísticas
  const stats = {
    total: locations.length,
    active: locations.filter((l) => l.status === 'active').length,
    maintenance: locations.filter((l) => l.status === 'maintenance').length,
    totalEmployees: locations.reduce((sum, l) => sum + l.metrics.employees, 0),
    avgSales:
      locations.length > 0
        ? Math.round(
            locations.reduce((sum, l) => sum + l.metrics.avgSales, 0) /
              locations.length,
          )
        : 0,
  };

  // Filtrar sucursales
  const filteredLocations = locations.filter((location) => {
    const matchesSearch =
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.address.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === 'all' || location.status === filterStatus;
    const matchesType = filterType === 'all' || location.type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      active: {
        label: 'Activa',
        color: 'bg-green-100 text-green-700 border-green-200',
        icon: CheckCircle,
      },
      inactive: {
        label: 'Inactiva',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: XCircle,
      },
      maintenance: {
        label: 'Mantenimiento',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: AlertCircle,
      },
    };
    const badge = badges[status as keyof typeof badges];
    const Icon = badge.icon;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${badge.color}`}
      >
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      principal: {
        label: 'Principal',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
      },
      sucursal: {
        label: 'Sucursal',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
      },
      kiosko: {
        label: 'Kiosko',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
      },
    };
    const badge = badges[type as keyof typeof badges];
    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sucursales</h1>
            <p className="text-gray-600">
              Gestión de ubicaciones y configuración multi-tenancy
            </p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-5 h-5" />
            Nueva Sucursal
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sucursales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Mantenimiento</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.maintenance}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Empleados</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.totalEmployees}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ventas Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.avgSales / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar sucursales..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Tipos</option>
              <option value="principal">Principal</option>
              <option value="sucursal">Sucursal</option>
              <option value="kiosko">Kiosko</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activas</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="inactive">Inactivas</option>
            </select>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredLocations.map((location) => (
            <div
              key={location.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">
                        {location.name}
                      </h3>
                      {getTypeBadge(location.type)}
                    </div>
                    <p className="text-blue-100 text-sm">{location.code}</p>
                  </div>
                  {getStatusBadge(location.status)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-900">{location.address.street}</p>
                    <p className="text-gray-600">
                      {location.address.city}, {location.address.state}{' '}
                      {location.address.zip}
                    </p>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Gerente:</span>
                    <span className="text-gray-900 font-medium">
                      {location.contact.manager}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {location.contact.phone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {location.contact.email}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <Users className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {location.metrics.employees}
                    </p>
                    <p className="text-xs text-gray-600">Empleados</p>
                  </div>
                  <div className="text-center">
                    <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      ${(location.metrics.avgSales / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-gray-600">Ventas/día</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {location.metrics.avgCustomers}
                    </p>
                    <p className="text-xs text-gray-600">Clientes</p>
                  </div>
                  <div className="text-center">
                    <Package className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {location.metrics.inventory}
                    </p>
                    <p className="text-xs text-gray-600">Productos</p>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t border-gray-200">
                  <Clock className="w-4 h-4" />
                  <span>Lun-Vie: {location.schedule.monday}</span>
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Inauguración:{' '}
                    {new Date(location.openingDate).toLocaleDateString('es-MX')}
                  </div>
                  <div>
                    Última venta:{' '}
                    {new Date(location.lastSale).toLocaleString('es-MX', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-end gap-2 border-t border-gray-200">
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors">
                  <Eye className="w-4 h-4" />
                  Ver Detalles
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  Configurar
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredLocations.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron sucursales
            </h3>
            <p className="text-gray-600">
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
