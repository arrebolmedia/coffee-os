# Plan de Desarrollo - Módulos Restantes CoffeeOS

**Fecha:** 24 de Octubre, 2025  
**Estado:** 8/25 módulos completados (32%)  
**Meta:** Completar todos los módulos frontend

## 📊 Estado Actual

### ✅ Módulos Completados (8)

1. ✅ Proveedores - 6 proveedores con ratings y contactos
2. ✅ Ubicaciones - 5 sucursales con métricas
3. ✅ Organización - Configuración fiscal/legal
4. ✅ Integraciones - 6 servicios (Twilio, Mailrelay, PAC, etc.)
5. ✅ Costeo - 8 productos con análisis de márgenes
6. ✅ Nómina - 6 empleados con cálculos IMSS/ISR
7. ✅ Asistencia - 8 registros con check-in/out
8. ✅ Capacitación - 6 programas 30/60/90

---

## 🎯 Plan de Desarrollo - 17 Módulos Restantes

### **FASE 1: Calidad & Compliance (3 módulos)** 🏥

_Prioridad: ALTA - Requisitos NOM-251 y legales_

#### 9. Temperaturas (NOM-251) ⏱️ ~45 min

**Archivo:** `apps/pos-web/src/app/temperatures/page.tsx`

**Mock Data:**

- 10-12 registros de temperatura (refrigeradores, congeladores, exhibidores)
- Logs cada 2-4 horas
- Estados: normal, alerta, crítico
- Rangos por tipo de equipo

**Características:**

- Tabla de registros con fecha/hora
- Gráficos de temperatura por equipo
- Alertas de fuera de rango
- Filtros por ubicación, equipo, fecha
- Stats: equipos monitoreados, alertas activas, cumplimiento %
- Botón "Registrar Temperatura"
- Indicadores visuales de temperatura (colores)

**Iconos:** Thermometer, AlertTriangle, CheckCircle, TrendingUp, Refrigerator

---

#### 10. Permisos y Licencias ⏱️ ~40 min

**Archivo:** `apps/pos-web/src/app/permits/page.tsx`

**Mock Data:**

- 8-10 permisos (sanitarios, bomberos, alcohol, COFEPRIS, etc.)
- Estados: vigente, por vencer (30 días), vencido
- Fechas emisión/vencimiento
- Documentos asociados

**Características:**

- Lista/tabla de permisos
- Semáforo de vencimientos
- Alertas de renovación
- Documentos descargables
- Filtros por tipo, estado, ubicación
- Stats: total, vigentes, por vencer, vencidos
- Calendario de renovaciones

**Iconos:** FileText, Calendar, AlertCircle, CheckCircle, Download, Building

---

#### 11. Auditorías ⏱️ ~40 min

**Archivo:** `apps/pos-web/src/app/audits/page.tsx`

**Mock Data:**

- 6-8 auditorías (internas, externas, COFEPRIS, sorpresa)
- Hallazgos con severidad (crítico, alto, medio, bajo)
- Acciones correctivas con responsables
- Estados: programada, en proceso, completada

**Características:**

- Lista de auditorías con resultados
- Detalle de hallazgos por auditoría
- Planes de acción correctiva
- Seguimiento de cumplimiento
- Filtros por tipo, ubicación, fecha, estado
- Stats: total auditorías, hallazgos abiertos, tasa de cumplimiento
- Timeline de auditorías

**Iconos:** ClipboardCheck, Search, AlertTriangle, CheckCircle, FileText, Calendar

---

### **FASE 2: HR Complementario (2 módulos)** 👥

_Prioridad: MEDIA-ALTA_

#### 12. Evaluaciones de Desempeño ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/evaluations/page.tsx`

**Mock Data:**

- 6-8 evaluaciones de empleados
- Categorías: desempeño, actitud, habilidades técnicas, trabajo en equipo
- Calificaciones 1-5
- Comentarios y retroalimentación
- Objetivos y planes de mejora

**Características:**

- Lista de evaluaciones pendientes/completadas
- Formulario de evaluación con categorías
- Gráficos radiales de competencias
- Comparativa período anterior
- Filtros por empleado, período, ubicación
- Stats: promedio general, por categoría, tendencias
- Planes de desarrollo individual

**Iconos:** Star, TrendingUp, Target, Award, Users, BarChart

---

#### 13. Onboarding (Incorporación) ⏱️ ~45 min

**Archivo:** `apps/pos-web/src/app/onboarding/page.tsx`

**Mock Data:**

- 4-6 empleados en proceso de onboarding
- Checklist de tareas (documentos, uniformes, capacitación inicial, etc.)
- Progreso por etapa
- Días transcurridos desde inicio

**Características:**

- Dashboard de nuevos empleados
- Checklist interactivo por empleado
- Progreso visual (barra de porcentaje)
- Documentos pendientes
- Asignación de mentor/buddy
- Filtros por ubicación, estado
- Stats: en proceso, completados, promedio días
- Timeline de incorporación

**Iconos:** UserPlus, CheckSquare, Clock, FileText, Users, Award

---

### **FASE 3: Finanzas & Contabilidad (5 módulos)** 💰

_Prioridad: ALTA - Core del negocio_

#### 14. Contabilidad ⏱️ ~60 min

**Archivo:** `apps/pos-web/src/app/accounting/page.tsx`

**Mock Data:**

- 15-20 movimientos contables recientes
- Cuentas del catálogo (activo, pasivo, capital, ingresos, gastos)
- Balanza de comprobación
- Polizas (ingresos, egresos, diario)

**Características:**

- Catálogo de cuentas
- Registro de polizas
- Balanza de comprobación
- Conciliaciones bancarias
- Filtros por cuenta, tipo, fecha, ubicación
- Stats: balance general, flujo mensual
- Exportación a Excel/PDF

**Iconos:** Calculator, DollarSign, FileText, TrendingUp, BarChart, Download

---

#### 15. CFDI (Facturación Electrónica) ⏱️ ~60 min

**Archivo:** `apps/pos-web/src/app/cfdi/page.tsx`

**Mock Data:**

- 10-15 facturas emitidas
- Estados: vigente, cancelada, pendiente de timbrado
- Datos fiscales completos
- UUID y sello digital

**Características:**

- Lista de facturas emitidas
- Formulario emisión CFDI 4.0
- Cancelación con motivo
- Complementos de pago
- Envío por email
- Descarga XML/PDF
- Filtros por cliente, fecha, estado, tipo
- Stats: emitidas, canceladas, monto total, IVA
- Integración con PAC (mock)

**Iconos:** Receipt, Send, Download, XCircle, CheckCircle, FileText, Mail

---

#### 16. Gastos ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/expenses/page.tsx`

**Mock Data:**

- 12-15 gastos registrados
- Categorías (renta, servicios, suministros, marketing, etc.)
- Comprobantes adjuntos
- Estados: pendiente, aprobado, rechazado, pagado

**Características:**

- Registro de gastos
- Carga de comprobantes
- Flujo de aprobación
- Categorización automática
- Filtros por categoría, ubicación, estado, fecha
- Stats: total mensual, por categoría, pendientes de aprobar
- Gráficos de gastos por categoría
- Comparativa vs presupuesto

**Iconos:** Receipt, Upload, DollarSign, TrendingDown, PieChart, CheckCircle

---

#### 17. P&L (Estado de Resultados) ⏱️ ~60 min

**Archivo:** `apps/pos-web/src/app/pnl/page.tsx`

**Mock Data:**

- P&L mensual por sucursal
- Ingresos desglosados
- Costos de ventas
- Gastos operativos
- EBITDA y utilidad neta

**Características:**

- Vista P&L por período
- Comparativa mes/mes, año/año
- Drill-down por sucursal
- Gráficos de márgenes
- Análisis de variaciones
- Filtros por período, ubicación
- Stats: margen bruto, margen operativo, margen neto
- Exportación a Excel
- Proyecciones

**Iconos:** TrendingUp, DollarSign, BarChart, PieChart, Calculator, Download

---

#### 18. Presupuestos ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/budgets/page.tsx`

**Mock Data:**

- Presupuestos anuales por categoría
- Presupuesto mensual desglosado
- Real vs presupuestado
- Variaciones (+/-)

**Características:**

- Creación de presupuestos
- Vista por categoría y período
- Comparativa real vs presupuesto
- Variaciones con semáforo
- Forecasting
- Filtros por año, mes, categoría, ubicación
- Stats: cumplimiento %, variación $, proyección anual
- Gráficos de tendencias
- Alertas de desviaciones

**Iconos:** Target, TrendingUp, AlertTriangle, Calculator, BarChart, Calendar

---

### **FASE 4: CRM & Marketing (4 módulos)** 🎯

_Prioridad: MEDIA - Fidelización_

#### 19. Programa de Lealtad 9+1 ⏱️ ~55 min

**Archivo:** `apps/pos-web/src/app/loyalty/page.tsx`

**Mock Data:**

- Configuración del programa (puntos por compra, niveles)
- 10-12 clientes con puntos acumulados
- Historial de redenciones
- Recompensas disponibles

**Características:**

- Configuración del programa
- Reglas de acumulación
- Niveles de membresía (Bronce, Plata, Oro, VIP)
- Catálogo de recompensas
- Dashboard de participación
- Filtros por nivel, actividad
- Stats: clientes activos, puntos emitidos, redenciones, tasa de participación
- Análisis de engagement

**Iconos:** Gift, Star, Award, TrendingUp, Heart, Users

---

#### 20. Campañas de Marketing ⏱️ ~55 min

**Archivo:** `apps/pos-web/src/app/campaigns/page.tsx`

**Mock Data:**

- 6-8 campañas (email, SMS, WhatsApp)
- Estados: borrador, programada, enviada, completada
- Métricas: enviados, abiertos, clicks, conversiones
- Templates de mensajes

**Características:**

- Creación de campañas
- Editor de templates
- Segmentación de audiencia
- Programación de envíos
- Métricas en tiempo real
- A/B testing
- Filtros por canal, estado, fecha
- Stats: tasa de apertura, CTR, conversión, ROI
- Dashboard de rendimiento

**Iconos:** Send, Mail, MessageSquare, TrendingUp, Users, Target, BarChart

---

#### 21. Segmentación RFM ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/segmentation/page.tsx`

**Mock Data:**

- Clientes segmentados por RFM
- Scoring calculado (1-5 por dimensión)
- Segmentos: Campeones, Leales, Potenciales, En Riesgo, Perdidos
- Acciones sugeridas por segmento

**Características:**

- Análisis RFM automático
- Matriz de segmentación
- Perfiles por segmento
- Tamaño y valor de cada segmento
- Acciones recomendadas
- Filtros por segmento, ubicación
- Stats: distribución de clientes, valor por segmento
- Gráficos de dispersión RFM
- Exportación de listas

**Iconos:** Users, PieChart, Target, TrendingUp, Filter, Star

---

#### 22. Mensajería WhatsApp/SMS ⏱️ ~50 min

**Archivo:** `apps/pos-web\src\app\messaging\page.tsx`

**Mock Data:**

- 15-20 mensajes enviados/recibidos
- Conversaciones activas
- Templates aprobados
- Respuestas automatizadas

**Características:**

- Interfaz de conversaciones
- Envío individual y masivo
- Templates de mensajes
- Respuestas rápidas
- Historial de conversaciones
- Filtros por estado, canal, fecha
- Stats: enviados, entregados, leídos, respondidos
- Integración con Twilio (mock)
- Programación de mensajes

**Iconos:** MessageSquare, Send, Clock, CheckCircle, Phone, Users

---

### **FASE 5: Analytics & Dashboards (5 módulos)** 📊

_Prioridad: MEDIA - Inteligencia de negocio_

#### 23. Dashboard Ejecutivo ⏱️ ~60 min

**Archivo:** `apps/pos-web/src/app/analytics/executive/page.tsx`

**Mock Data:**

- KPIs principales consolidados
- Métricas de todas las áreas
- Comparativas período anterior
- Alertas y notificaciones importantes

**Características:**

- Vista de alto nivel
- KPIs principales: ventas, utilidad, clientes, eficiencia
- Gráficos de tendencias
- Comparativa mensual/anual
- Top productos y sucursales
- Alertas de negocio
- Métricas financieras clave
- Indicadores operativos
- Drill-down a módulos específicos

**Iconos:** LayoutDashboard, TrendingUp, DollarSign, Users, AlertCircle, BarChart

---

#### 24. Analytics: Ventas ⏱️ ~55 min

**Archivo:** `apps/pos-web/src/app/analytics/sales/page.tsx`

**Mock Data:**

- Ventas por hora/día/semana/mes
- Ventas por producto y categoría
- Ventas por sucursal
- Tickets promedio
- Mix de productos

**Características:**

- Gráficos de ventas temporales
- Top productos vendidos
- Análisis de tickets
- Productos con mejor margen
- Horarios pico
- Comparativas períodos
- Filtros por fecha, sucursal, categoría
- Stats: venta total, ticket promedio, items por ticket, margen promedio
- Exportación de reportes

**Iconos:** TrendingUp, ShoppingCart, DollarSign, BarChart, PieChart, Clock

---

#### 25. Analytics: Inventario ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/analytics/inventory/page.tsx`

**Mock Data:**

- Rotación de inventario
- Productos con baja rotación
- Mermas y desperdicios
- Valorización de inventario
- Puntos de reorden

**Características:**

- Análisis de rotación ABC
- Productos de movimiento lento
- Análisis de mermas
- Costo de inventario
- Proyecciones de reorden
- Filtros por categoría, sucursal, período
- Stats: rotación promedio, días de inventario, merma %, valor total
- Gráficos de tendencias
- Alertas de reorden

**Iconos:** Package, TrendingDown, AlertTriangle, DollarSign, BarChart, RefreshCw

---

#### 26. Analytics: HR ⏱️ ~50 min

**Archivo:** `apps/pos-web/src/app/analytics/hr/page.tsx`

**Mock Data:**

- Rotación de personal
- Productividad por empleado
- Costos laborales
- Asistencia y puntualidad
- Capacitación y desarrollo

**Características:**

- Tasa de rotación
- Análisis de ausentismo
- Productividad por sucursal
- Costos laborales vs ventas
- Progreso de capacitación
- Filtros por período, ubicación, puesto
- Stats: empleados activos, rotación %, costo laboral %, asistencia %
- Gráficos de tendencias
- Benchmarking entre sucursales

**Iconos:** Users, TrendingUp, DollarSign, Clock, Award, BarChart

---

#### 27. Analytics: KPIs ⏱️ ~55 min

**Archivo:** `apps/pos-web/src/app/analytics/kpis/page.tsx`

**Mock Data:**

- KPIs financieros (ROI, EBITDA, margen)
- KPIs operativos (eficiencia, productividad)
- KPIs de clientes (LTV, CAC, retención)
- KPIs de calidad (NPS, satisfacción)

**Características:**

- Dashboard de KPIs categorizados
- Semáforo de cumplimiento
- Tendencias históricas
- Metas vs reales
- Comparativa entre sucursales
- Filtros por categoría, período
- Stats: cumplimiento global, KPIs críticos, mejora/deterioro
- Gráficos de performance
- Alertas de desviaciones

**Iconos:** Target, TrendingUp, AlertCircle, CheckCircle, BarChart, Award

---

### **FASE 6: Sistema (1 módulo)** 🔔

_Prioridad: ALTA - UX crítica_

#### 28. Notificaciones ⏱️ ~45 min

**Archivo:** `apps/pos-web/src/app/notifications/page.tsx`

**Mock Data:**

- 20-30 notificaciones de diferentes tipos
- Alertas, recordatorios, actividades
- Estados: nueva, leída, archivada
- Prioridades: alta, media, baja

**Características:**

- Centro de notificaciones
- Categorización por tipo
- Filtros por estado, prioridad, módulo
- Notificaciones en tiempo real
- Acciones rápidas desde notificación
- Configuración de preferencias
- Historial de notificaciones
- Stats: no leídas, por prioridad
- Integración con todos los módulos
- Sistema de badges

**Iconos:** Bell, AlertCircle, CheckCircle, Clock, Settings, Filter

---

## 📈 Métricas de Progreso

### Por Fase:

- **Fase 1 (Calidad):** 3 módulos - ~2h 5min
- **Fase 2 (HR):** 2 módulos - ~1h 35min
- **Fase 3 (Finanzas):** 5 módulos - ~4h 40min
- **Fase 4 (CRM):** 4 módulos - ~3h 30min
- **Fase 5 (Analytics):** 5 módulos - ~4h 30min
- **Fase 6 (Sistema):** 1 módulo - ~45min

### Tiempo Total Estimado: ~17 horas

### Distribución Recomendada:

- **Día 1:** Fase 1 (Calidad) - 3 módulos
- **Día 2:** Fase 2 (HR) + 2 módulos Fase 3 - 4 módulos
- **Día 3:** Resto Fase 3 (Finanzas) - 3 módulos
- **Día 4:** Fase 4 (CRM) - 4 módulos
- **Día 5:** Fase 5 (Analytics) - 5 módulos
- **Día 6:** Fase 6 (Sistema) + Revisión - 1 módulo

---

## 🎨 Estándares de Implementación

### Estructura Común:

```typescript
// 1. Imports
import { MainLayout } from '@/components/layout/MainLayout';
import { iconos necesarios } from 'lucide-react';

// 2. Interfaces TypeScript
interface DataType {
  // campos según módulo
}

// 3. Component
export default function ModulePage() {
  // Estados
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({...});

  // Mock Data (6-15 registros)
  const mockData: DataType[] = [...];

  // Filtros y Stats
  const filteredData = mockData.filter(...);
  const stats = { ... };

  // Helper functions
  const getStatusBadge = (status: string) => {...};

  // Render
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header con título e icono */}
        {/* Stats Cards (4-5) */}
        {/* Filtros (3-4) */}
        {/* Tabla principal */}
        {/* Info Footer */}
      </div>
    </MainLayout>
  );
}
```

### Componentes Estándar:

- ✅ MainLayout wrapper
- ✅ Header con icono y título
- ✅ 4-5 Stats Cards con `shadow p-4`
- ✅ Filtros con íconos posicionados
- ✅ Tabla responsive con `overflow-x-auto`
- ✅ Estados con badges de colores
- ✅ Empty state cuando no hay datos
- ✅ Info footer con contexto
- ✅ Acciones (ver, editar) con íconos

### Paleta de Colores por Módulo:

- 🏥 Calidad: `blue-600`
- 👥 HR: `purple-600`
- 💰 Finanzas: `green-600`
- 🎯 CRM: `orange-600`
- 📊 Analytics: `indigo-600`
- 🔔 Sistema: `red-600`

---

## ✅ Checklist de Calidad

Cada módulo debe cumplir:

- [ ] Sin errores de TypeScript
- [ ] MainLayout wrapper presente
- [ ] Responsive (mobile, tablet, desktop)
- [ ] Iconos de Lucide React
- [ ] Mock data realista (6-15 registros)
- [ ] Filtros funcionales
- [ ] Stats calculadas correctamente
- [ ] Badges de estado con colores
- [ ] Empty state implementado
- [ ] Consistencia visual con módulos existentes
- [ ] Info footer con contexto mexicano cuando aplique

---

## 🚀 Siguiente Paso

**Comenzar con:** Temperaturas (NOM-251)  
**Razón:** Requisito legal prioritario para operación de alimentos

¿Listo para iniciar?
