# 🔍 TODO 01: Research & User Journey Mapping

**Período**: Semana 1  
**Owner**: Product Manager + UX Designer  
**Prioridad**: 🔴 CRÍTICA  

## 📋 Objetivos

Validar el modelo de negocio con usuarios reales y mapear los flujos operativos críticos que determinarán el diseño del MVP.

## ✅ Entregables

### 1. Entrevistas Estructuradas (3 perfiles)

#### 👤 Perfil Cajero/Barista (2 entrevistas)
- [ ] **Flujo de venta completa**: desde orden hasta entrega
  - Tiempo promedio por transacción
  - Pasos que más tiempo consumen  
  - Errores frecuentes y pain points
  - Modificadores más usados (leche, tamaño, extras)

- [ ] **Gestión de inventario diaria**:
  - Cómo calculan los descuentos por receta
  - Frecuencia de conteos físicos
  - Productos que más se agotan
  - Proceso de reposición actual

- [ ] **Checklists y calidad**:
  - Rutinas de apertura/cierre actuales
  - Control de temperaturas y limpieza
  - Documentación de incidencias
  - Cumplimiento NOM-251

#### 👔 Perfil Gerente (1 entrevista)  
- [ ] **Reportes financieros**:
  - KPIs que revisa diariamente
  - Cálculo manual de P&L
  - Control de labor % y márgenes
  - Proceso actual de facturación

- [ ] **Gestión de personal**:
  - Capacitación de nuevos empleados
  - Evaluaciones de desempeño
  - Control de asistencia y turnos
  - Comunicación con equipo

- [ ] **Proveedores y compras**:
  - Proceso de órdenes de compra
  - Control de calidad en recepción
  - Gestión de lotes y fechas de caducidad
  - Scorecard informal de proveedores

### 2. Mapeo de Flujos Críticos

#### 🎯 Flujo: Venta Completa (Cliente → Pago)
```mermaid
graph LR
A[Cliente llega] → B[Toma orden] → C[Aplica modificadores] → D[Calcula total] → E[Método pago] → F[Imprime ticket] → G[Prepara bebida] → H[Entrega]
```

- [ ] Tiempo total promedio: _____ minutos
- [ ] Paso más lento: _____
- [ ] % órdenes con modificadores: _____% 
- [ ] % pagos efectivo vs tarjeta: _____% vs _____%

#### 📦 Flujo: Descuento Inventario por Receta  
```mermaid
graph LR
A[Venta cerrada] → B[Identifica receta] → C[Calcula ingredientes] → D[Descuenta del stock] → E[Actualiza costos] → F[Alerta si stock bajo]
```

- [ ] ¿Se hace automático actualmente? ❌ No / ✅ Sí
- [ ] ¿Cómo calculan el costo real por bebida?
- [ ] ¿Qué pasa si se equivocan en el descuento?

#### ✅ Flujo: Checklist Apertura/Cierre
```mermaid  
graph LR
A[Llega empleado] → B[Revisa checklist] → C[Toma temperaturas] → D[Documenta hallazgos] → E[Firma responsable] → F[Reporta anomalías]
```

- [ ] Tiempo promedio checklist apertura: _____ minutos
- [ ] Tiempo promedio checklist cierre: _____ minutos  
- [ ] ¿Usan papel o digital actualmente?
- [ ] ¿Quién valida el cumplimiento?

### 3. Validación de Assumptions del MVP

#### 💡 Assumption: "Los baristas pueden usar tablets durante horas pico"
- [ ] **Validación**: Observar 1 hora pico (8-10 AM o 2-4 PM)
- [ ] **Métricas**: 
  - Tickets atendidos por hora: _____
  - Interrupciones por minuto: _____
  - Tiempo promedio por transacción: _____
- [ ] **Insight**: ¿Es factible una interfaz táctil vs teclado?

#### 💡 Assumption: "El costeo automático por receta es crítico"  
- [ ] **Validación**: ¿Calculan margen por producto actualmente?
- [ ] **Métricas**:
  - Productos con margen <60%: _____ 
  - Frecuencia de revisión de costos: _____
  - Impacto de no saber el costo real: _____
- [ ] **Insight**: ¿Es nice-to-have o must-have?

#### 💡 Assumption: "Checklists digitales mejoran compliance"
- [ ] **Validación**: Revisar checklists de última semana
- [ ] **Métricas**:
  - % completitud actual: _____%
  - Incidencias no documentadas: _____
  - Tiempo perdido buscando formatos: _____ min/día
- [ ] **Insight**: ¿El problema es el formato o la disciplina?

### 4. Definición de Pantallas MVP

#### 🏪 POS Core Screens (5 pantallas)
- [ ] **Dashboard**: grid de productos + carrito lateral
- [ ] **Modificadores**: overlay con opciones de leche, tamaño, extras
- [ ] **Checkout**: múltiples pagos + propina + CFDI opcional
- [ ] **Inventario rápido**: stock actual + alertas críticas  
- [ ] **Checklist diario**: tareas pendientes + captura rápida

#### 📱 Mobile Screens (3 pantallas)
- [ ] **Checklist ejecutor**: lista de tareas + captura evidencia
- [ ] **Temperatura logger**: termómetro digital + histórico
- [ ] **Recetas consulta**: pasos + parámetros + video corto

#### 📊 Dashboard Screens (4 pantallas)
- [ ] **KPIs diarios**: tickets, revenue, avg ticket, top products
- [ ] **Inventario**: stock vs par level + órdenes sugeridas  
- [ ] **Calidad**: compliance % + alertas + trends temperaturas
- [ ] **Finanzas**: P&L simple + labor % + margen por categoría

## 🎯 Criterios de Aceptación

### Research Quality Gates
- [ ] ✅ 3 entrevistas completadas con grabación y transcripción
- [ ] ✅ Flujos críticos validados con tiempos reales  
- [ ] ✅ 3 assumptions principales validadas o refutadas
- [ ] ✅ Pain points priorizados por impacto vs frecuencia

### UX Validation Gates  
- [ ] ✅ Wireframes validados con al menos 1 usuario por pantalla
- [ ] ✅ Flujo POS completo navegable en <30 segundos
- [ ] ✅ Checklist mobile usable con una sola mano
- [ ] ✅ Dashboard comprensible sin capacitación previa

### Technical Feasibility Gates
- [ ] ✅ Integraciones críticas confirmadas (impresora, pagos, CFDI)
- [ ] ✅ Arquitectura offline-first validada técnicamente
- [ ] ✅ Performance targets definidos (30 tickets en 20 min)
- [ ] ✅ Security requirements mapeados (RBAC, multi-tenant)

## 📊 Herramientas

### Research & Documentation
- **Zoom/Teams**: Grabación de entrevistas
- **Miro**: Journey mapping y user flows  
- **Notion**: Base de conocimiento centralizada
- **Loom**: Screen recordings de procesos actuales

### Prototyping & Validation
- **Figma**: Wireframes y prototipos navegables
- **Maze**: Testing de usabilidad no moderado
- **Hotjar**: Heatmaps y session recordings (si hay web actual)

## 🚀 Entregables Finales

### 1. Research Report (15-20 páginas)
```markdown
# CoffeeOS MVP - User Research Report

## Executive Summary
- 3 key insights que cambiarán el diseño
- 2 assumptions refutadas que evitamos construir
- 1 surprise finding que agrega valor inesperado

## User Personas Validadas  
- Cajero/Barista: goals, frustrations, workflows
- Gerente: KPIs, decisions, pain points

## Journey Maps
- Venta completa: current state vs ideal state
- Inventario: manual vs automated workflows  
- Checklists: paper vs digital compliance

## Prioritized Feature List
- Must-have (MVP): 8-10 features críticas
- Should-have (V1.1): 5-7 features importantes  
- Nice-to-have (V2.0): 3-5 features deseables
```

### 2. UX Wireframes Package
- [ ] 📱 **12 pantallas** wireframed en Figma
- [ ] 🔄 **3 flujos críticos** navegables e interactivos
- [ ] 📋 **Design system basics**: grid, tipografía, iconografía
- [ ] ✅ **Usability testing** con 3 usuarios reales

### 3. Technical Requirements Doc
```typescript
// Ejemplo: Performance Requirements
interface PerformanceTargets {
  posTransactionTime: '< 30 seconds', // orden → pago
  inventorySync: '< 5 seconds',      // offline → online  
  dashboardLoad: '< 3 seconds',      // cold start
  concurrentUsers: 10,               // por tienda
  offlineCapacity: '8 hours',        // sin conexión
}
```

## 🔗 Dependencies & Handoffs

### ⬅️ Inputs Needed
- [ ] ✅ Lista de cafeterías dispuestas a ser entrevistadas
- [ ] ✅ Acceso a sistemas actuales (POS, inventarios, reportes)  
- [ ] ✅ Documentación existente (manuales, checklists, recetas)

### ➡️ Outputs for Next Phase
- [ ] ✅ **Detailed wireframes** → TODO 02 (Diseño UX Sistema POS)
- [ ] ✅ **API requirements** → TODO 04 (API Core - Autenticación)  
- [ ] ✅ **Component list** → TODO 03 (Componentes UI Base)
- [ ] ✅ **Performance targets** → TODO 07 (Interfaz POS Web PWA)

---

**⏰ Deadline**: Viernes Semana 1  
**👥 Stakeholders**: Product Manager, UX Designer, Tech Lead  
**📧 Report to**: CTO + Founder  

*Research is the foundation - measure twice, cut once! 🔍✂️*