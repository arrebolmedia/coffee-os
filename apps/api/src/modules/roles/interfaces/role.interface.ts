/**
 * RBAC (Role-Based Access Control) System
 * Sistema completo de control de acceso basado en roles para CoffeeOS multi-tenant
 */

/**
 * Recursos del sistema que pueden ser protegidos
 */
export enum Resource {
  // Core
  USERS = 'users',
  ORGANIZATIONS = 'organizations',
  ROLES = 'roles',
  PERMISSIONS = 'permissions',
  
  // POS & Operations
  POS = 'pos',
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  MODIFIERS = 'modifiers',
  ORDERS = 'orders',
  TRANSACTIONS = 'transactions',
  PAYMENTS = 'payments',
  DISCOUNTS = 'discounts',
  TAXES = 'taxes',
  
  // Inventory
  INVENTORY = 'inventory',
  INVENTORY_ITEMS = 'inventory_items',
  SUPPLIERS = 'suppliers',
  PURCHASE_ORDERS = 'purchase_orders',
  INVENTORY_MOVEMENTS = 'inventory_movements',
  
  // Locations
  LOCATIONS = 'locations',
  SHIFTS = 'shifts',
  CASH_REGISTERS = 'cash_registers',
  
  // Recipes & Costing
  RECIPES = 'recipes',
  
  // Quality & Compliance
  QUALITY = 'quality',
  CHECKLISTS = 'checklists',
  
  // CRM & Loyalty
  CRM = 'crm',
  CUSTOMERS = 'customers',
  LOYALTY = 'loyalty',
  CAMPAIGNS = 'campaigns',
  
  // HR & Training
  HR = 'hr',
  EMPLOYEES = 'employees',
  TRAINING = 'training',
  EVALUATIONS = 'evaluations',
  
  // Finance & Legal
  FINANCE = 'finance',
  REPORTS = 'reports',
  CFDI = 'cfdi',
  
  // Analytics
  ANALYTICS = 'analytics',
  DASHBOARDS = 'dashboards',
  
  // Settings & Config
  SETTINGS = 'settings',
  NOTIFICATIONS = 'notifications',
  INTEGRATIONS = 'integrations',
}

/**
 * Acciones que se pueden realizar sobre recursos
 */
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  
  // Acciones especiales
  APPROVE = 'approve',
  CANCEL = 'cancel',
  EXPORT = 'export',
  IMPORT = 'import',
  MANAGE = 'manage', // Full control
  ASSIGN = 'assign',
}

/**
 * Efecto del permiso
 */
export enum Effect {
  ALLOW = 'allow',
  DENY = 'deny',
}

/**
 * Roles predefinidos del sistema (Mexican coffee shop context)
 */
export enum SystemRole {
  SUPER_ADMIN = 'super_admin',       // Acceso total al sistema
  OWNER = 'owner',                   // Propietario (acceso total a su org)
  MANAGER = 'manager',               // Gerente de tienda
  SHIFT_LEADER = 'shift_leader',     // Líder de turno
  BARISTA = 'barista',               // Barista
  CASHIER = 'cashier',               // Cajero
  TRAINER = 'trainer',               // Capacitador
  AUDITOR = 'auditor',               // Auditor (solo lectura + firmas)
  ACCOUNTANT = 'accountant',         // Contador (finanzas + CFDI)
}

/**
 * Permiso individual - representa una acción sobre un recurso
 */
export interface Permission {
  id: string;
  organization_id: string;
  
  // Definición del permiso
  resource: Resource;
  action: Action;
  effect: Effect;
  
  // Condiciones opcionales (JSON para flexibilidad)
  conditions?: Record<string, any>;
  
  // Metadata
  name: string;
  description?: string;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Rol - agrupa múltiples permisos
 */
export interface Role {
  id: string;
  organization_id: string;
  
  // Definición del rol
  name: string;
  code: string; // Unique within organization
  description?: string;
  
  // Sistema vs Custom
  is_system: boolean; // true si es SystemRole
  system_role?: SystemRole;
  
  // Permisos asociados
  permission_ids: string[];
  
  // UI customization
  color?: string;
  icon?: string;
  
  // Audit
  created_at: Date;
  updated_at: Date;
}

/**
 * Asignación de rol a usuario
 */
export interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  organization_id: string;
  
  // Scope (opcional)
  location_ids?: string[]; // Si el rol aplica solo a ciertas ubicaciones
  
  // Validity
  valid_from?: Date;
  valid_until?: Date;
  
  // Audit
  assigned_by: string; // user_id
  assigned_at: Date;
  revoked_at?: Date;
  revoked_by?: string;
}

/**
 * Resultado de verificación de permisos
 */
export interface PermissionCheck {
  allowed: boolean;
  resource: Resource;
  action: Action;
  reason?: string; // Si fue denegado, por qué
  matched_permissions: string[]; // IDs de permisos que coincidieron
}

/**
 * Estadísticas de roles
 */
export interface RoleStats {
  total_roles: number;
  system_roles_count: number;
  custom_roles_count: number;
  by_system_role: Record<SystemRole, number>;
  total_permissions: number;
  total_user_roles: number;
  users_by_role: Record<string, number>; // role_id -> count
}
