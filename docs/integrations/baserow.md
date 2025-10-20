# Baserow - Base de Datos No-Code para CoffeeOS

## 🎯 Objetivo

Baserow funciona como la **base de datos operativa principal** de CoffeeOS, proporcionando una interfaz no-code para que usuarios no técnicos puedan gestionar datos críticos del negocio mientras mantienen la integridad y relaciones necesarias.

## 📊 Arquitectura de Datos

### Base Principal: `CoffeeOS Core`

El schema de Baserow replica y extiende el schema de Prisma, con campos específicos optimizados para la interfaz no-code:

## 🏢 Tablas Core

### **Organizations** (Organizaciones)

- `name` (text) - Nombre de la organización
- `slug` (text) - Identificador único URL-friendly
- `description` (long text) - Descripción
- `timezone` (single select) - Zona horaria (America/Mexico_City, etc.)
- `active` (boolean) - Estado activo

### **Locations** (Ubicaciones/Tiendas)

- `organization` (link → Organizations)
- `name` (text) - Nombre de la tienda
- `address` (long text) - Dirección completa
- `city` (text) - Ciudad
- `state` (single select) - Estado (CDMX, Jalisco, etc.)
- `postal_code` (text) - Código postal
- `phone` (phone) - Teléfono de la tienda
- `email` (email) - Email de contacto
- `timezone` (single select) - Zona horaria local
- `tax_rate` (number) - Tasa de impuesto (0.16 para México)
- `currency` (single select) - Moneda (MXN, USD)
- `active` (boolean) - Estado activo

### **Users** (Usuarios)

- `organization` (link → Organizations)
- `role` (link → Roles)
- `locations` (link → Locations multi) - Ubicaciones asignadas
- `email` (email) - Email único
- `first_name` (text) - Nombre
- `last_name` (text) - Apellido
- `phone` (phone) - Teléfono
- `avatar` (file) - Foto de perfil
- `email_verified` (date) - Fecha verificación email
- `two_factor_enabled` (boolean) - 2FA habilitado
- `last_login_at` (date) - Último login
- `active` (boolean) - Estado activo

### **Roles** (Roles del Sistema)

- `name` (single select) - Propietario, Gerente, Líder de barra, Barista, Caja, Auditor, Contador
- `description` (long text) - Descripción del rol
- `scopes` (long text) - Permisos JSON (pos, inventory, reports, etc.)
- `active` (boolean) - Estado activo

## 🛍️ Catálogo de Productos

### **Categories** (Categorías)

- `name` (text) - Nombre de la categoría
- `description` (long text) - Descripción
- `color` (text) - Color hex para UI
- `icon` (text) - Ícono (emoji o código)
- `sort_order` (number) - Orden de presentación
- `active` (boolean) - Estado activo

### **Products** (Productos)

- `category` (link → Categories)
- `sku` (text) - Código único de producto
- `name` (text) - Nombre del producto
- `description` (long text) - Descripción
- `image` (file) - Imagen del producto
- `price` (number) - Precio de venta
- `cost` (number) - Costo base
- `tax_rate` (number) - Tasa de impuesto específica
- `allow_modifiers` (boolean) - Permite modificadores
- `track_inventory` (boolean) - Seguimiento de inventario
- `active` (boolean) - Estado activo

### **Modifiers** (Modificadores)

- `name` (text) - Nombre del modificador
- `type` (single select) - SIZE, MILK, EXTRA, SYRUP, DECAF
- `price_delta` (number) - Diferencia de precio (+/-)
- `active` (boolean) - Estado activo

### **ProductModifiers** (Relación Productos-Modificadores)

- `product` (link → Products)
- `modifier` (link → Modifiers)

## ☕ Recetas y Costeo

### **Recipes** (Recetas)

- `product` (link → Products)
- `name` (text) - Nombre de la receta
- `description` (long text) - Descripción detallada
- `instructions` (long text) - Instrucciones paso a paso
- `yield` (number) - Rendimiento (porciones)
- `yield_unit` (single select) - Unidad (ml, g, unit)
- `prep_time` (number) - Tiempo preparación (segundos)
- `allergens` (multiple select) - Alérgenos (gluten, lactosa, frutos secos)
- `video_url` (url) - URL del video tutorial
- `version` (number) - Versión de la receta
- `active` (boolean) - Estado activo
- `cost_calculated` (formula) - Costo total automático

### **InventoryItems** (Artículos de Inventario)

- `code` (text) - Código único
- `name` (text) - Nombre del artículo
- `description` (long text) - Descripción
- `unit_of_measure` (single select) - ml, g, unit, kg, l
- `cost_per_unit` (number) - Costo por unidad
- `par_level` (number) - Nivel mínimo
- `reorder_point` (number) - Punto de reorden
- `category` (single select) - Café, Leche, Endulzantes, etc.
- `supplier` (link → Suppliers)
- `active` (boolean) - Estado activo

### **RecipeIngredients** (Ingredientes por Receta)

- `recipe` (link → Recipes)
- `inventory_item` (link → InventoryItems)
- `quantity` (number) - Cantidad necesaria
- `unit` (text) - Unidad específica
- `notes` (text) - Notas especiales
- `cost_line` (formula) - quantity × inventory_item.cost_per_unit

## 📦 Gestión de Inventario

### **Suppliers** (Proveedores)

- `name` (text) - Nombre del proveedor
- `contact_name` (text) - Nombre de contacto
- `email` (email) - Email de contacto
- `phone` (phone) - Teléfono
- `address` (long text) - Dirección
- `payment_terms` (single select) - Contado, 15 días, 30 días
- `lead_time` (number) - Tiempo de entrega (días)
- `active` (boolean) - Estado activo

### **PurchaseOrders** (Órdenes de Compra)

- `location` (link → Locations)
- `supplier` (link → Suppliers)
- `po_number` (text) - Número de OC
- `status` (single select) - DRAFT, SENT, CONFIRMED, PARTIAL, RECEIVED, CANCELED
- `order_date` (date) - Fecha de orden
- `expected_date` (date) - Fecha esperada
- `received_date` (date) - Fecha recibida
- `subtotal` (formula) - Suma de líneas
- `tax` (formula) - Impuestos calculados
- `total` (formula) - Total final
- `notes` (long text) - Notas adicionales

### **Lots** (Lotes)

- `code` (text) - Código de lote
- `expiration_date` (date) - Fecha de vencimiento
- `documents` (file multiple) - Documentos adjuntos

### **InventoryMovements** (Movimientos de Inventario)

- `location` (link → Locations)
- `inventory_item` (link → InventoryItems)
- `type` (single select) - IN, OUT, ADJUSTMENT, TRANSFER
- `quantity` (number) - Cantidad (+/-)
- `unit_cost` (number) - Costo unitario
- `lot` (link → Lots)
- `reason` (single select) - Purchase, Sale, Recipe, Waste, etc.
- `reference` (text) - Referencia (ticket, PO, etc.)
- `notes` (text) - Notas
- `movement_date` (date) - Fecha del movimiento

## 🏪 Punto de Venta

### **Tickets** (Ventas)

- `location` (link → Locations)
- `user` (link → Users) - Cajero
- `customer` (link → Customers)
- `ticket_number` (text) - Número de ticket
- `status` (single select) - OPEN, CLOSED, REFUNDED, VOIDED
- `subtotal` (formula) - Suma de líneas
- `tax` (formula) - Impuestos
- `tip` (number) - Propina
- `discount` (number) - Descuento
- `total` (formula) - Total final
- `opened_at` (date) - Fecha/hora apertura
- `closed_at` (date) - Fecha/hora cierre
- `notes` (text) - Notas

### **TicketLines** (Líneas de Venta)

- `ticket` (link → Tickets)
- `product` (link → Products)
- `quantity` (number) - Cantidad
- `unit_price` (number) - Precio unitario
- `discount` (number) - Descuento línea
- `total` (formula) - quantity × unit_price - discount
- `modifiers` (link → Modifiers multi) - Modificadores aplicados
- `notes` (text) - Notas especiales

### **Payments** (Pagos)

- `ticket` (link → Tickets)
- `method` (single select) - CASH, CARD, DIGITAL_WALLET, BANK_TRANSFER, LOYALTY_POINTS
- `amount` (number) - Monto pagado
- `reference` (text) - Referencia del pago
- `processor_data` (long text) - JSON con datos del procesador
- `processed_at` (date) - Fecha/hora procesamiento

## 👥 CRM y Lealtad

### **Customers** (Clientes)

- `email` (email) - Email único
- `phone` (phone) - Teléfono único
- `first_name` (text) - Nombre
- `last_name` (text) - Apellido
- `birthday` (date) - Fecha de nacimiento
- `loyalty_points` (number) - Puntos acumulados
- `total_spent` (rollup) - Total gastado histórico
- `visit_count` (rollup) - Número de visitas
- `rfm_bucket` (single select) - Champions, Loyal, Potential, New, At Risk, Lost
- `last_visit` (rollup) - Última fecha de visita
- `preferences` (long text) - Preferencias JSON
- `active` (boolean) - Estado activo

### **Consents** (Consentimientos LFPDPPP)

- `customer` (link → Customers)
- `type` (single select) - MARKETING_EMAIL, MARKETING_SMS, MARKETING_WHATSAPP, DATA_PROCESSING, COOKIES
- `granted` (boolean) - Consentimiento otorgado
- `source` (single select) - Web, App, Tienda, Llamada
- `ip_address` (text) - IP de origen
- `granted_at` (date) - Fecha de otorgamiento
- `revoked_at` (date) - Fecha de revocación

### **Campaigns** (Campañas de Marketing)

- `name` (text) - Nombre de la campaña
- `type` (single select) - Birthday, Welcome, Winback, Promotion
- `segment` (single select) - All, RFM segments, Custom
- `channel` (multiple select) - Email, SMS, WhatsApp, In-store
- `status` (single select) - DRAFT, SCHEDULED, RUNNING, COMPLETED, PAUSED
- `schedule_date` (date) - Fecha programada
- `content` (long text) - Contenido del mensaje
- `sent_count` (number) - Enviados
- `open_rate` (number) - Tasa de apertura
- `click_rate` (number) - Tasa de click
- `conversion_rate` (number) - Tasa de conversión

## ✅ Calidad y Cumplimiento

### **Checklists** (Listas de Verificación)

- `name` (text) - Nombre del checklist
- `description` (long text) - Descripción
- `scope` (single select) - OPENING, CLOSING, MID_SHIFT, NOM_251, SAFETY, MAINTENANCE
- `frequency` (single select) - daily, weekly, monthly, on-demand
- `active` (boolean) - Estado activo

### **ChecklistItems** (Elementos del Checklist)

- `checklist` (link → Checklists)
- `label` (text) - Etiqueta del elemento
- `description` (long text) - Descripción detallada
- `type` (single select) - BOOLEAN, NUMBER, TEMPERATURE, PHOTO, SIGNATURE, TEXT
- `required` (boolean) - Requerido
- `sort_order` (number) - Orden de presentación
- `min_value` (number) - Valor mínimo (para números/temperaturas)
- `max_value` (number) - Valor máximo
- `unit` (text) - Unidad (°C, ppm, etc.)
- `active` (boolean) - Estado activo

### **TaskRuns** (Ejecuciones de Checklist)

- `checklist` (link → Checklists)
- `location` (link → Locations)
- `user` (link → Users) - Usuario ejecutor
- `status` (single select) - IN_PROGRESS, COMPLETED, FAILED, CANCELED
- `started_at` (date) - Fecha/hora inicio
- `completed_at` (date) - Fecha/hora completado
- `notes` (text) - Notas generales
- `evidence` (file multiple) - Evidencia fotográfica

### **TaskRunResponses** (Respuestas del Checklist)

- `task_run` (link → TaskRuns)
- `checklist_item` (link → ChecklistItems)
- `boolean_value` (boolean) - Para elementos yes/no
- `number_value` (number) - Para números/temperaturas
- `text_value` (text) - Para texto libre
- `file_urls` (file multiple) - Para fotos/documentos
- `responded_at` (date) - Fecha/hora respuesta

### **QualityLogs** (Bitácoras de Calidad)

- `location` (link → Locations)
- `user` (link → Users) - Responsable del registro
- `type` (single select) - TEMPERATURE, PPM, TDS, PH, PRESSURE, CLEANING
- `value` (number) - Valor medido
- `unit` (text) - Unidad de medida
- `equipment` (text) - Equipo utilizado
- `notes` (text) - Observaciones
- `signed_by` (text) - Firma digital
- `signed_at` (date) - Fecha/hora firma
- `recorded_at` (date) - Fecha/hora registro

## 🏛️ Permisos y Cumplimiento

### **Permits** (Permisos)

- `location` (link → Locations)
- `name` (text) - Nombre del permiso
- `authority` (single select) - Uso de Suelo, Salud, Protección Civil, etc.
- `permit_number` (text) - Número oficial
- `status` (single select) - ACTIVE, EXPIRED, PENDING_RENEWAL, SUSPENDED, CANCELED
- `issued_date` (date) - Fecha de emisión
- `expiry_date` (date) - Fecha de vencimiento
- `documents` (file multiple) - Documentos oficiales
- `notes` (text) - Notas adicionales

### **PermitRenewals** (Renovaciones de Permisos)

- `permit` (link → Permits)
- `rrule` (text) - Regla de recurrencia RFC 5545
- `next_due` (date) - Próxima fecha de renovación
- `responsible_user` (link → Users) - Responsable
- `active` (boolean) - Estado activo

## 💰 Facturación CFDI

### **InvoicesCFDI** (Facturas CFDI)

- `ticket` (link → Tickets)
- `uuid` (text) - UUID del CFDI
- `series` (text) - Serie
- `folio` (text) - Folio
- `rfc` (text) - RFC del cliente
- `name` (text) - Razón social
- `address` (long text) - Dirección fiscal
- `xml_file` (file) - Archivo XML
- `pdf_file` (file) - Archivo PDF
- `status` (single select) - PENDING, ISSUED, SENT, PAID, CANCELED, ERROR
- `pac_response` (long text) - Respuesta del PAC (JSON)
- `issued_at` (date) - Fecha de timbrado
- `canceled_at` (date) - Fecha de cancelación

## 📊 Fórmulas y Cálculos Automáticos

### **Costeo Automático**

```javascript
// En tabla Recipes, campo cost_calculated
rollup('RecipeIngredients', 'cost_line', 'sum');

// En tabla RecipeIngredients, campo cost_line
field('quantity') * lookup('inventory_item', 'cost_per_unit');
```

### **RFM Segmentation**

```javascript
// En tabla Customers, campo rfm_bucket (fórmula compleja)
if(
  and(field('total_spent') > 1000, field('visit_count') > 10,
      datetime_diff(now(), field('last_visit'), 'days') < 30),
  'Champions',
  if(field('visit_count') < 2, 'New Customers', 'At Risk')
)
```

### **Stock Teórico**

```javascript
// En tabla InventoryItems, campo theoretical_stock
rollup('InventoryMovements', 'quantity', 'sum');
```

### **Margen por Producto**

```javascript
// En tabla Products, campo margin_percent
((field('price') - lookup('recipes', 'cost_calculated')) / field('price')) *
  100;
```

## 🔄 Vistas Predefinidas

### **Dashboard Gerencial**

- **Vista Kanban**: Tickets por status
- **Vista Calendar**: TaskRuns programados
- **Vista Gallery**: Productos con imágenes

### **Control de Inventario**

- **Vista Grid**: Items con stock < par level (filtrado)
- **Vista Form**: Movimientos de inventario
- **Vista Calendar**: Fechas de vencimiento

### **Calidad y Compliance**

- **Vista Kanban**: TaskRuns por status
- **Vista Calendar**: Renovaciones de permisos
- **Vista Grid**: QualityLogs fuera de rango

## 🎨 Personalización UI

### **Colores por Categoría**

- 🔴 **Crítico**: Temperaturas fuera de rango, permisos vencidos
- 🟡 **Advertencia**: Stock bajo, renovaciones próximas
- 🟢 **Normal**: Todo en orden
- 🔵 **Información**: Datos de referencia

### **Iconos por Módulo**

- ☕ **Productos**: Emoji de café
- 📦 **Inventario**: Emoji de caja
- ✅ **Calidad**: Emoji de check
- 👥 **CRM**: Emoji de personas
- 💰 **Finanzas**: Emoji de dinero

## 🔗 API Integration

### **Baserow REST API**

```javascript
// Obtener productos activos
GET /api/database/tables/{table_id}/rows/?filters=[{"field":"active","type":"equal","value":"true"}]

// Crear nuevo ticket
POST /api/database/tables/{tickets_table_id}/rows/
{
  "ticket_number": "T-001",
  "location": [location_id],
  "status": "OPEN"
}
```

### **Webhooks Configurados**

- **Ticket Closed** → Trigger n8n workflow (NPS, inventory update)
- **Inventory Low** → Trigger n8n workflow (reorder alert)
- **Task Run Completed** → Trigger n8n workflow (quality notifications)

## 🚀 Setup Inicial

### 1. Crear Base de Datos

1. Acceder a Baserow: http://localhost:8000
2. Crear cuenta admin
3. Crear workspace "CoffeeOS"
4. Importar template de tablas

### 2. Configurar Permisos

1. Crear grupos por rol (Propietario, Gerente, etc.)
2. Asignar permisos por tabla
3. Configurar Row-Level Security

### 3. Importar Datos Iniciales

1. Organizaciones y ubicaciones
2. Usuarios y roles
3. Catálogo de productos base
4. Checklists NOM-251
5. Proveedores principales

### 4. Configurar API Token

1. Generar token de API
2. Actualizar .env.local: `BASEROW_TOKEN=your-token`
3. Configurar webhooks

## 📋 Checklist de Validación

- [ ] ✅ Todas las tablas creadas con campos correctos
- [ ] 🔗 Relaciones configuradas entre tablas
- [ ] 📊 Fórmulas de cálculo funcionando
- [ ] 🎨 Vistas personalizadas creadas
- [ ] 🔐 Permisos por rol configurados
- [ ] 🔄 Webhooks n8n configurados
- [ ] 📡 API token generado y validado
- [ ] 📝 Datos iniciales importados

## 🆘 Troubleshooting

### **Problema**: Fórmulas no calculan

**Solución**: Verificar que los campos referenciados existan y tengan el tipo correcto

### **Problema**: Permisos no funcionan

**Solución**: Revisar configuración de grupos y Row-Level Security

### **Problema**: API devuelve errores

**Solución**: Validar token y permisos de la tabla específica

---

## 📞 Soporte

- 📧 **Email**: baserow@coffeeos.mx
- 📖 **Docs**: https://baserow.io/docs
- 💬 **Community**: https://community.baserow.io

---

_Configuración Baserow completada - CoffeeOS v1.0.0_
