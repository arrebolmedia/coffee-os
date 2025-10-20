# Guía de Configuración Manual de Baserow para CoffeeOS

## ⚠️ Importante: Problema de Espacio en Disco

El proyecto requiere liberar al menos **5-10 GB** en la unidad E: para instalar todas las dependencias de Node.js. Mientras tanto, aquí está la guía completa para configurar Baserow manualmente.

## 🚀 Paso 1: Acceder a Baserow

1. Abre el navegador y ve a: **http://localhost:8000**
2. Crea tu cuenta de administrador:
   - Email: admin@coffeeos.mx
   - Contraseña: (elige una segura)
   - Nombre: Admin CoffeeOS

## 📚 Paso 2: Crear Workspace

1. Click en "Create workspace"
2. Nombre: **CoffeeOS Core**
3. Click en "Create"

## 🗂️ Paso 3: Crear Tablas Principales

### Tabla 1: Organizations

1. Click en "+ Create table"
2. Nombre: **Organizations**
3. Agregar campos:
   - `name` (Text) - **Primary field**
   - `slug` (Text)
   - `description` (Long text)
   - `timezone` (Single select): America/Mexico_City, America/Cancun, America/Mazatlan, America/Tijuana
   - `active` (Boolean) - Default: true

### Tabla 2: Locations

1. Crear nueva tabla: **Locations**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `organization` (Link to table Organizations)
   - `address` (Long text)
   - `city` (Text)
   - `state` (Single select): CDMX, Jalisco, Nuevo León, Yucatán, etc.
   - `postal_code` (Text)
   - `phone` (Phone number)
   - `email` (Email)
   - `timezone` (Single select): America/Mexico_City
   - `tax_rate` (Number, 4 decimales) - Default: 0.16
   - `currency` (Single select): MXN, USD
   - `active` (Boolean) - Default: true

### Tabla 3: Roles

1. Crear nueva tabla: **Roles**
2. Agregar campos:
   - `name` (Single select) - **Primary field**
     - Propietario, Gerente, Líder de barra, Barista, Caja, Auditor, Contador
   - `description` (Long text)
   - `scopes` (Long text) - Para JSON de permisos
   - `active` (Boolean) - Default: true

### Tabla 4: Users

1. Crear nueva tabla: **Users**
2. Agregar campos:
   - `email` (Email) - **Primary field**
   - `organization` (Link to table Organizations)
   - `role` (Link to table Roles)
   - `locations` (Link to table Locations, Allow multiple)
   - `first_name` (Text)
   - `last_name` (Text)
   - `phone` (Phone number)
   - `avatar` (File)
   - `email_verified` (Date)
   - `two_factor_enabled` (Boolean)
   - `last_login_at` (Date)
   - `active` (Boolean) - Default: true

### Tabla 5: Categories

1. Crear nueva tabla: **Categories**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `description` (Long text)
   - `color` (Text) - Para código hexadecimal
   - `icon` (Text) - Para emoji o código
   - `sort_order` (Number)
   - `active` (Boolean)

### Tabla 6: Products

1. Crear nueva tabla: **Products**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `category` (Link to table Categories)
   - `sku` (Text)
   - `description` (Long text)
   - `image` (File)
   - `price` (Number, 2 decimales)
   - `cost` (Number, 2 decimales)
   - `tax_rate` (Number, 4 decimales)
   - `allow_modifiers` (Boolean)
   - `track_inventory` (Boolean)
   - `active` (Boolean)

### Tabla 7: Modifiers

1. Crear nueva tabla: **Modifiers**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `type` (Single select): SIZE, MILK, EXTRA, SYRUP, DECAF
   - `price_delta` (Number, 2 decimales) - Puede ser negativo
   - `active` (Boolean)

### Tabla 8: Suppliers

1. Crear nueva tabla: **Suppliers**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `contact_name` (Text)
   - `email` (Email)
   - `phone` (Phone number)
   - `address` (Long text)
   - `payment_terms` (Single select): Contado, 15 días, 30 días, 45 días
   - `lead_time` (Number) - Días de entrega
   - `active` (Boolean)

### Tabla 9: InventoryItems

1. Crear nueva tabla: **InventoryItems**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `code` (Text)
   - `description` (Long text)
   - `unit_of_measure` (Single select): ml, g, unit, kg, l
   - `cost_per_unit` (Number, 4 decimales)
   - `par_level` (Number)
   - `reorder_point` (Number)
   - `category` (Single select): Café, Leche, Endulzantes, Vasos, Tapas
   - `supplier` (Link to table Suppliers)
   - `active` (Boolean)

### Tabla 10: Recipes

1. Crear nueva tabla: **Recipes**
2. Agregar campos:
   - `name` (Text) - **Primary field**
   - `product` (Link to table Products)
   - `description` (Long text)
   - `instructions` (Long text)
   - `yield` (Number)
   - `yield_unit` (Single select): ml, g, unit
   - `prep_time` (Number) - Segundos
   - `allergens` (Multiple select): Gluten, Lactosa, Frutos secos, Soja
   - `video_url` (URL)
   - `version` (Number)
   - `active` (Boolean)

### Tabla 11: Customers

1. Crear nueva tabla: **Customers**
2. Agregar campos:
   - `email` (Email) - **Primary field**
   - `phone` (Phone number)
   - `first_name` (Text)
   - `last_name` (Text)
   - `birthday` (Date)
   - `loyalty_points` (Number)
   - `rfm_bucket` (Single select): Champions, Loyal, Potential, New, At Risk, Lost
   - `preferences` (Long text) - JSON
   - `active` (Boolean)

### Tabla 12: Tickets

1. Crear nueva tabla: **Tickets**
2. Agregar campos:
   - `ticket_number` (Text) - **Primary field**
   - `location` (Link to table Locations)
   - `user` (Link to table Users)
   - `customer` (Link to table Customers)
   - `status` (Single select): OPEN, CLOSED, REFUNDED, VOIDED
   - `subtotal` (Number, 2 decimales)
   - `tax` (Number, 2 decimales)
   - `tip` (Number, 2 decimales)
   - `discount` (Number, 2 decimales)
   - `total` (Number, 2 decimales)
   - `opened_at` (Date)
   - `closed_at` (Date)
   - `notes` (Text)

## 🔐 Paso 4: Generar API Token

1. Click en tu avatar (esquina superior derecha)
2. Ve a "Settings" → "API tokens"
3. Click en "Create token"
4. Nombre: **CoffeeOS Backend**
5. Copia el token generado
6. Guárdalo en tu archivo `.env.local`:

```env
BASEROW_URL=http://localhost:8000
BASEROW_TOKEN=tu_token_aqui
```

## 📊 Paso 5: Importar Datos Iniciales

### Roles Iniciales

Ve a la tabla **Roles** y agrega:

| name           | description                   | scopes                                          | active |
| -------------- | ----------------------------- | ----------------------------------------------- | ------ |
| Propietario    | Acceso completo al sistema    | ["*"]                                           | true   |
| Gerente        | Gestión completa de ubicación | ["pos","inventory","reports","users","quality"] | true   |
| Líder de barra | Supervisión de operaciones    | ["pos","inventory.read","quality","recipes"]    | true   |
| Barista        | Operaciones de barra          | ["pos","recipes.read"]                          | true   |
| Caja           | Punto de venta y cobro        | ["pos"]                                         | true   |
| Auditor        | Solo lectura para auditorías  | ["*.read"]                                      | true   |
| Contador       | Acceso financiero             | ["reports","finance"]                           | true   |

### Categorías Iniciales

Ve a la tabla **Categories** y agrega:

| name             | description              | color   | icon | sort_order | active |
| ---------------- | ------------------------ | ------- | ---- | ---------- | ------ |
| Cafés Calientes  | Bebidas de café caliente | #8B4513 | ☕   | 1          | true   |
| Cafés Fríos      | Bebidas de café frío     | #4169E1 | 🧊   | 2          | true   |
| Bebidas sin Café | Chocolate, té, etc.      | #FF69B4 | 🍵   | 3          | true   |
| Pasteles         | Productos de panadería   | #FFD700 | 🧁   | 4          | true   |
| Snacks           | Galletas, barras         | #FFA500 | 🍪   | 5          | true   |

### Productos de Ejemplo

Ve a la tabla **Products** y agrega:

| name           | category        | sku           | price | cost  | active |
| -------------- | --------------- | ------------- | ----- | ----- | ------ |
| Café Americano | Cafés Calientes | CAFE-001      | 35.00 | 8.50  | true   |
| Cappuccino     | Cafés Calientes | CAFE-002      | 45.00 | 12.00 | true   |
| Latte          | Cafés Calientes | CAFE-003      | 48.00 | 13.50 | true   |
| Café Frappé    | Cafés Fríos     | CAFE-FRIO-001 | 55.00 | 15.00 | true   |
| Cold Brew      | Cafés Fríos     | CAFE-FRIO-002 | 52.00 | 14.00 | true   |

### Modificadores de Ejemplo

Ve a la tabla **Modifiers** y agrega:

| name               | type  | price_delta | active |
| ------------------ | ----- | ----------- | ------ |
| Grande             | SIZE  | 10.00       | true   |
| Extra Grande       | SIZE  | 15.00       | true   |
| Leche de Almendras | MILK  | 8.00        | true   |
| Leche de Soja      | MILK  | 8.00        | true   |
| Shot Extra         | EXTRA | 12.00       | true   |
| Vainilla           | SYRUP | 8.00        | true   |
| Caramelo           | SYRUP | 8.00        | true   |
| Descafeinado       | DECAF | 0.00        | true   |

## 🎨 Paso 6: Crear Vistas Personalizadas

### Vista "Productos Activos"

1. En la tabla **Products**, click en "Create view"
2. Tipo: Grid
3. Nombre: **Productos Activos**
4. Agregar filtro: `active = true`
5. Ordenar por: `name` (ascendente)

### Vista "Stock Bajo"

1. En la tabla **InventoryItems**, crear vista Grid
2. Nombre: **Stock Bajo**
3. Agregar filtro: `current_stock < reorder_point`
4. Color: Rojo para alertas

### Vista "Ventas del Día"

1. En la tabla **Tickets**, crear vista Calendar
2. Nombre: **Ventas del Día**
3. Campo de fecha: `opened_at`
4. Filtro: `status = CLOSED`

## 🔗 Paso 7: Obtener IDs de las Tablas

Una vez creadas todas las tablas, obtén los IDs:

1. Click derecho en cada tabla → "Edit table"
2. En la URL verás: `http://localhost:8000/database/TABLE_ID/table/...`
3. Copia el TABLE_ID
4. Actualiza el archivo `config/baserow.json`:

```json
{
  "database_id": "TU_DATABASE_ID",
  "tables": {
    "organizations": TABLE_ID_1,
    "locations": TABLE_ID_2,
    "roles": TABLE_ID_3,
    "users": TABLE_ID_4,
    "categories": TABLE_ID_5,
    "products": TABLE_ID_6,
    "modifiers": TABLE_ID_7,
    "suppliers": TABLE_ID_8,
    "inventory_items": TABLE_ID_9,
    "recipes": TABLE_ID_10,
    "customers": TABLE_ID_11,
    "tickets": TABLE_ID_12
  }
}
```

## ✅ Verificación Final

- [ ] Todas las 12 tablas creadas
- [ ] Relaciones configuradas entre tablas
- [ ] Datos iniciales importados (roles, categorías, productos)
- [ ] API token generado y guardado
- [ ] IDs de tablas documentados en baserow.json
- [ ] Vistas personalizadas creadas

## 🚨 Próximos Pasos (Una vez resuelto el problema de espacio)

1. Liberar espacio en disco E: (mínimo 5-10 GB)
2. Instalar dependencias: `npm install`
3. Configurar integración API con NestJS backend
4. Implementar webhooks para n8n
5. Configurar sincronización offline para PWA

---

**Estado**: ✅ Documentación completa | ⚠️ Pendiente instalación de dependencias

**Bloqueador**: Espacio insuficiente en disco E: - Se requieren ~5-10 GB libres
