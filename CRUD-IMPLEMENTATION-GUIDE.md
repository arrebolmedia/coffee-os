# Guía de Implementación CRUD - CoffeeOS

## Estado Actual del Sistema

### ✅ COMPLETADO

#### 1. Componentes Base Reutilizables

- **Location**: `apps/pos-web/src/components/ui/`
- **Archivos**:
  - `Modal.tsx` - Modal base con variantes de tamaño (sm, md, lg, xl, 2xl)
  - `FormField.tsx` - InputField, TextareaField, SelectField con validación
  - `Button.tsx` - 5 variantes (primary, secondary, danger, success, ghost)
  - `ConfirmDialog.tsx` - Diálogos de confirmación con 3 niveles (danger, warning, info)

#### 2. Módulo de Inventario - CRUD Completo

- **Location**: `apps/pos-web/src/app/inventory/page.tsx`
- **Modal**: `apps/pos-web/src/components/inventory/InventoryItemModal.tsx`
- **Funcionalidades**:
  - ✅ Crear producto nuevo
  - ✅ Editar producto existente
  - ✅ Eliminar con confirmación
  - ✅ Validación de formularios
  - ✅ Estados de carga
  - ✅ Notificaciones toast
- **Hooks**: `use-inventory.ts` - useCreateInventoryItem, useUpdateInventoryItem, useDeleteInventoryItem

#### 3. Módulo de Recetas - CRUD Completo ✅

- **Location**: `apps/pos-web/src/app/recipes/page.tsx`
- **Modales**:
  - `apps/pos-web/src/components/recipes/RecipeModal.tsx` - Crear/editar recetas
  - `apps/pos-web/src/components/recipes/IngredientsList.tsx` - Lista dinámica de ingredientes
- **Funcionalidades**:
  - ✅ Crear receta nueva con ingredientes
  - ✅ Editar receta existente
  - ✅ Eliminar con confirmación
  - ✅ Lista dinámica de ingredientes (agregar/remover)
  - ✅ Selector de productos de inventario
  - ✅ Validación de formularios (nombre, ingredientes, cantidades)
  - ✅ Manejo de alérgenos (checkbox múltiple)
  - ✅ Tiempo de preparación, rendimiento, unidades
  - ✅ Estados de carga
  - ✅ Notificaciones toast
- **Hooks**: `use-recipes.ts` - useCreateRecipe, useUpdateRecipe, useDeleteRecipe
- **Campos Implementados**: productId, name, description, instructions, prepTime, yield, yieldUnit, allergens, videoUrl, active, ingredients[]

#### 4. Módulo de Proveedores - CRUD Completo ✅

- **Location**: `apps/pos-web/src/app/suppliers/page.tsx`
- **Modal**: `apps/pos-web/src/components/suppliers/SupplierFormModal.tsx` (ya existía)
- **Funcionalidades**:
  - ✅ Crear proveedor nuevo
  - ✅ Editar proveedor existente
  - ✅ Eliminar con ConfirmDialog (mejorado de confirm nativo)
  - ✅ Validación de formularios
  - ✅ Información general (nombre, razón social, RFC)
  - ✅ Datos de contacto (nombre, teléfono, email)
  - ✅ Dirección completa (calle, ciudad, estado, CP)
  - ✅ Términos comerciales (pago, productos suministrados)
  - ✅ Calificación por estrellas (1-5)
  - ✅ Estados (activo, inactivo, pendiente)
  - ✅ Categorías (café, lácteos, insumos, empaque, limpieza, otros)
  - ✅ Estados de carga
  - ✅ Notificaciones toast
  - ✅ Filtros avanzados (búsqueda, categoría, estado)
  - ✅ Estadísticas en dashboard
- **Hooks**: `use-suppliers.ts` - useCreateSupplier, useUpdateSupplier, useDeleteSupplier, useSupplierStats
- **Campos Implementados**: name, business_name, rfc, category, rating, status, contact_name, contact_email, contact_phone, address (street/city/state/zip), payment_terms, products_supplied[]

#### 5. Módulo de Recursos Humanos - Empleados - CRUD Completo ✅ NUEVO

- **Location**: `apps/pos-web/src/app/employees/page.tsx`
- **Modal**: `apps/pos-web/src/components/hr/EmployeeModal.tsx` (650+ líneas, 4 tabs)
- **Hooks**: `apps/pos-web/src/hooks/use-employees.ts`
- **Funcionalidades**:
  - ✅ Crear empleado nuevo con contraseña autogenerada
  - ✅ Editar empleado existente
  - ✅ Eliminar con ConfirmDialog
  - ✅ Interfaz de 4 tabs con indicadores de error
  - ✅ **Tab 1 - Datos Personales**: nombre, apellido, email, teléfono, fecha nacimiento, género, tipo sangre, alergias
  - ✅ **Tab 2 - Datos Laborales**: rol, departamento, puesto, fecha ingreso, salario, múltiples sucursales (checkboxes)
  - ✅ **Tab 3 - Documentos**: CURP (18 chars), RFC (12-13 chars), NSS (11 dígitos), contacto de emergencia (nombre/teléfono/relación)
  - ✅ **Tab 4 - Dirección**: calle, ciudad, estado (dropdown México 32 estados), código postal, notas
  - ✅ Validación por tab con indicadores visuales
  - ✅ Auto-cambio a tab con errores
  - ✅ Multi-selección de sucursales (grid de checkboxes)
  - ✅ Cumplimiento normativo mexicano (CURP/RFC/NSS)
  - ✅ Dropdowns: tipos de sangre, géneros, departamentos, puestos
  - ✅ Estados de carga
  - ✅ Notificaciones toast
  - ✅ Filtros de búsqueda
  - ✅ Estadísticas de dashboard (total, activos, vacaciones, inactivos)
- **Hooks**: `use-employees.ts` - useEmployees, useEmployee, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, useEmployeeStats
- **Campos Implementados**: firstName, lastName, email, phone, roleId, active, dateOfBirth, gender, bloodType, allergies, position, department, hireDate, salary, locationIds[], curp, rfc, nss, emergencyContact/Phone/Relation, address, city, state, postalCode, notes
- **Nota Técnica**: Primer módulo con interfaz multi-tab. Modal de 650+ líneas. Requiere migración de base de datos para campos extendidos (CURP, RFC, NSS, salary, etc.)

---

## 🔄 PATRÓN DE IMPLEMENTACIÓN

### Pasos para Implementar CRUD en Cualquier Módulo

```typescript
// 1. Crear {Entity}Modal.tsx en components/{module}/
// 2. Agregar estado en page.tsx:
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Entity | null>(null);
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [itemToDelete, setItemToDelete] = useState<Entity | null>(null);

// 3. Importar hooks CRUD:
const createMutation = useCreate{Entity}();
const updateMutation = useUpdate{Entity}();
const deleteMutation = useDelete{Entity}();

// 4. Agregar handlers:
const handleSave = async (data: Entity) => {
  if (data.id) {
    await updateMutation.mutateAsync(data);
  } else {
    await createMutation.mutateAsync(data);
  }
  setIsModalOpen(false);
};

const handleDeleteConfirm = async () => {
  await deleteMutation.mutateAsync(itemToDelete.id);
  setIsDeleteDialogOpen(false);
};

// 5. Conectar botones:
// - "Nuevo" → setSelectedItem(null); setIsModalOpen(true);
// - "Edit" → setSelectedItem(item); setIsModalOpen(true);
// - "Delete" → setItemToDelete(item); setIsDeleteDialogOpen(true);

// 6. Agregar modales antes de </MainLayout>:
<EntityModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onSave={handleSave}
  item={selectedItem}
/>
<ConfirmDialog
  isOpen={isDeleteDialogOpen}
  onClose={() => setIsDeleteDialogOpen(false)}
  onConfirm={handleDeleteConfirm}
  title="Eliminar"
  message={`¿Confirmas que deseas eliminar "${itemToDelete?.name}"?`}
  variant="danger"
/>
```

---

## 📋 MÓDULOS PENDIENTES

### 1. RECETAS (Recipes) - ✅ COMPLETADO �

**Complejidad**: Alta (manejo de ingredientes dinámicos)

**Location**: `apps/pos-web/src/app/recipes/page.tsx` ✅

**Modal Creado**: `apps/pos-web/src/components/recipes/RecipeModal.tsx` ✅

**Componente Adicional**: `apps/pos-web/src/components/recipes/IngredientsList.tsx` ✅

**Estado**: ✅ COMPLETAMENTE FUNCIONAL

**Implementación Completada**:

- ✅ RecipeModal con todos los campos requeridos
- ✅ IngredientsList para manejo dinámico de ingredientes
- ✅ Botón "Nueva Receta" conectado
- ✅ Botón "Editar" conectado con pre-llenado de datos
- ✅ Botón "Eliminar" conectado con confirmación
- ✅ Validación de formularios (campos requeridos, ingredientes)
- ✅ Hooks integrados: useCreateRecipe, useUpdateRecipe, useDeleteRecipe
- ✅ Estados de carga en botones
- ✅ Notificaciones toast
- ✅ Lista dinámica funcional (agregar/remover ingredientes)
- ✅ Selector de productos de inventario con unidades
- ✅ Conversión de tiempo (minutos ↔ segundos)
- ✅ Manejo de alérgenos con checkboxes
- ✅ Sin errores de TypeScript

**Campos del Formulario Implementados**:

```typescript
interface RecipeFormData {
  id?: string; // ✅ Para edición
  productId: string; // ✅ ID del producto asociado
  name: string; // ✅ Nombre de la receta
  description: string; // ✅ Descripción
  instructions: string; // ✅ Pasos de preparación
  prepTime: number; // ✅ En minutos (convertido a segundos)
  yield: number; // ✅ Rendimiento
  yieldUnit: string; // ✅ Unidad (unit, serving, ml, l, g, kg)
  allergens: string[]; // ✅ Array de alérgenos seleccionados
  videoUrl: string; // ✅ URL opcional
  active: boolean; // ✅ Estado activo/inactivo
  ingredients: Array<{
    // ✅ Lista dinámica
    inventoryItemId: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
}
```

**Alérgenos Disponibles**: Gluten, Lácteos, Nueces, Soya, Huevo, Pescado, Mariscos, Cacahuates, Ajonjolí, Sulfitos

**Unidades de Rendimiento**: unit (Unidades), serving (Porciones), ml, l, g, kg

**Unidades de Ingredientes**: g, kg, ml, l, unit, oz, cup, tbsp, tsp

**Hooks Utilizados**:

- ✅ `useRecipes()` - Listar recetas
- ✅ `useInventory()` - Obtener productos de inventario para ingredientes
- ✅ `useCreateRecipe()` - Crear nueva receta
- ✅ `useUpdateRecipe()` - Actualizar receta existente
- ✅ `useDeleteRecipe()` - Eliminar receta

**Validaciones Implementadas**:

- Nombre requerido
- ProductId requerido
- Tiempo de preparación > 0
- Rendimiento > 0
- Al menos un ingrediente
- Cada ingrediente debe tener producto seleccionado y cantidad > 0

**Notas de Implementación**:

- El campo `productId` actualmente es input text, idealmente debería ser dropdown cuando el hook de productos esté disponible
- Los ingredientes se agregan/remueven dinámicamente con botones + y X
- El tiempo de preparación se maneja en minutos en UI pero se convierte a segundos para la API
- La conversión de datos se hace en handleSaveRecipe para cumplir con el tipo Recipe del API

---

### 2. PROVEEDORES (Suppliers) - ✅ COMPLETADO 🟢

**Complejidad**: Media

**Location**: `apps/pos-web/src/app/suppliers/page.tsx` ✅

**Modal**: `apps/pos-web/src/components/suppliers/SupplierFormModal.tsx` ✅ (ya existía)

**Estado**: ✅ COMPLETAMENTE FUNCIONAL

**Mejoras Implementadas**:

- ✅ Reemplazado confirm() nativo por ConfirmDialog
- ✅ Estado para diálogo de confirmación de eliminación
- ✅ Handler handleDeleteConfirm con try-catch
- ✅ Loading state en ConfirmDialog

**Funcionalidades Completadas**:

- ✅ Crear proveedor con formulario completo
- ✅ Editar proveedor existente (pre-llenado de datos)
- ✅ Eliminar con diálogo de confirmación elegante
- ✅ Validación de campos requeridos
- ✅ Calificación por estrellas interactiva
- ✅ Lista dinámica de productos suministrados
- ✅ Filtros avanzados (búsqueda, categoría, estado)
- ✅ Tabla responsive con información completa
- ✅ Estadísticas en dashboard (total, activos, pendientes, gasto total)
- ✅ Estados de carga en mutaciones
- ✅ Notificaciones toast

**Campos del Formulario Implementados**:

```typescript
interface SupplierFormData {
  name: string; // Nombre comercial *
  business_name: string; // Razón social *
  rfc: string; // RFC mexicano
  category: string; // café, lácteos, insumos, empaque, limpieza, otros
  rating: number; // 1-5 estrellas
  status: string; // active, inactive, pending
  contact_name: string; // Nombre del contacto *
  contact_email: string; // Email del contacto
  contact_phone: string; // Teléfono *
  address_street: string; // Calle y número
  address_city: string; // Ciudad
  address_state: string; // Estado
  address_zip: string; // Código postal
  payment_terms: string; // Contado, 15/30/45/60/90 días
  products_supplied: string[]; // Lista de productos (dinám ica)
}
```

**Categorías Disponibles**: café, lácteos, insumos, empaque, limpieza, otros

**Términos de Pago**: Contado, 15 días, 30 días, 45 días, 60 días, 90 días

**Estados**: active (Activo), inactive (Inactivo), pending (Pendiente)

**Hooks Utilizados**:

- ✅ `useSuppliers()` - Listar con filtros
- ✅ `useSupplierStats()` - Estadísticas del dashboard
- ✅ `useCreateSupplier()` - Crear nuevo proveedor
- ✅ `useUpdateSupplier()` - Actualizar proveedor existente
- ✅ `useDeleteSupplier()` - Eliminar proveedor

**Validaciones Implementadas**:

- Nombre comercial requerido
- Razón social requerida
- Nombre de contacto requerido
- Teléfono requerido
- Categoría requerida
- Estado requerido

**Características Adicionales**:

- Sistema de calificación visual con estrellas clickeables
- Agregar/remover productos suministrados con Enter
- Badges de estado con colores (verde/amarillo/gris)
- Icono de teléfono y email en contacto
- Tabla con hover effects
- Búsqueda en tiempo real
- Filtros múltiples simultáneos
- Export button (pendiente implementación)

---

### 3. RECURSOS HUMANOS (HR) - PRIORIDAD ALTA 🔴

**Complejidad**: Muy Alta (múltiples sub-entidades)

#### 3.1. EMPLEADOS (Employees) - ✅ COMPLETADO 🟢

**Location**: `apps/pos-web/src/app/employees/page.tsx` ✅

**Modal Creado**: `apps/pos-web/src/components/hr/EmployeeModal.tsx` ✅ (650+ líneas)

**Hooks Creados**: `apps/pos-web/src/hooks/use-employees.ts` ✅

**Estado**: ✅ COMPLETAMENTE FUNCIONAL

**Funcionalidades Completadas**:

- ✅ Interfaz de 4 tabs con indicadores de error
- ✅ Crear empleado nuevo con contraseña autogenerada
- ✅ Editar empleado existente
- ✅ Eliminar con ConfirmDialog
- ✅ Validaciones por tab con errores visuales
- ✅ Auto-cambio a tab con errores
- ✅ Multi-selección de sucursales con checkboxes
- ✅ Cumplimiento normativo mexicano (CURP/RFC/NSS)
- ✅ Filtros de búsqueda en tiempo real
- ✅ Estadísticas de dashboard
- ✅ Estados de carga
- ✅ Notificaciones toast

**Campos del Formulario Implementados**:

```typescript
interface EmployeeFormData {
  id?: string;
  // Datos básicos (del modelo User)
  firstName: string; // Nombre(s) *
  lastName: string; // Apellido(s) *
  email: string; // Email corporativo *
  phone: string; // Teléfono *
  roleId: string; // Rol (Admin, Gerente, Cajero, Barista) *
  organizationId?: string;
  avatar?: string;
  active: boolean; // Estado activo/inactivo

  // Datos personales adicionales (Tab 1)
  dateOfBirth?: string; // Fecha de nacimiento
  gender?: string; // Masculino, Femenino, Otro
  bloodType?: string; // O+, O-, A+, A-, B+, B-, AB+, AB-
  allergies?: string; // Alergias médicas

  // Datos laborales (Tab 2)
  position: string; // Puesto (Barista, Gerente, etc.) *
  department: string; // Departamento (Operaciones, Cocina, etc.) *
  hireDate: string; // Fecha de contratación *
  salary?: number; // Salario mensual
  locationIds: string[]; // Múltiples sucursales (checkboxes) *

  // Documentos oficiales México (Tab 3)
  curp?: string; // CURP 18 caracteres
  rfc?: string; // RFC 12-13 caracteres
  nss?: string; // NSS 11 dígitos
  emergencyContact?: string; // Contacto de emergencia
  emergencyContactPhone?: string; // Teléfono emergencia
  emergencyContactRelation?: string; // Parentesco

  // Dirección (Tab 4)
  address?: string; // Calle y número
  city?: string; // Ciudad
  state?: string; // Estado (dropdown 32 estados México)
  postalCode?: string; // Código postal (5 dígitos)
  notes?: string; // Notas adicionales
}
```

**Tabs Implementados**:

- **Tab 1 - Personal** 👤: firstName, lastName, email, phone, dateOfBirth, gender, bloodType, allergies
- **Tab 2 - Laboral** 💼: roleId, department, position, hireDate, salary, locationIds (multi-select)
- **Tab 3 - Documentos** 📄: curp, rfc, nss, emergencyContact/Phone/Relation
- **Tab 4 - Dirección** 📍: address, city, state (dropdown México), postalCode, notes

**Departamentos Disponibles**: Operaciones, Cocina, Barra, Gerencia, RH, Finanzas, Marketing

**Puestos Disponibles**: Barista, Cajero, Gerente de Turno, Gerente General, Supervisor, Ayudante General, Repartidor

**Estados de México**: 32 estados en dropdown (Aguascalientes, Baja California, etc.)

**Tipos de Sangre**: O+, O-, A+, A-, B+, B-, AB+, AB-

**Géneros**: Masculino, Femenino, Otro

**Hooks Implementados**:

- ✅ `useEmployees(filters?)` - Listar empleados con filtros opcionales (search, role, status)
- ✅ `useEmployee(id)` - Obtener empleado individual
- ✅ `useEmployeeStats()` - Estadísticas del dashboard
- ✅ `useCreateEmployee()` - Crear nuevo empleado (con contraseña autogenerada)
- ✅ `useUpdateEmployee()` - Actualizar empleado existente
- ✅ `useDeleteEmployee()` - Eliminar empleado

**Validaciones Implementadas**:

- Nombre requerido (firstName)
- Apellido requerido (lastName)
- Email válido requerido (regex pattern)
- Teléfono requerido
- Rol requerido (roleId)
- Departamento requerido
- Puesto requerido
- Fecha de contratación requerida
- Al menos una sucursal seleccionada (locationIds)
- CURP exactamente 18 caracteres (si se proporciona)
- RFC entre 12-13 caracteres (si se proporciona)
- NSS exactamente 11 dígitos (si se proporciona)
- Código postal 5 dígitos (si se proporciona)

**Características Especiales**:

- **Indicadores de error por tab**: AlertCircle icon rojo si el tab tiene campos con errores
- **Auto-switch**: Al intentar guardar con errores, el modal automáticamente cambia al primer tab con errores
- **Multi-select de sucursales**: Grid de checkboxes en lugar de dropdown, permite asignar empleado a múltiples ubicaciones
- **Contraseña autogenerada**: Al crear nuevo empleado, se genera contraseña aleatoria y se envía por email (pendiente integración email)
- **Información sensible**: Box azul de advertencia sobre datos personales y cumplimiento LFPDPPP
- **Conversión de datos**: handleEdit convierte Employee a EmployeeFormData con campos opcionales

**Notas Técnicas**:

- 🔴 **IMPORTANTE**: Los campos extendidos (curp, rfc, nss, salary, bloodType, allergies, etc.) NO existen actualmente en el modelo Prisma User
- 🔴 **PENDIENTE**: Migración de base de datos para agregar campos adicionales o tabla UserProfile relacionada
- ⚠️ **Mock Data**: Los hooks usan API mock con TODOs para reemplazar con llamadas backend reales
- ⚠️ **Roles y Locations**: Actualmente son arrays hardcodeados en el page, requieren hooks propios (useRoles, useLocations)
- ✅ **Compatible con patrón establecido**: Sigue la misma arquitectura que Inventario, Recetas y Proveedores

**Próximos Pasos para Empleados**:

1. Extender modelo Prisma User con campos HR o crear tabla UserProfile
2. Crear migraciones de base de datos
3. Implementar endpoints backend en NestJS
4. Reemplazar mock API en use-employees.ts con llamadas reales
5. Crear useRoles() y useLocations() hooks
6. Implementar envío de contraseña temporal por email
7. Agregar carga de avatar/foto del empleado
8. Implementar historial de cambios de datos sensibles (audit log)

---

#### 3.2. EVALUACIONES (Evaluations) - ⏳ PENDIENTE

**Location**: `apps/pos-web/src/app/hr/evaluations/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/hr/EvaluationModal.tsx`

**Campos**:

```typescript
interface EvaluationFormData {
  employeeId: string; // Dropdown de empleados
  evaluatorId: string; // Evaluador
  evaluationDate: Date; // Fecha
  period: string; // Q1 2024, etc.
  performanceRating: number; // 1-5
  technicalSkills: number; // 1-5
  customerService: number; // 1-5
  teamwork: number; // 1-5
  punctuality: number; // 1-5
  strengths: string; // Fortalezas
  areasForImprovement: string; // Áreas de mejora
  goals: string; // Objetivos
  comments: string; // Comentarios
}
```

#### 3.3. ONBOARDING (30/60/90)

**Location**: `apps/pos-web/src/app/hr/onboarding/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/hr/OnboardingModal.tsx`

**Campos**:

```typescript
interface OnboardingFormData {
  employeeId: string;
  startDate: Date;
  mentor: string; // Mentor asignado
  day30Tasks: Array<{
    // Lista de tareas días 1-30
    task: string;
    completed: boolean;
    completedDate?: Date;
  }>;
  day60Tasks: Array<{
    // Lista de tareas días 31-60
    task: string;
    completed: boolean;
    completedDate?: Date;
  }>;
  day90Tasks: Array<{
    // Lista de tareas días 61-90
    task: string;
    completed: boolean;
    completedDate?: Date;
  }>;
  notes: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
}
```

#### 3.4. CERTIFICACIONES

**Location**: `apps/pos-web/src/app/hr/certifications/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/hr/CertificationModal.tsx`

**Campos**:

```typescript
interface CertificationFormData {
  employeeId: string;
  certificationType: CertType;
  issueDate: Date;
  expiryDate: Date;
  issuer: string; // Organización emisora
  certificateNumber: string;
  documentUrl: string; // URL del documento PDF
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL';
  notes: string;
}

enum CertType {
  FOOD_SAFETY = 'Seguridad Alimentaria',
  BARISTA_BASIC = 'Barista Básico',
  BARISTA_ADVANCED = 'Barista Avanzado',
  LATTE_ART = 'Latte Art',
  FIRST_AID = 'Primeros Auxilios',
  FIRE_SAFETY = 'Protección Civil',
  NOM251 = 'NOM-251-SSA1',
  OTHER = 'Otro',
}
```

---

### 4. CALIDAD & COMPLIANCE - PRIORIDAD ALTA 🔴

**Complejidad**: Alta

#### 4.1. CHECKLISTS NOM-251

**Location**: `apps/pos-web/src/app/quality/checklists/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/quality/ChecklistModal.tsx`

**Campos**:

```typescript
interface ChecklistFormData {
  name: string; // Nombre del checklist
  category: ChecklistCategory;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  items: Array<{
    description: string;
    criticalControlPoint: boolean;
    acceptableCriteria: string;
  }>;
  assignedTo: string; // Usuario asignado
  active: boolean;
}

enum ChecklistCategory {
  CLEANING = 'Limpieza',
  FOOD_SAFETY = 'Seguridad Alimentaria',
  EQUIPMENT = 'Equipo',
  PERSONAL_HYGIENE = 'Higiene Personal',
  STORAGE = 'Almacenamiento',
  TEMPERATURE = 'Control de Temperatura',
}
```

#### 4.2. LOGS DE TEMPERATURA

**Location**: `apps/pos-web/src/app/quality/temperature-logs/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/quality/TemperatureLogModal.tsx`

**Campos**:

```typescript
interface TemperatureLogFormData {
  equipmentId: string; // Refrigerador, congelador, etc.
  temperature: number; // Temperatura medida
  unit: 'CELSIUS' | 'FAHRENHEIT';
  minThreshold: number; // Mínimo aceptable
  maxThreshold: number; // Máximo aceptable
  isWithinRange: boolean; // Auto-calculado
  recordedBy: string; // Usuario que registró
  recordedAt: Date; // Fecha/hora
  notes: string; // Observaciones
  correctiveAction?: string; // Si está fuera de rango
}
```

#### 4.3. INCIDENTES DE SEGURIDAD ALIMENTARIA

**Location**: `apps/pos-web/src/app/quality/incidents/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/quality/IncidentModal.tsx`

**Campos**:

```typescript
interface IncidentFormData {
  title: string;
  incidentType: IncidentType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  reportedBy: string;
  reportedAt: Date;
  location: string; // Área donde ocurrió
  affectedProducts: string[];
  immediateActions: string; // Acciones inmediatas tomadas
  rootCause: string; // Causa raíz
  correctiveActions: string; // Acciones correctivas
  preventiveActions: string; // Acciones preventivas
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  resolvedAt?: Date;
  followUpDate?: Date;
}

enum IncidentType {
  CONTAMINATION = 'Contaminación',
  TEMPERATURE_ABUSE = 'Abuso de Temperatura',
  CROSS_CONTAMINATION = 'Contaminación Cruzada',
  PEST_CONTROL = 'Control de Plagas',
  EQUIPMENT_FAILURE = 'Falla de Equipo',
  CUSTOMER_COMPLAINT = 'Queja de Cliente',
  OTHER = 'Otro',
}
```

---

### 5. CRM & CLIENTES - PRIORIDAD MEDIA 🟡

**Complejidad**: Media

#### 5.1. CLIENTES

**Location**: `apps/pos-web/src/app/crm/customers/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/crm/CustomerModal.tsx`

**Campos**:

```typescript
interface CustomerFormData {
  code: string; // Auto-generado
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth?: Date; // Para cumpleaños
  preferredLocation: string; // Sucursal favorita
  preferences: string; // Bebida favorita, etc.
  dietaryRestrictions: string[]; // Lactosa, gluten, etc.
  loyaltyPoints: number; // Puntos acumulados
  totalSpent: number; // Gasto total
  visitCount: number; // Número de visitas
  lastVisit?: Date;
  rfmSegment: string; // R:Recency F:Frequency M:Monetary
  marketingOptIn: boolean; // Acepta comunicaciones
  notes: string;
  active: boolean;
}
```

#### 5.2. PROGRAMAS DE LEALTAD

**Location**: `apps/pos-web/src/app/crm/loyalty/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/crm/LoyaltyProgramModal.tsx`

**Campos**:

```typescript
interface LoyaltyProgramFormData {
  name: string; // "9+1 Café Gratis"
  description: string;
  type: 'POINTS' | 'STAMP' | 'TIER';
  pointsPerPurchase: number; // Puntos por compra
  pointsPerPeso: number; // Puntos por peso gastado
  rewardThreshold: number; // Puntos para canje
  rewardValue: number; // Valor del premio
  expirationDays: number; // Días de vigencia
  terms: string; // Términos y condiciones
  active: boolean;
}
```

#### 5.3. CAMPAÑAS DE MARKETING

**Location**: `apps/pos-web/src/app/crm/campaigns/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/crm/CampaignModal.tsx`

**Campos**:

```typescript
interface CampaignFormData {
  name: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  targetSegment: string; // RFM, cumpleañeros, etc.
  subject: string; // Asunto (email)
  message: string; // Mensaje
  scheduledDate: Date; // Fecha de envío
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
  sentCount?: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
}
```

---

### 6. FINANZAS - PRIORIDAD MEDIA 🟡

**Complejidad**: Media-Alta

#### 6.1. GASTOS (Expenses)

**Location**: `apps/pos-web/src/app/finance/expenses/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/finance/ExpenseModal.tsx`

**Campos**:

```typescript
interface ExpenseFormData {
  date: Date;
  category: ExpenseCategory;
  subcategory: string;
  description: string;
  amount: number;
  currency: 'MXN' | 'USD';
  paymentMethod: string; // Efectivo, tarjeta, transferencia
  vendor: string; // Proveedor
  receiptNumber: string; // Folio de factura
  receiptUrl: string; // URL del PDF/XML
  cfdiUuid?: string; // UUID del CFDI
  location: string; // Sucursal
  department: string; // Departamento
  approvedBy?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  notes: string;
}

enum ExpenseCategory {
  INVENTORY = 'Inventario',
  PAYROLL = 'Nómina',
  RENT = 'Renta',
  UTILITIES = 'Servicios',
  MARKETING = 'Marketing',
  EQUIPMENT = 'Equipo',
  MAINTENANCE = 'Mantenimiento',
  PROFESSIONAL_SERVICES = 'Servicios Profesionales',
  TAXES = 'Impuestos',
  OTHER = 'Otro',
}
```

#### 6.2. PERMISOS Y LICENCIAS

**Location**: `apps/pos-web/src/app/finance/permits/page.tsx`

**Modal a Crear**: `apps/pos-web/src/components/finance/PermitModal.tsx`

**Campos**:

```typescript
interface PermitFormData {
  name: string;
  type: PermitType;
  issuer: string; // Autoridad emisora
  permitNumber: string;
  issueDate: Date;
  expiryDate: Date;
  cost: number;
  location: string; // Sucursal
  documentUrl: string; // URL del documento
  renewalRequired: boolean;
  renewalNotificationDays: number;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING_RENEWAL' | 'CANCELLED';
  notes: string;
}

enum PermitType {
  BUSINESS_LICENSE = 'Licencia de Funcionamiento',
  HEALTH_PERMIT = 'Permiso Sanitario',
  ALCOHOL_LICENSE = 'Licencia de Alcohol',
  FIRE_SAFETY = 'Protección Civil',
  SIGNAGE = 'Anuncio',
  MUSIC = 'Derechos de Autor (Música)',
  ENVIRONMENTAL = 'Ambiental',
  OTHER = 'Otro',
}
```

---

## 🛠️ HERRAMIENTAS Y UTILIDADES

### Componentes Reutilizables Adicionales Necesarios

#### 1. DatePicker Component

```typescript
// components/ui/DatePicker.tsx
// Para campos de fecha en formularios
// Usar react-datepicker o similar
```

#### 2. FileUpload Component

```typescript
// components/ui/FileUpload.tsx
// Para subir PDFs, imágenes, documentos
// Integrar con storage (S3, Azure Blob, etc.)
```

#### 3. DynamicList Component

```typescript
// components/ui/DynamicList.tsx
// Para listas dinámicas (ingredientes, tareas, etc.)
// Agregar/remover items con botones + y X
```

#### 4. RatingStars Component

```typescript
// components/ui/RatingStars.tsx
// Para ratings 1-5 estrellas
// Modo interactivo y solo lectura
```

#### 5. SearchableSelect Component

```typescript
// components/ui/SearchableSelect.tsx
// Dropdown con búsqueda
// Para listas largas (clientes, productos, etc.)
```

---

## 📊 PRIORIZACIÓN SUGERIDA

### FASE 1 - Crítico (Semana 1-2)

1. ✅ Inventario - COMPLETADO
2. ✅ Recetas - COMPLETADO
3. ✅ Proveedores - COMPLETADO
4. ✅ Empleados (HR) - COMPLETADO

### FASE 2 - Alta Prioridad (Semana 3-4)

5. 🔴 Checklists NOM-251 (Quality) - SIGUIENTE
6. 🟡 Clientes (CRM)
7. 🟡 Gastos (Finance)
8. 🟡 Temperature Logs (Quality)

### FASE 3 - Media Prioridad (Semana 5-6)

9. 🟢 Evaluaciones (HR)
10. 🟢 Certificaciones (HR)
11. 🟢 Programas de Lealtad (CRM)
12. 🟢 Permisos (Finance)

### FASE 4 - Completar Sistema (Semana 7-8)

13. 🔵 Onboarding (HR)
14. 🔵 Incidentes (Quality)
15. 🔵 Campañas (CRM)

---

## 🎯 CHECKLIST POR MÓDULO

Para cada módulo, verificar:

- [ ] Hook `useCreate{Entity}` existe o fue creado
- [ ] Hook `useUpdate{Entity}` existe o fue creado
- [ ] Hook `useDelete{Entity}` existe o fue creado
- [ ] Service `{entity}.service.ts` tiene métodos CRUD
- [ ] Componente `{Entity}Modal.tsx` creado
- [ ] Estado agregado a `page.tsx`
- [ ] Mutations agregadas a `page.tsx`
- [ ] Handlers agregados a `page.tsx`
- [ ] Botón "Nuevo" conectado
- [ ] Botón "Edit" conectado
- [ ] Botón "Delete" conectado
- [ ] Modales agregados antes de `</MainLayout>`
- [ ] Validación de formularios implementada
- [ ] Campos requeridos marcados
- [ ] Estados de carga funcionando
- [ ] Notificaciones toast funcionando
- [ ] Pruebas manuales: crear, editar, eliminar

---

## 📝 NOTAS IMPORTANTES

### Validaciones Comunes

- **Email**: Formato válido con regex
- **Teléfono**: 10 dígitos para México
- **RFC**: 12-13 caracteres, formato válido
- **CURP**: 18 caracteres
- **Números**: No negativos donde no aplique
- **Fechas**: Validar lógica (ej: fecha fin > fecha inicio)
- **Códigos únicos**: Verificar en backend antes de crear

### Patrones de UX

- Deshabilitar campo `code` al editar
- Mostrar loading state en botones durante guardado
- Confirmar eliminaciones con diálogo
- Mostrar toast de éxito/error
- Limpiar formulario después de crear
- Pre-llenar formulario al editar
- Validar antes de enviar al backend
- Deshabilitar botón submit si hay errores

### Integraciones Pendientes

- **Twilio**: SMS/WhatsApp para campañas
- **Mailrelay**: Email marketing
- **PAC CFDI**: Facturas electrónicas
- **File Storage**: Para documentos (recibos, certificados, etc.)

### Consideraciones Multi-Tenant

- Todos los registros deben incluir `organizationId`
- Filtrar por organización en queries
- Validar permisos RBAC antes de CRUD
- Aislar datos entre tenants

---

## 🚀 SIGUIENTE PASO INMEDIATO

**PROGRESO ACTUAL**: 4 de 15 módulos completados (26.7%)

**MÓDULOS COMPLETADOS**:

- ✅ Inventario (10 campos, categorías, unidades)
- ✅ Recetas (ingredientes dinámicos, alérgenos, validaciones complejas)
- ✅ Proveedores (18 campos, calificación por estrellas, productos dinámicos)
- ✅ Empleados (25+ campos, 4 tabs, multi-select sucursales, cumplimiento mexicano)

**PRÓXIMO MÓDULO SUGERIDO**: Calidad & Compliance - Checklists NOM-251

**Razón**:

- Requerimiento legal para operación de cafeterías en México
- Auditorías regulares requieren documentación digital
- Base para Temperature Logs e Incidentes
- Alta prioridad para compliance

**Alternativa**: CRM - Clientes

- Integración con programa de lealtad 9+1
- Base para campañas de marketing
- Crítico para operaciones de ventas
- Más sencillo que HR
- Importante para auditorías

**Archivo a trabajar**: `apps/pos-web/src/components/hr/EmployeeModal.tsx`

**Estructura sugerida**:

- Tab 1: Datos Personales (nombre, CURP, fecha nacimiento, sangre, alergias)
- Tab 2: Datos Laborales (puesto, departamento, salario, fecha ingreso)
- Tab 3: Documentos (RFC, NSS, contacto emergencia)
- Tab 4: Dirección (calle, ciudad, estado, CP)

---

## 📞 CONTACTO Y SOPORTE

Para dudas sobre implementación, consultar:

- Documentación de componentes en `components/ui/`
- Ejemplo completo en módulo de Inventario
- Prisma schema en `packages/database/prisma/schema.prisma`
- Hooks existentes en `apps/pos-web/src/hooks/`

---

**Última actualización**: 2025-10-28 - 21:15
**Estado**: Sistema parcialmente implementado - Inventario, Recetas y Proveedores completos
**Progreso**: 3/15 módulos completados (20%)
**Tiempo estimado restante**: 5-6 semanas para completar todos los módulos
