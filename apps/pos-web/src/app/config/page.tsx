/**
 * CoffeeOS - Configuration Module
 * Configuración de organización, sucursales y usuarios
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  Settings,
  Building2,
  Users,
  MapPin,
  Bell,
  Key,
  Palette,
  Globe,
  Mail,
  Phone,
  Clock,
  Shield,
} from 'lucide-react';

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

export default function ConfigPage() {
  const [activeSection, setActiveSection] = useState('organization');

  const configSections: ConfigSection[] = [
    {
      id: 'organization',
      title: 'Organización',
      description: 'Información general de tu cafetería',
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      id: 'locations',
      title: 'Sucursales',
      description: 'Gestiona tus ubicaciones y horarios',
      icon: MapPin,
      color: 'text-green-600',
    },
    {
      id: 'users',
      title: 'Usuarios y Permisos',
      description: 'Administra usuarios y roles',
      icon: Users,
      color: 'text-purple-600',
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configura alertas y recordatorios',
      icon: Bell,
      color: 'text-yellow-600',
    },
    {
      id: 'integrations',
      title: 'Integraciones',
      description: 'Conecta servicios externos',
      icon: Key,
      color: 'text-indigo-600',
    },
    {
      id: 'appearance',
      title: 'Apariencia',
      description: 'Personaliza colores y temas',
      icon: Palette,
      color: 'text-pink-600',
    },
  ];

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-gray-700 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Configuración
                </h1>
                <p className="text-sm text-gray-500">
                  Administra la configuración de tu sistema
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sections Menu */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Secciones
                  </h2>
                </div>
                <nav className="p-2">
                  {configSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeSection === section.id
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${section.color}`} />
                        <div className="text-left">
                          <div className="font-medium">{section.title}</div>
                          <div className="text-xs text-gray-500">
                            {section.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="md:col-span-2">
              {activeSection === 'organization' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    Información de la Organización
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre de la Cafetería
                      </label>
                      <input
                        type="text"
                        defaultValue="Café Central"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        RFC
                      </label>
                      <input
                        type="text"
                        defaultValue="CAF123456ABC"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue="contacto@cafecentral.mx"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          defaultValue="+52 55 1234 5678"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Globe className="w-4 h-4 inline mr-1" />
                        Sitio Web
                      </label>
                      <input
                        type="url"
                        defaultValue="https://cafecentral.mx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              )}

              {activeSection === 'locations' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                      Sucursales
                    </h2>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      + Nueva Sucursal
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Sucursal Centro
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            Av. Reforma 123, Col. Centro, CDMX
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Lun-Vie: 7:00 - 20:00, Sáb-Dom: 9:00 - 18:00
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Activa
                        </span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Sucursal Polanco
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            Calle Masaryk 45, Polanco, CDMX
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Lun-Dom: 8:00 - 22:00
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          Activa
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'users' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">
                      Usuarios y Permisos
                    </h2>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      + Invitar Usuario
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold">
                          JP
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Juan Pérez
                          </p>
                          <p className="text-sm text-gray-500">
                            juan.perez@cafecentral.mx
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Administrador
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold">
                          AR
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            Ana Rodríguez
                          </p>
                          <p className="text-sm text-gray-500">
                            ana.rodriguez@cafecentral.mx
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Gerente
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    Preferencias de Notificaciones
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Inventario Bajo
                        </p>
                        <p className="text-sm text-gray-500">
                          Alerta cuando productos estén por debajo del mínimo
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Ventas Diarias
                        </p>
                        <p className="text-sm text-gray-500">
                          Resumen de ventas al final del día
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Checks de Calidad
                        </p>
                        <p className="text-sm text-gray-500">
                          Recordatorios de checklists pendientes
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">
                          Cumpleaños de Clientes
                        </p>
                        <p className="text-sm text-gray-500">
                          Notificación de cumpleaños para campaña 9+1
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'integrations' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    Integraciones
                  </h2>
                  <div className="space-y-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            PAC CFDI
                          </h3>
                          <p className="text-sm text-gray-500">
                            Facturación electrónica
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          Conectado
                        </span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Twilio
                          </h3>
                          <p className="text-sm text-gray-500">
                            WhatsApp y SMS
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          Conectado
                        </span>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Mailrelay
                          </h3>
                          <p className="text-sm text-gray-500">
                            Email marketing
                          </p>
                        </div>
                        <button className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full hover:bg-gray-200">
                          Configurar
                        </button>
                      </div>
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            Baserow
                          </h3>
                          <p className="text-sm text-gray-500">Base de datos</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                          Conectado
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'appearance' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">
                    Personalización de Apariencia
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tema
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button className="border-2 border-blue-500 rounded-lg p-3 bg-white">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-white border border-gray-300 rounded mx-auto mb-2"></div>
                            <span className="text-sm">Claro</span>
                          </div>
                        </button>
                        <button className="border-2 border-transparent rounded-lg p-3 bg-white">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gray-800 rounded mx-auto mb-2"></div>
                            <span className="text-sm">Oscuro</span>
                          </div>
                        </button>
                        <button className="border-2 border-transparent rounded-lg p-3 bg-white">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-800 rounded mx-auto mb-2"></div>
                            <span className="text-sm">Auto</span>
                          </div>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color Principal
                      </label>
                      <div className="flex gap-2">
                        <button className="w-10 h-10 rounded-full bg-blue-600 border-2 border-gray-300"></button>
                        <button className="w-10 h-10 rounded-full bg-purple-600"></button>
                        <button className="w-10 h-10 rounded-full bg-green-600"></button>
                        <button className="w-10 h-10 rounded-full bg-orange-600"></button>
                        <button className="w-10 h-10 rounded-full bg-red-600"></button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
