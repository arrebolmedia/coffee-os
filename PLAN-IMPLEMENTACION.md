# 🚀 Plan de Implementación CoffeeOS - MVP (12 semanas)

**Basado en la Visión del Producto - Traduciendo el Plan Maestro en Software Operativo**

## 📊 Estado Actual: FASE 1 COMPLETADA

✅ **Infraestructura Base**: Arquitectura técnica, estructura de proyecto y servicios core  
✅ **Tecnologías**: NestJS + Next.js + React Native + PostgreSQL + Redis configurados  
✅ **Integraciones**: Baserow, n8n, Twilio, Mailrelay, PAC CFDI preparados  
✅ **Esquema Base**: 37+ tablas definidas en Prisma con RBAC multi-tenant

## 🎯 Objetivo MVP (Semana 12)

**Operar 1 tienda real con**:

- POS completo con modificadores y combos
- Recetas/costeo automático con alertas de margen
- Inventario por receta con descuentos automáticos
- Checklists NOM-251 con firmas digitales
- Programa 9+1 y NPS post-visita
- Tablero diario con KPIs operativos
- CFDI básico en caja

---

# 🗓️ CRONOGRAMA DETALLADO

## 🔥 SEMANAS 1-2: Descubrimiento + UX Core

### **TODO 01: Research & User Journey Mapping**

- [ ] Entrevistas con 3 perfiles: cajero/barista/gerente
- [ ] Mapear flujos críticos: venta completa, apertura/cierre, inventario
- [ ] Definir pantallas MVP y componentes UI prioritarios
- [ ] Validar workflows de recetas y costeo automático

### **TODO 02: Diseño UX Sistema POS**

- [ ] Wireframes de pantallas POS: catálogo, modificadores, combos, checkout
- [ ] Flujo de pagos múltiples y propinas
- [ ] Interfaz de impresión térmica y CFDI
- [ ] Prototipo navegable en Figma para validación

### **TODO 03: Componentes UI Base**

- [ ] Design System: colores, tipografía, espaciado
- [ ] Componentes críticos: Button, Input, Modal, DataTable, Form
- [ ] Iconografía coffee-shop específica
- [ ] Responsive patterns para tablet POS

---

## ⚡ SEMANAS 3-4: Core POS + API Foundation

### **TODO 04: API Core - Autenticación y Tenants**

- [ ] Implementar JWT + refresh tokens
- [ ] Middleware multi-tenant por `org_id`
- [ ] RBAC con 7 roles: Propietario, Gerente, Líder, Barista, Caja, Auditor, Contador
- [ ] Endpoints `/auth/login`, `/auth/refresh`, `/organizations`

### **TODO 05: Módulo Productos y Catálogo**

- [ ] CRUD productos con categorías y modificadores
- [ ] Gestión de combos y promociones
- [ ] Sincronización offline con IndexedDB
- [ ] API: `/products`, `/categories`, `/modifiers`

### **TODO 06: POS Engine - Tickets y Payments**

- [ ] Motor de tickets con líneas y modificadores
- [ ] Cálculo de impuestos y propinas
- [ ] Múltiples métodos de pago por ticket
- [ ] Cola offline y sincronización automática
- [ ] APIs: `/pos/tickets`, `/pos/payments`

### **TODO 07: Interfaz POS Web (PWA)**

- [ ] Pantalla principal: grid de productos responsive
- [ ] Carrito interactivo con modificadores
- [ ] Checkout con múltiples pagos
- [ ] Modo offline con service workers
- [ ] Instalación PWA optimizada

---

## 🍯 SEMANAS 5-6: Recetas, Costeo e Inventario

### **TODO 08: Módulo Recetas y Fichas Técnicas**

- [ ] CRUD recetas con ingredientes y proporciones
- [ ] Calculadora de yield y costos automáticos
- [ ] Parámetros por método: espresso, V60, cold brew
- [ ] Gestión de alérgenos y información nutricional
- [ ] API: `/recipes`, `/recipe-ingredients`

### **TODO 09: Sistema de Costeo Automático**

- [ ] Cálculo de COGS por receta en tiempo real
- [ ] Alertas de margen < 60% en POS
- [ ] Reporte de rentabilidad por producto
- [ ] Integración con movimientos de inventario

### **TODO 10: Inventario por Receta**

- [ ] Descuento automático por venta (qty \* recipe.ingredients)
- [ ] Par levels y alertas de stock bajo
- [ ] Recepción con códigos de lote y fechas
- [ ] Movimientos: entrada, salida, ajuste, merma
- [ ] APIs: `/inventory/items`, `/inventory/movements`

### **TODO 11: Interfaz Inventario y Recetas**

- [ ] Dashboard de stock actual vs par levels
- [ ] Pantalla de recepción con cámara para lotes
- [ ] Editor de recetas drag & drop
- [ ] Calculadora de costos interactiva

---

## 📋 SEMANAS 7-8: Calidad NOM-251 + CRM Base

### **TODO 12: Checklists y Quality Control**

- [ ] Motor de checklists: apertura, cierre, medio turno, NOM-251
- [ ] Tipos de validación: yes/no, número, foto, firma, temperatura
- [ ] Logs de temperatura con alertas fuera de rango (1-4°C)
- [ ] Registro de PPM, TDS y limpieza
- [ ] APIs: `/checklists`, `/task-runs`, `/quality-logs`

### **TODO 13: Interfaz Calidad Móvil**

- [ ] App móvil para checklists con offline-first
- [ ] Captura de fotos con geolocalización
- [ ] Firmas digitales con canvas
- [ ] Termómetro digital y logs automáticos
- [ ] Sincronización automática al recuperar conexión

### **TODO 14: Sistema CRM Base**

- [ ] Registro de clientes con datos mínimos
- [ ] Gestión de consentimientos LFPDPPP
- [ ] Segmentación RFM básica (Reciente, Frecuente, Monetario)
- [ ] APIs: `/customers`, `/consents`, `/loyalty`

### **TODO 15: Programa 9+1 Digital**

- [ ] Acumulación automática por venta
- [ ] Canje en POS con validación
- [ ] Wallet de puntos por cliente
- [ ] Campañas de cumpleaños automáticas

---

## 📊 SEMANAS 9-10: Analytics + Finanzas Base

### **TODO 16: KPIs y Analytics Core**

- [ ] Cálculo automático de KPIs diarios: tickets, ticket promedio, mix
- [ ] Tiempos de servicio p50/p90 por método
- [ ] Ranking de productos por contribución y margen
- [ ] Labor % y mermas por ubicación
- [ ] APIs: `/analytics/daily`, `/analytics/weekly`

### **TODO 17: Dashboard Operativo**

- [ ] Tablero tiempo real con métricas del día
- [ ] Gráficos de tendencias semanales/mensuales
- [ ] Top/bottom products por rentabilidad
- [ ] Alertas visuales: stock bajo, margen bajo, tiempos altos

### **TODO 18: Módulo Finanzas Básico**

- [ ] P&L simple por tienda con COGS automático
- [ ] Punto de equilibrio: tickets/día target
- [ ] Seguimiento de labor % vs ventas
- [ ] Exportación a Excel/PDF para contador

### **TODO 19: CFDI Básico en Caja**

- [ ] Integración con PAC (Facturama/sandbox)
- [ ] Formulario RFC con validación SAT
- [ ] Generación XML/PDF automática
- [ ] Envío por email al cliente
- [ ] API: `/invoices/cfdi`

---

## 🔧 SEMANAS 11-12: Integraciones + Testing + Deploy

### **TODO 20: Integración Twilio WhatsApp**

- [ ] Setup de WhatsApp Business API
- [ ] Templates aprobados: bienvenida, cumpleaños, NPS
- [ ] Envío automático post-venta con n8n
- [ ] Validación de firmas y opt-out management
- [ ] Webhook: `/webhooks/twilio/whatsapp`

### **TODO 21: Integración Mailrelay**

- [ ] Configuración DKIM/SPF para dominio
- [ ] Listas automáticas por segmento RFM
- [ ] Templates HTML responsive ES-MX
- [ ] Campañas programadas y transaccionales
- [ ] Webhook events: `/webhooks/mailrelay/events`

### **TODO 22: Workflows n8n Core**

- [ ] Stock bajo → WhatsApp al gerente
- [ ] Venta cerrada → NPS después de 2h
- [ ] Cliente nuevo → bienvenida multicanal
- [ ] Cumpleaños → campaign automática
- [ ] Temperaturas anómalas → alerta inmediata

### **TODO 23: Sistema de Permisos y Compliance**

- [ ] Catálogo de permisos: Uso de Suelo, Funcionamiento, PC, Anuncios
- [ ] RRULE para renovaciones automáticas
- [ ] Almacenamiento de documentos PDF
- [ ] Recordatorios programados por n8n
- [ ] API: `/permits`, `/permit-renewals`

### **TODO 24: Testing Integral**

- [ ] Tests unitarios >80% coverage para APIs core
- [ ] Tests E2E: flujo completo venta → inventory → analytics
- [ ] Tests de carga: 30 tickets en 20 minutos
- [ ] Validación offline/online synchronization
- [ ] Performance: APIs <200ms p90

### **TODO 25: Infraestructura Producción**

- [ ] Docker containers optimizados
- [ ] CI/CD pipeline con GitHub Actions
- [ ] Monitoring con Prometheus + Grafana
- [ ] Backups automáticos PostgreSQL + Redis
- [ ] SSL certificates y dominio de producción

### **TODO 26: Migración de Datos Inicial**

- [ ] Importadores desde Excel/CSV del Plan Maestro
- [ ] Catálogo de productos base con recetas estándar
- [ ] Checklists NOM-251 predefinidos
- [ ] Templates de comunicación en español mexicano
- [ ] Usuarios y permisos de prueba

### **TODO 27: Go-Live y Capacitación**

- [ ] Manuales de usuario por rol
- [ ] Capacitación in-situ: caja, barista, gerente
- [ ] Periodo de acompañamiento 1 semana
- [ ] Métricas baseline y metas iniciales
- [ ] Plan de soporte post-lanzamiento

---

# 📋 Checklist de Validación MVP

## 🚀 Criterios de Éxito Técnicos

### Performance & Reliability

- [ ] ⚡ API response time p90 < 200ms
- [ ] 📱 PWA load time < 3s (3G network)
- [ ] 🔄 Offline sync < 5s after reconnection
- [ ] 🧪 Test coverage > 80% on core modules
- [ ] 📊 Uptime > 99.5% (4h downtime/month max)

### User Experience

- [ ] 📲 PWA installable on Android/iOS
- [ ] 👆 Touch-friendly POS on 10" tablets
- [ ] ⌨️ Keyboard shortcuts for power users
- [ ] 🌐 Responsive design mobile → desktop
- [ ] ♿ Accessibility AA compliance

### Security & Compliance

- [ ] 🔐 Multi-tenant data isolation verified
- [ ] 👥 RBAC permissions working correctly
- [ ] 📝 LFPDPPP consent management active
- [ ] 🧾 CFDI 4.0 sandbox validated
- [ ] 🔒 Data encryption in transit + at rest

## 💼 Criterios de Éxito de Negocio

### Operación Diaria

- [ ] ⏱️ Servicio barra p90 < 3 minutos
- [ ] 📦 Reposiciones no programadas ≤ 1%
- [ ] ✅ Cumplimiento checklists ≥ 95%
- [ ] 🎯 Precisión de inventario ≥ 98%

### Finanzas & Rentabilidad

- [ ] 💰 Margen bruto ≥ 65% (alertas funcionando)
- [ ] 👥 Labor % ≤ 25% de ventas
- [ ] 📊 P&L automatizado sin errores manuales
- [ ] 🧾 CFDI generado <30 segundos

### Crecimiento & Lealtad

- [ ] ⭐ Rating Google Maps ≥ 4.6
- [ ] 🔄 Tasa recompra 30 días ↑10%
- [ ] 🎁 Canje 9+1 = 12-18% de tickets
- [ ] 📱 NPS post-visita >70% respuesta

### Cumplimiento & Calidad

- [ ] 📋 Bitácoras temperatura completas diarias
- [ ] 🏛️ Permisos vigentes (alertas preventivas)
- [ ] 🔍 Auditoría interna mensual sin observaciones
- [ ] 📞 0 multas regulatorias relacionadas

---

# 🎯 Roadmap Post-MVP (Semanas 13-24)

## 🚀 Fase 2: Optimización y Expansión

### Semanas 13-16: Advanced Operations

- **Batch Brew & Slow Bar**: métodos especiales con tiempos extendidos
- **Kitchen Display System**: órdenes complejas y tiempos de preparación
- **Delivery Integration**: markup por canal, catálogo curado
- **Advanced Inventory**: lotes FIFO, waste tracking, forecasting

### Semanas 17-20: Business Intelligence

- **Supplier Scorecards**: OTIF, calidad, fill rate automático
- **Predictive Analytics**: demanda por hora/día, ML básico
- **Advanced Reporting**: cohort analysis, customer lifetime value
- **Multi-location**: consolidación y benchmarking entre tiendas

### Semanas 21-24: Growth & Sustainability

- **Membership Programs**: "Mañanero", "Study Pass" con beneficios
- **E-commerce**: venta de grano, kits, talleres online
- **Sustainability Metrics**: carbon footprint, waste diversion rate
- **API Ecosystem**: integraciones con terceros, marketplace apps

---

# 🔧 Stack Tecnológico de Referencia

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Apps      │    │   Mobile App    │    │   Integrations  │
│  (Next.js PWA)  │    │ (React Native)  │    │    (n8n)       │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │      API Gateway           │
                    │     (NestJS + GraphQL)     │
                    └─────────────┬───────────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
    ┌──────────▼───────┐ ┌───────▼────────┐ ┌─────▼──────┐
    │   PostgreSQL     │ │     Redis      │ │   MinIO    │
    │  (Primary DB)    │ │  (Cache+Jobs)  │ │ (Storage)  │
    └──────────────────┘ └────────────────┘ └────────────┘
```

## 🛠️ Technology Choices

### Backend Core

- **NestJS 10+**: Modular architecture, dependency injection, guards
- **Prisma 5+**: Type-safe ORM, migrations, client generation
- **PostgreSQL 15+**: JSONB for flexible schemas, full-text search
- **Redis 7+**: Session storage, job queues, pub/sub
- **GraphQL + REST**: Hybrid API approach for different use cases

### Frontend Stack

- **Next.js 14+**: App Router, Server Components, optimizations
- **React Query**: Server state management, caching, background sync
- **Zustand**: Client state management, persistence
- **Tailwind CSS**: Utility-first styling, custom design system
- **Framer Motion**: Micro-interactions, page transitions

### Mobile Development

- **Expo 50+**: Managed workflow, OTA updates, native APIs
- **React Native 0.73+**: Cross-platform with platform-specific code
- **React Navigation 6**: Navigation patterns, deep linking
- **AsyncStorage**: Offline data persistence
- **React Query**: Consistent data layer with web

### Infrastructure & DevOps

- **Docker Compose**: Local development environment
- **GitHub Actions**: CI/CD pipelines, automated testing
- **Terraform**: Infrastructure as Code for cloud resources
- **Prometheus + Grafana**: Monitoring, alerting, dashboards
- **Sentry**: Error tracking, performance monitoring

---

# 🌎 Integraciones Específicas México

## 💳 Pagos Locales

```typescript
// Integración Clip, Mercado Pago, BBVA
interface PaymentProvider {
  processPayment(
    amount: number,
    method: 'card' | 'cash' | 'transfer',
  ): Promise<PaymentResult>;
  processTip(amount: number): Promise<void>;
  generateReceipt(transactionId: string): Promise<Buffer>;
}
```

## 🧾 CFDI 4.0 Electrónico

```typescript
// PAC Integration (Facturama, Enlace Fiscal)
interface CFDIService {
  validateRFC(rfc: string): Promise<boolean>;
  stampInvoice(invoice: InvoiceData): Promise<CFDIResult>;
  cancelInvoice(uuid: string, reason: string): Promise<void>;
}
```

## 📱 WhatsApp Business (Twilio)

```typescript
// Templates aprobados por Meta
const templates = {
  bienvenida: 'Bienvenido {{name}} a {{coffee_shop}}! 🎉☕',
  cumple: '¡Feliz cumpleaños {{name}}! 🎂 Te regalamos un café ❤️',
  nps: 'Hola {{name}}, ¿cómo estuvo tu experiencia? ⭐⭐⭐⭐⭐',
};
```

## 📧 Email Marketing (Mailrelay)

```typescript
// Configuración DKIM/SPF para deliverability
const emailConfig = {
  domain: 'coffeeshop.mx',
  dkim: 'enabled',
  spf: 'v=spf1 include:mailrelay.com ~all',
  unsubscribe: 'https://coffeeshop.mx/unsubscribe',
};
```

---

# 📊 Métricas de Seguimiento

## 🎯 OKRs Trimestre 1 (MVP)

### Objetivo: Validar Product-Market Fit

- **KR1**: 1 cafetería operando 100% con CoffeeOS por 30 días
- **KR2**: 95% checklists compliance sin supervisión
- **KR3**: 0 errores de inventario vs conteo físico
- **KR4**: <200ms API response time p90 en horas pico

### Objetivo: Eficiencia Operativa

- **KR1**: Reducir tiempo promedio de servicio a 2.5 min
- **KR2**: Incrementar margen bruto a 67% vs baseline
- **KR3**: 90% de órdenes sin modificaciones post-venta
- **KR4**: Labor % estable en 23-25% independiente del volumen

### Objetivo: Experiencia Cliente

- **KR1**: NPS ≥ 70 con >80% tasa de respuesta
- **KR2**: 15% adoption rate programa 9+1
- **KR3**: Rating Google Maps ≥ 4.7
- **KR4**: 25% incremento en repeat customers 30-day

## 📈 Dashboard Operativo Diario

### Métricas en Tiempo Real

```javascript
const dailyKPIs = {
  // Volumen & Ingresos
  tickets_today: 124,
  revenue_today: 18459.5,
  avg_ticket: 148.86,

  // Operación
  service_time_p90: '2m 47s',
  orders_pending: 3,
  inventory_alerts: ['Leche Entera', 'Café Colombia'],

  // Staff & Productividad
  staff_on_shift: 4,
  labor_percent: 24.1,
  sales_per_labor_hour: 1247.32,

  // Calidad & Compliance
  checklist_completion: '94%',
  temperature_alerts: 0,
  customer_complaints: 1,
};
```

---

# 🔐 Seguridad y Compliance

## 🛡️ Arquitectura de Seguridad

### Multi-Tenant Isolation

```sql
-- Row Level Security (RLS)
CREATE POLICY "tenant_isolation" ON tickets
FOR ALL TO authenticated
USING (organization_id = current_setting('app.current_org_id')::uuid);
```

### RBAC Implementation

```typescript
// 7 roles con permisos granulares
enum Role {
  OWNER = 'owner', // Acceso total + multi-sede
  MANAGER = 'manager', // POS, inventario, RRHH, reportes
  BARISTA_LEAD = 'barista_lead', // Recetas, QC, capacitación
  BARISTA = 'barista', // POS limitado, tareas
  CASHIER = 'cashier', // Cobro, CFDI, arqueos
  AUDITOR = 'auditor', // Solo lectura + firmas
  ACCOUNTANT = 'accountant', // Lectura P&L/CFDI, exports
}
```

### LFPDPPP Compliance

```typescript
// Gestión de consentimientos
interface Consent {
  customer_id: string;
  scope: 'marketing' | 'analytics' | 'communications';
  granted_at: Date;
  source: 'pos' | 'web' | 'whatsapp' | 'email';
  ip_address?: string;
  evidence?: string; // Screenshot, audio, etc.
}
```

## 🔍 Auditoría y Trazabilidad

### Event Sourcing para Operaciones Críticas

```typescript
// Todas las transacciones son inmutables
interface AuditEvent {
  id: string;
  entity_type: 'ticket' | 'inventory' | 'user' | 'payment';
  entity_id: string;
  action: 'create' | 'update' | 'delete' | 'void';
  changes: Record<string, any>;
  user_id: string;
  timestamp: Date;
  ip_address: string;
}
```

---

# 🚀 Plan de Deployment

## 🌊 Estrategia Blue/Green

### Production Environment

```yaml
# docker-compose.prod.yml
services:
  api:
    image: coffeeos/api:latest
    replicas: 3
    resources:
      limits: { cpu: '1', memory: '1G' }
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:4000/health']

  pos-web:
    image: coffeeos/pos-web:latest
    replicas: 2

  database:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=coffeeos_prod
```

### Monitoring Stack

```yaml
# monitoring/docker-compose.yml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password

  loki:
    image: grafana/loki:latest

  jaeger:
    image: jaegertracing/all-in-one:latest
```

---

# 📞 Plan de Soporte

## 🆘 Niveles de Soporte

### Tier 1: Operativo (24/7)

- **Scope**: Issues POS, impresoras, conectividad básica
- **SLA**: Respuesta <30min, resolución <4h
- **Canales**: WhatsApp, phone hotline, in-app chat
- **Escalación**: Tier 2 si no resuelve en 2h

### Tier 2: Técnico (Horas hábiles)

- **Scope**: Integraciones, reportes, configuraciones avanzadas
- **SLA**: Respuesta <2h, resolución <24h
- **Canales**: Email, video call, screen sharing
- **Escalación**: Desarrollo si requiere código

### Tier 3: Desarrollo (Críticos)

- **Scope**: Bugs de código, performance, nuevas features
- **SLA**: Respuesta <4h, fix deploy <48h
- **Canales**: GitHub Issues, Slack directo con devs
- **Escalación**: CTO para arquitectura

## 📚 Recursos de Autoayuda

### Documentation Hub

- **Getting Started**: Primeros pasos por rol
- **Video Tutorials**: Flujos principales grabados
- **FAQ**: Top 50 preguntas más frecuentes
- **Release Notes**: Changelog y breaking changes

### Community & Training

- **Discord Server**: Comunidad de usuarios activos
- **Monthly Webinars**: Nuevas features y best practices
- **Certification Program**: Cursos avanzados por módulo
- **Partner Network**: Consultores especializados

---

**¡CoffeeOS MVP listo para transformar la industria cafetera mexicana! ☕️🚀**

_Plan generado el 15 de Octubre, 2025 - Ready to execute!_
