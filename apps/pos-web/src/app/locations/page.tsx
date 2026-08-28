/**
 * CoffeeOS - Locations/Branches Module
 * Gestión de sucursales
 *
 * Alineado al contrato real del backend: el Location de Prisma plano
 * (name, address string, city, state, postal_code, country, phone, email,
 * timezone, active, tax_rate, currency). Los campos code/type/status/
 * contact/schedule/metrics no existen en el schema actual.
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { type Location, useLocations } from '@/hooks/use-locations';
import { SucursalModal } from '@/components/locations/SucursalModal';
import {
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Globe,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Settings,
  XCircle,
} from 'lucide-react';

export default function LocationsPage() {
  // La pantalla listaba las sucursales y el botón «Nueva Sucursal» no tenía
  // `onClick`: no había forma de dar de alta un segundo local.
  const [creandoSucursal, setCreandoSucursal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: locations = [] } = useLocations();

  // Calcular estadísticas
  const stats = {
    total: locations.length,
    active: locations.filter((l) => l.active).length,
    inactive: locations.filter((l) => !l.active).length,
  };

  // Filtrar sucursales
  const filteredLocations = locations.filter((location) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      location.name?.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'active' ? location.active : !location.active);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (active: boolean) => {
    const Icon = active ? CheckCircle : XCircle;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${
          active
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-gray-100 text-gray-700 border-gray-200'
        }`}
      >
        <Icon className="w-3 h-3" />
        {active ? 'Activa' : 'Inactiva'}
      </span>
    );
  };

  const formatAddress = (location: Location) => {
    const cityState = [location.city, location.state]
      .filter(Boolean)
      .join(', ');
    return [cityState, location.postal_code].filter(Boolean).join(' ');
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
          <button
            type="button"
            onClick={() => setCreandoSucursal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nueva Sucursal
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <p className="text-sm text-gray-600">Inactivas</p>
                <p className="text-2xl font-bold text-gray-600">
                  {stats.inactive}
                </p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <XCircle className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los Estados</option>
              <option value="active">Activas</option>
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
                    <h3 className="text-xl font-bold text-white">
                      {location.name}
                    </h3>
                    <p className="text-blue-100 text-sm">
                      {[location.city, location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                  {getStatusBadge(location.active)}
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Address */}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="text-gray-900">
                      {location.address || 'Dirección no disponible'}
                    </p>
                    {formatAddress(location) && (
                      <p className="text-gray-600">{formatAddress(location)}</p>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {location.phone || 'No disponible'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">
                      {location.email || 'No disponible'}
                    </span>
                  </div>
                </div>

                {/* Configuración fiscal y regional */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {location.currency}
                    </p>
                    <p className="text-xs text-gray-600">Moneda</p>
                  </div>
                  <div className="text-center">
                    <Settings className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-gray-900">
                      {((location.tax_rate ?? 0) * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-gray-600">IVA</p>
                  </div>
                  <div className="text-center">
                    <Globe className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p
                      className="text-sm font-bold text-gray-900 truncate"
                      title={location.timezone}
                    >
                      {location.timezone?.split('/').pop()?.replace('_', ' ') ||
                        '—'}
                    </p>
                    <p className="text-xs text-gray-600">Zona horaria</p>
                  </div>
                </div>

                {/* Footer Info */}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-200">
                  <Clock className="w-3 h-3" />
                  Horarios y métricas: no disponibles
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

      <SucursalModal
        abierto={creandoSucursal}
        onClose={() => setCreandoSucursal(false)}
      />
    </MainLayout>
  );
}
