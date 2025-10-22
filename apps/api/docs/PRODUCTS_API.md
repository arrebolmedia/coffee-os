# Products API Documentation

## Descripción General

La API de productos proporciona endpoints para la gestión completa del catálogo de productos en CoffeeOS. Incluye operaciones CRUD básicas, operaciones masivas, gestión de modificadores, control de inventario y análisis de rentabilidad.

## Base URL

```
/api/products
```

## Autenticación

Todos los endpoints requieren autenticación mediante JWT Bearer token en el header:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Crear Producto

Crea un nuevo producto en el catálogo.

**Endpoint:** `POST /products`

**Request Body:**
```typescript
{
  organization_id: string;
  category_id?: string;
  recipe_id?: string;
  sku: string;                    // Único por organización
  name: string;
  description?: string;
  image_url?: string;
  barcode?: string;
  type?: 'SIMPLE' | 'COMBO' | 'VARIANT' | 'INGREDIENT';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  base_price: number;             // Precio base
  cost?: number;                  // Costo del producto
  pricing_strategy?: 'FIXED' | 'DYNAMIC' | 'MARGIN_BASED' | 'COMPETITIVE';
  target_margin_percentage?: number;
  tax_rate?: number;              // Tasa de impuesto (0-100)
  tax_included?: boolean;
  allow_modifiers?: boolean;
  allow_discounts?: boolean;
  track_inventory?: boolean;
  require_preparation?: boolean;
  stock_quantity?: number;
  minimum_stock?: number;
  reorder_point?: number;
  display_order?: number;
  is_featured?: boolean;
  is_available?: boolean;
  tags?: string[];
  preparation_time_minutes?: number;
  calories?: number;
}
```

**Response:** `201 Created`
```typescript
{
  id: string;
  organization_id: string;
  sku: string;
  name: string;
  base_price: number;
  // ... todos los demás campos
  created_at: Date;
  updated_at: Date;
}
```

**Errores:**
- `409 Conflict` - SKU ya existe en la organización
- `400 Bad Request` - Datos de entrada inválidos

---

### 2. Listar Productos

Obtiene una lista de productos con filtros opcionales.

**Endpoint:** `GET /products`

**Query Parameters:**
```typescript
{
  organization_id?: string;     // Filtrar por organización
  category_id?: string;         // Filtrar por categoría
  search?: string;              // Buscar en nombre, SKU, descripción, barcode
  type?: 'SIMPLE' | 'COMBO' | 'VARIANT' | 'INGREDIENT';
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  is_available?: 'true' | 'false';
  is_featured?: 'true' | 'false';
  track_inventory?: 'true' | 'false';
  low_stock?: 'true';           // Productos por debajo del reorder_point
  min_price?: number;
  max_price?: number;
  sort_by?: 'name' | 'price' | 'display_order' | 'created_at';
  order?: 'asc' | 'desc';
}
```

**Response:** `200 OK`
```typescript
Product[]  // Array de productos
```

**Ejemplo:**
```
GET /products?organization_id=abc123&category_id=cat456&search=café&sort_by=price&order=asc
```

---

### 3. Obtener Producto por ID

Obtiene un producto específico por su ID.

**Endpoint:** `GET /products/:id`

**Response:** `200 OK`
```typescript
{
  id: string;
  organization_id: string;
  name: string;
  // ... todos los campos del producto
}
```

**Errores:**
- `404 Not Found` - Producto no encontrado

---

### 4. Obtener Producto por SKU

Obtiene un producto por su SKU y organización.

**Endpoint:** `GET /products/sku/:sku/:organization_id`

**Response:** `200 OK`
```typescript
Product
```

**Errores:**
- `404 Not Found` - Producto con ese SKU no encontrado

---

### 5. Actualizar Producto

Actualiza un producto existente (actualización parcial).

**Endpoint:** `PATCH /products/:id`

**Request Body:** (todos los campos son opcionales)
```typescript
{
  name?: string;
  description?: string;
  base_price?: number;
  cost?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  is_available?: boolean;
  category_id?: string;
  // ... cualquier otro campo del producto
}
```

**Response:** `200 OK`
```typescript
{
  id: string;
  // ... producto actualizado con todos los campos
  updated_at: Date;
}
```

**Errores:**
- `404 Not Found` - Producto no encontrado
- `409 Conflict` - SKU duplicado (si se intenta actualizar el SKU)

---

### 6. Eliminar Producto

Elimina un producto individual.

**Endpoint:** `DELETE /products/:id`

**Response:** `204 No Content`

**Errores:**
- `404 Not Found` - Producto no encontrado

---

### 7. Eliminar Productos en Masa

Elimina múltiples productos en una sola operación.

**Endpoint:** `POST /products/bulk-delete`

**Request Body:**
```typescript
{
  productIds: string[];  // Array de IDs de productos a eliminar
}
```

**Response:** `200 OK`
```typescript
{
  success: true;
  data: {
    count: number;  // Número de productos eliminados exitosamente
  };
  message: "X productos eliminados exitosamente";
}
```

**Ejemplo:**
```json
{
  "productIds": ["clm1abc...", "clm2def...", "clm3ghi..."]
}
```

**Notas:**
- Los productos que no existan serán omitidos sin generar error
- El contador refleja solo los productos eliminados exitosamente

---

### 8. Actualizar Estado de Productos en Masa

Activa o desactiva múltiples productos.

**Endpoint:** `POST /products/bulk-update-status`

**Request Body:**
```typescript
{
  productIds: string[];
  isActive: boolean;     // true = activar, false = desactivar
}
```

**Response:** `200 OK`
```typescript
{
  success: true;
  data: {
    count: number;
  };
  message: "X productos activados/desactivados exitosamente";
}
```

**Comportamiento:**
- `isActive: true` → status = `ACTIVE`, is_available = `true`
- `isActive: false` → status = `INACTIVE`, is_available = `false`

**Ejemplo:**
```json
{
  "productIds": ["clm1abc...", "clm2def..."],
  "isActive": false
}
```

---

### 9. Actualizar Categoría de Productos en Masa

Cambia la categoría de múltiples productos.

**Endpoint:** `POST /products/bulk-update-category`

**Request Body:**
```typescript
{
  productIds: string[];
  categoryId: string;    // ID de la nueva categoría
}
```

**Response:** `200 OK`
```typescript
{
  success: true;
  data: {
    count: number;
  };
  message: "X productos actualizados exitosamente";
}
```

**Ejemplo:**
```json
{
  "productIds": ["clm1abc...", "clm2def..."],
  "categoryId": "cat789xyz"
}
```

---

### 10. Obtener Modificadores de Producto

Lista todos los modificadores disponibles para un producto.

**Endpoint:** `GET /products/:id/modifiers`

**Response:** `200 OK`
```typescript
ProductModifier[]
```

Cada modificador tiene la estructura:
```typescript
{
  id: string;
  product_id: string;
  name: string;
  type: 'SIZE' | 'MILK' | 'EXTRA' | 'SYRUP' | 'DECAF';
  price_delta: number;       // Incremento/descuento en el precio
  is_required: boolean;
  is_default: boolean;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

### 11. Crear Modificador para Producto

Agrega un nuevo modificador a un producto.

**Endpoint:** `POST /products/:id/modifiers`

**Request Body:**
```typescript
{
  product_id: string;
  name: string;
  type: 'SIZE' | 'MILK' | 'EXTRA' | 'SYRUP' | 'DECAF';
  price_delta: number;       // Ej: 5.00 para agregar $5, -2.00 para descontar $2
  is_required?: boolean;     // Default: false
  is_default?: boolean;      // Default: false
  is_available?: boolean;    // Default: true
}
```

**Response:** `201 Created`
```typescript
ProductModifier
```

---

### 12. Actualizar Modificador

Actualiza un modificador existente.

**Endpoint:** `PATCH /modifiers/:id`

**Request Body:** (campos opcionales)
```typescript
{
  name?: string;
  price_delta?: number;
  is_required?: boolean;
  is_default?: boolean;
  is_available?: boolean;
}
```

**Response:** `200 OK`
```typescript
ProductModifier  // Modificador actualizado
```

---

### 13. Eliminar Modificador

Elimina un modificador.

**Endpoint:** `DELETE /modifiers/:id`

**Response:** `204 No Content`

**Errores:**
- `404 Not Found` - Modificador no encontrado

---

### 14. Actualizar Stock

Actualiza la cantidad en inventario de un producto.

**Endpoint:** `PATCH /products/:id/stock`

**Request Body:**
```typescript
{
  quantity: number;
  operation: 'add' | 'subtract' | 'set';
}
```

**Operaciones:**
- `add`: Suma la cantidad al stock actual
- `subtract`: Resta la cantidad del stock actual (no permite negativos)
- `set`: Establece el stock a la cantidad exacta

**Response:** `200 OK`
```typescript
Product  // Producto con stock actualizado
```

**Errores:**
- `400 Bad Request` - Producto no tiene tracking de inventario habilitado
- `400 Bad Request` - Stock insuficiente para operación subtract

**Ejemplo:**
```json
{
  "quantity": 50,
  "operation": "add"
}
```

---

### 15. Estadísticas de Productos

Obtiene estadísticas agregadas de productos por organización.

**Endpoint:** `GET /products/organization/:organization_id/stats`

**Response:** `200 OK`
```typescript
{
  total_products: number;
  by_type: {
    SIMPLE: number;
    COMBO: number;
    VARIANT: number;
    INGREDIENT: number;
  };
  by_status: {
    ACTIVE: number;
    INACTIVE: number;
    ARCHIVED: number;
    OUT_OF_STOCK: number;
  };
  total_value: number;           // Valor total del inventario (costo × cantidad)
  average_price: number;         // Precio promedio de productos
  average_margin: number;        // Margen promedio (%)
  low_stock_count: number;       // Productos bajo reorder_point
}
```

---

### 16. Análisis de Rentabilidad

Analiza la rentabilidad de todos los productos con información de costos.

**Endpoint:** `GET /products/organization/:organization_id/profitability`

**Response:** `200 OK`
```typescript
ProductProfitability[]  // Ordenado por profitability_score descendente
```

Cada elemento tiene:
```typescript
{
  product_id: string;
  product_name: string;
  sku: string;
  base_price: number;
  cost: number;
  margin_amount: number;         // Ganancia por unidad
  margin_percentage: number;     // Porcentaje de margen
  profitability_score: number;   // Score combinado (margen × precio)
}
```

**Notas:**
- Solo incluye productos con costo definido (cost > 0)
- `profitability_score = margin_percentage × 0.6 + (base_price / 100) × 0.4`
- Productos con alto margen y buen precio obtienen scores más altos

---

## Códigos de Estado HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Recurso creado
- `204 No Content` - Eliminación exitosa
- `400 Bad Request` - Solicitud inválida
- `401 Unauthorized` - Token inválido o faltante
- `404 Not Found` - Recurso no encontrado
- `409 Conflict` - Conflicto (ej: SKU duplicado)

---

## Validaciones Comunes

### SKU
- Debe ser único por organización
- Requerido al crear producto
- Puede contener letras, números, guiones

### Precio
- `base_price` debe ser mayor a 0
- `cost` debe ser mayor o igual a 0
- `margin_percentage` entre 0-100

### Stock
- `stock_quantity` debe ser >= 0
- Operación `subtract` no permite resultados negativos
- Solo productos con `track_inventory: true` pueden actualizar stock

### Modificadores
- `price_delta` puede ser positivo (incremento) o negativo (descuento)
- Un producto puede tener múltiples modificadores del mismo tipo
- Solo productos con `allow_modifiers: true` aceptan modificadores

---

## Ejemplos de Uso

### Crear un Café Latte

```bash
POST /products
{
  "organization_id": "org_abc123",
  "category_id": "cat_bebidas",
  "sku": "CAFE-LATTE-001",
  "name": "Café Latte",
  "description": "Espresso con leche vaporizada",
  "base_price": 45.00,
  "cost": 15.00,
  "tax_rate": 16,
  "allow_modifiers": true,
  "preparation_time_minutes": 3,
  "calories": 120
}
```

### Agregar Modificadores de Tamaño

```bash
POST /products/{productId}/modifiers
{
  "product_id": "{productId}",
  "name": "Grande",
  "type": "SIZE",
  "price_delta": 10.00
}

POST /products/{productId}/modifiers
{
  "product_id": "{productId}",
  "name": "Extra Grande",
  "type": "SIZE",
  "price_delta": 20.00
}
```

### Buscar Cafés Activos

```bash
GET /products?organization_id=org_abc123&search=café&status=ACTIVE&sort_by=name
```

### Desactivar Productos Temporalmente

```bash
POST /products/bulk-update-status
{
  "productIds": ["prod1", "prod2", "prod3"],
  "isActive": false
}
```

### Cambiar Categoría de Productos de Temporada

```bash
POST /products/bulk-update-category
{
  "productIds": ["prod_pumpkin", "prod_cinnamon"],
  "categoryId": "cat_seasonal"
}
```

### Actualizar Inventario Después de Recepción

```bash
PATCH /products/{productId}/stock
{
  "quantity": 100,
  "operation": "add"
}
```

---

## Notas Técnicas

### Multi-Tenancy
- Todos los productos están aislados por `organization_id`
- Los filtros por organización son obligatorios en endpoints de listado

### Performance
- El servicio usa un Map en memoria (desarrollo)
- En producción se integrará con Prisma + PostgreSQL
- Los endpoints de bulk retornan el contador de éxitos

### Swagger UI
- Documentación interactiva disponible en `/api/docs`
- Todos los endpoints tienen decoradores Swagger
- Esquemas de DTOs documentados con ejemplos

---

## Próximas Mejoras

- [ ] Integración con Prisma ORM
- [ ] Paginación en listados
- [ ] Upload de imágenes (Multer + S3)
- [ ] Validación de referencias (category_id, recipe_id)
- [ ] Soft delete con campo `deleted_at`
- [ ] Historial de cambios de precios
- [ ] Búsqueda full-text con PostgreSQL
- [ ] Cache con Redis para stats
