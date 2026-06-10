/**
 * CoffeeOS - Organization Module
 * Configuración completa de la organización
 */

'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useOrganization } from '@/hooks/use-organization';
import {
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  Download,
  Edit,
  FileText,
  Mail,
  MapPin,
  Save,
  Shield,
  Users,
} from 'lucide-react';

export default function OrganizationPage() {
  const [isEditing, setIsEditing] = useState(false);
  const { data: org } = useOrganization();

  const organizationData = {
    general: {
      businessName: org?.name || 'Cargando...',
      tradeName: org?.name || '',
      rfc: 'CCE850312AB7',
      regimen: '601 - General de Ley Personas Morales',
      activity: 'Servicios de cafeterías y restaurantes',
      foundingDate: '2024-01-15',
      logo: null,
    },
    contact: {
      email: 'contacto@cafecentral.com.mx',
      phone: '55 1234 5678',
      website: 'https://cafecentral.com.mx',
      fiscalAddress: {
        street: 'Av. Reforma 123',
        colonia: 'Centro',
        city: 'Ciudad de México',
        state: 'CDMX',
        zip: '06000',
        country: 'México',
      },
    },
    legal: {
      legalRepresentative: 'Roberto Martínez García',
      notaryNumber: '45',
      publicDeed: '12,345',
      constitutionDate: '2024-01-10',
      registryNumber: 'REG-2024-001234',
    },
    fiscal: {
      curp: 'MAGR800515HDFRRT08',
      imss: 'A1234567890',
      infonavit: '1234567890',
      hasCertificate: true,
      certificateExpiry: '2026-01-15',
      hasFiel: true,
      fielExpiry: '2026-01-15',
    },
    banking: {
      bank: 'BBVA México',
      accountNumber: '**** **** **** 1234',
      clabe: '012345678901234567',
      swift: 'BCMRMXMM',
    },
    subscription: {
      plan: 'Professional',
      status: 'active',
      startDate: '2024-01-15',
      renewalDate: '2025-01-15',
      locations: 5,
      users: 50,
      features: [
        'Multi-tenancy',
        'POS Ilimitado',
        'Inventario avanzado',
        'Integraciones',
        'CFDI 4.0',
        'Soporte prioritario',
      ],
    },
  };

  const stats = {
    locations: 5,
    users: 47,
    transactions: 15234,
    revenue: 1250000,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Configuración de Organización
            </h1>
            <p className="text-gray-600">
              Administra la información legal y fiscal de tu empresa
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-5 h-5" />
                  Guardar Cambios
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="w-5 h-5" />
                Editar Información
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sucursales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.locations}
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
                <p className="text-sm text-gray-600">Usuarios</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.users}
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
                <p className="text-sm text-gray-600">Transacciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.transactions.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ingresos Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${(stats.revenue / 1000).toFixed(0)}k
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-lg">
                <Building2 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">
                    Información General
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Razón Social
                    </label>
                    <input
                      type="text"
                      value={organizationData.general.businessName}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      value={organizationData.general.tradeName}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      RFC
                    </label>
                    <input
                      type="text"
                      value={organizationData.general.rfc}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Constitución
                    </label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-900">
                        {new Date(
                          organizationData.general.foundingDate,
                        ).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Régimen Fiscal
                  </label>
                  <input
                    type="text"
                    value={organizationData.general.regimen}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Actividad Económica
                  </label>
                  <input
                    type="text"
                    value={organizationData.general.activity}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">
                    Información de Contacto
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Corporativo
                    </label>
                    <input
                      type="email"
                      value={organizationData.contact.email}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={organizationData.contact.phone}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sitio Web
                  </label>
                  <input
                    type="url"
                    value={organizationData.contact.website}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Domicilio Fiscal
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <p className="text-gray-900">
                      {organizationData.contact.fiscalAddress.street}
                    </p>
                    <p className="text-gray-700">
                      {organizationData.contact.fiscalAddress.colonia},{' '}
                      {organizationData.contact.fiscalAddress.city}
                    </p>
                    <p className="text-gray-700">
                      {organizationData.contact.fiscalAddress.state}{' '}
                      {organizationData.contact.fiscalAddress.zip}
                    </p>
                    <p className="text-gray-600">
                      {organizationData.contact.fiscalAddress.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Information */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-bold text-white">
                    Información Legal
                  </h2>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Representante Legal
                  </label>
                  <input
                    type="text"
                    value={organizationData.legal.legalRepresentative}
                    disabled={!isEditing}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notaría Pública
                    </label>
                    <input
                      type="text"
                      value={organizationData.legal.notaryNumber}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Escritura Pública
                    </label>
                    <input
                      type="text"
                      value={organizationData.legal.publicDeed}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Folio Mercantil
                    </label>
                    <input
                      type="text"
                      value={organizationData.legal.registryNumber}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Additional Info */}
          <div className="space-y-6">
            {/* Fiscal Status */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Estado Fiscal
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Certificado Digital
                    </span>
                  </div>
                  <span className="text-xs text-green-700">
                    Vigente hasta{' '}
                    {new Date(
                      organizationData.fiscal.certificateExpiry,
                    ).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      e.firma (FIEL)
                    </span>
                  </div>
                  <span className="text-xs text-green-700">
                    Vigente hasta{' '}
                    {new Date(
                      organizationData.fiscal.fielExpiry,
                    ).toLocaleDateString('es-MX')}
                  </span>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">CURP:</span>
                    <span className="font-medium text-gray-900">
                      {organizationData.fiscal.curp}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Registro IMSS:</span>
                    <span className="font-medium text-gray-900">
                      {organizationData.fiscal.imss}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Registro INFONAVIT:</span>
                    <span className="font-medium text-gray-900">
                      {organizationData.fiscal.infonavit}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Banking Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Información Bancaria
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Banco</label>
                  <p className="font-medium text-gray-900">
                    {organizationData.banking.bank}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Cuenta</label>
                  <p className="font-medium text-gray-900">
                    {organizationData.banking.accountNumber}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">CLABE</label>
                  <p className="font-mono text-sm text-gray-900">
                    {organizationData.banking.clabe}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Código SWIFT</label>
                  <p className="font-mono text-sm text-gray-900">
                    {organizationData.banking.swift}
                  </p>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  Plan {organizationData.subscription.plan}
                </h3>
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  Activo
                </span>
              </div>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-100">Inicio:</span>
                  <span className="font-medium">
                    {new Date(
                      organizationData.subscription.startDate,
                    ).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Renovación:</span>
                  <span className="font-medium">
                    {new Date(
                      organizationData.subscription.renewalDate,
                    ).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Sucursales:</span>
                  <span className="font-medium">
                    {organizationData.subscription.locations} /{' '}
                    {organizationData.subscription.locations}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-100">Usuarios:</span>
                  <span className="font-medium">
                    {stats.users} / {organizationData.subscription.users}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/20">
                <p className="text-xs text-blue-100 mb-2">
                  Características incluidas:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {organizationData.subscription.features.map(
                    (feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 text-xs"
                      >
                        <CheckCircle className="w-3 h-3" />
                        {feature}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Documentos
              </h3>
              <div className="space-y-2">
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">
                      Acta Constitutiva
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">
                      Constancia Fiscal
                    </span>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="text-sm text-gray-900">Cédula RFC</span>
                  </div>
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
