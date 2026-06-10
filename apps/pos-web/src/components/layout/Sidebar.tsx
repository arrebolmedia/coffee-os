/**
 * CoffeeOS - Sidebar Navigation Component
 * Menú lateral con todos los módulos organizados por categorías
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Coffee,
  CreditCard,
  Database,
  DollarSign,
  FileCheck,
  FileText,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Mail,
  MessageSquare,
  Package,
  PieChart,
  Settings,
  Shield,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  href?: string;
  badge?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    href: '/dashboard',
  },
  {
    title: 'Operaciones',
    icon: <ShoppingCart className="w-5 h-5" />,
    children: [
      {
        title: 'Punto de Venta',
        icon: <ShoppingCart className="w-4 h-4" />,
        href: '/pos',
      },
      {
        title: 'Inventario',
        icon: <Package className="w-4 h-4" />,
        href: '/inventory',
      },
      {
        title: 'Recetas',
        icon: <BookOpen className="w-4 h-4" />,
        href: '/recipes',
      },
      {
        title: 'Costeo',
        icon: <DollarSign className="w-4 h-4" />,
        href: '/costing',
      },
      {
        title: 'Órdenes',
        icon: <ClipboardList className="w-4 h-4" />,
        href: '/orders',
      },
      {
        title: 'Proveedores',
        icon: <Truck className="w-4 h-4" />,
        href: '/suppliers',
      },
      {
        title: 'Compras',
        icon: <ClipboardList className="w-4 h-4" />,
        href: '/purchase-orders',
      },
    ],
  },
  {
    title: 'Recursos Humanos',
    icon: <Users className="w-5 h-5" />,
    children: [
      {
        title: 'Empleados',
        icon: <Users className="w-4 h-4" />,
        href: '/employees',
      },
      {
        title: 'Nómina',
        icon: <DollarSign className="w-4 h-4" />,
        href: '/payroll',
      },
      {
        title: 'Asistencia',
        icon: <Calendar className="w-4 h-4" />,
        href: '/attendance',
      },
      {
        title: 'Capacitación',
        icon: <GraduationCap className="w-4 h-4" />,
        href: '/training',
      },
      {
        title: 'Evaluaciones',
        icon: <Award className="w-4 h-4" />,
        href: '/evaluations',
      },
      {
        title: 'Onboarding 30/60/90',
        icon: <Target className="w-4 h-4" />,
        href: '/onboarding',
      },
    ],
  },
  {
    title: 'Finanzas',
    icon: <DollarSign className="w-5 h-5" />,
    children: [
      {
        title: 'Contabilidad',
        icon: <FileText className="w-4 h-4" />,
        href: '/accounting',
      },
      {
        title: 'Facturación CFDI',
        icon: <FileCheck className="w-4 h-4" />,
        href: '/invoicing',
      },
      {
        title: 'Gastos',
        icon: <CreditCard className="w-4 h-4" />,
        href: '/expenses',
      },
      {
        title: 'P&L por Sucursal',
        icon: <TrendingUp className="w-4 h-4" />,
        href: '/pnl',
      },
      {
        title: 'Presupuestos',
        icon: <Briefcase className="w-4 h-4" />,
        href: '/budgets',
      },
    ],
  },
  {
    title: 'CRM & Clientes',
    icon: <Heart className="w-5 h-5" />,
    children: [
      {
        title: 'Clientes',
        icon: <Users className="w-4 h-4" />,
        href: '/customers',
      },
      {
        title: 'Programa 9+1',
        icon: <Gift className="w-4 h-4" />,
        href: '/loyalty',
      },
      {
        title: 'Campañas',
        icon: <Mail className="w-4 h-4" />,
        href: '/campaigns',
      },
      {
        title: 'Segmentación RFM',
        icon: <Target className="w-4 h-4" />,
        href: '/segmentation',
      },
      {
        title: 'WhatsApp/SMS',
        icon: <MessageSquare className="w-4 h-4" />,
        href: '/messaging',
      },
    ],
  },
  {
    title: 'Calidad & Compliance',
    icon: <CheckSquare className="w-5 h-5" />,
    children: [
      {
        title: 'NOM-251',
        icon: <Shield className="w-4 h-4" />,
        href: '/quality/nom251',
      },
      {
        title: 'Checklists',
        icon: <CheckSquare className="w-4 h-4" />,
        href: '/quality/checklists',
      },
      {
        title: 'Temperaturas',
        icon: <Coffee className="w-4 h-4" />,
        href: '/quality/temperatures',
      },
      {
        title: 'Permisos',
        icon: <FileCheck className="w-4 h-4" />,
        href: '/quality/permits',
      },
      {
        title: 'Auditorías',
        icon: <ClipboardList className="w-4 h-4" />,
        href: '/quality/audits',
      },
    ],
  },
  {
    title: 'Analytics & Reportes',
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      {
        title: 'Dashboard Ejecutivo',
        icon: <PieChart className="w-4 h-4" />,
        href: '/analytics/executive',
      },
      {
        title: 'Ventas',
        icon: <TrendingUp className="w-4 h-4" />,
        href: '/analytics/sales',
      },
      {
        title: 'Inventario',
        icon: <Package className="w-4 h-4" />,
        href: '/analytics/inventory',
      },
      {
        title: 'RRHH',
        icon: <Users className="w-4 h-4" />,
        href: '/analytics/hr',
      },
      {
        title: 'KPIs',
        icon: <Target className="w-4 h-4" />,
        href: '/analytics/kpis',
      },
    ],
  },
  {
    title: 'Configuración',
    icon: <Settings className="w-5 h-5" />,
    children: [
      {
        title: 'Organización',
        icon: <Briefcase className="w-4 h-4" />,
        href: '/settings/organization',
      },
      {
        title: 'Sucursales',
        icon: <Coffee className="w-4 h-4" />,
        href: '/settings/locations',
      },
      {
        title: 'Usuarios',
        icon: <Users className="w-4 h-4" />,
        href: '/settings/users',
      },
      {
        title: 'Invitar Usuarios',
        icon: <Mail className="w-4 h-4" />,
        href: '/invite-users',
        badge: 'Nuevo',
      },
      {
        title: 'Integraciones',
        icon: <Database className="w-4 h-4" />,
        href: '/settings/integrations',
      },
      {
        title: 'Notificaciones',
        icon: <Bell className="w-4 h-4" />,
        href: '/settings/notifications',
      },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>([
    'Dashboard',
    'Operaciones',
  ]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-gradient-to-b from-amber-900 to-orange-950 text-white transition-all duration-300 flex flex-col h-screen sticky top-0`}
    >
      {/* Logo Header */}
      <div className="p-4 border-b border-amber-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Coffee className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">CoffeeOS</h1>
                <p className="text-xs text-amber-300">Multi-Tenant</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-amber-800 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {menuItems.map((item) => (
          <div key={item.title} className="mb-1">
            {item.children ? (
              // Section with children
              <div>
                <button
                  onClick={() => toggleSection(item.title)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {!isCollapsed && (
                      <span className="font-medium text-sm">{item.title}</span>
                    )}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedSections.includes(item.title)
                          ? 'rotate-0'
                          : '-rotate-90'
                      }`}
                    />
                  )}
                </button>

                {/* Children */}
                {!isCollapsed && expandedSections.includes(item.title) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href || '#'}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive(child.href)
                            ? 'bg-amber-700 text-white font-medium'
                            : 'text-amber-100 hover:bg-amber-800'
                        }`}
                      >
                        {child.icon}
                        <span>{child.title}</span>
                        {child.badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {child.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Single item
              <Link
                href={item.href || '#'}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-amber-700 text-white font-medium'
                    : 'text-amber-100 hover:bg-amber-800'
                }`}
              >
                {item.icon}
                {!isCollapsed && (
                  <span className="font-medium text-sm">{item.title}</span>
                )}
                {item.badge && !isCollapsed && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-amber-800">
          <p className="text-xs text-amber-300 text-center">
            CoffeeOS v1.0.0
            <br />© 2025 Todos los derechos reservados
          </p>
        </div>
      )}
    </aside>
  );
}
