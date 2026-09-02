# Categories API Documentation

## Descripción General

La API de categorías proporciona endpoints para gestión jerárquica de categorías en CoffeeOS. Soporta estructuras multinivel (padre-hijo), reordenamiento, operaciones masivas y construcción de árboles de navegación.

## Base URL

```
/api/categories
```

## Autenticación

Todos los endpoints requieren autenticación mediante JWT Bearer token:

```
Authorization: Bearer <token>
```

## Endpoints

### 1. Crear Categoría

Crea una nueva categoría en el catálogo.

**Endpoint:** `POST /categories`

**Request Body:**

```typescript
{
  organization_id: string;
  name: string;                  // Nombre único en organización
  description?: string;
  type?: 'product' | 'inventory' | 'recipe' | 'expense';
  parent_id?: string;            // ID de categoría padre (null = raíz)
  display_order?: number;        // Orden de visualización
  icon?: string;                 // Nombre del icono (ej: 'coffee')
  color?: string;                // Color en hex (ej: '#FF5733')
  image_url?: string;
  is_featured?: boolean;
  show_in_menu?: boolean;
  tags?: string[];
}
```

**Response:** `201 Created`

```typescript
{
  id: string;
  organization_id: string;
  name: string;
  slug: string;                  // Generado automáticamente (ej: 'bebidas-calientes')
  type: CategoryType;
  status: CategoryStatus;
  parent_id?: string;
  level: number;                 // 0 = raíz, 1 = hijo, 2 = nieto...
  path: string;                  // '/bebidas/calientes'
  display_order: number;
  icon?: string;
  color?: string;
  // ... resto de campos
  created_at: Date;
  updated_at: Date;
}
```

**Errores:**

- `409 Conflict` - Nombre de categoría ya existe
- `404 Not Found` - parent_id no existe

---

### 2. Listar Categorías

Obtiene lista de categorías con filtros opcionales.

**Endpoint:** `GET /categories`

**Query Parameters:**

```typescript
{
  organization_id?: string;
  type?: 'product' | 'inventory' | 'recipe' | 'expense';
  status?: 'active' | 'inactive' | 'archived';
  parent_id?: string;            // null = solo raíces
  level?: number;                // 0, 1, 2...
  is_featured?: 'true' | 'false';
  show_in_menu?: 'true' | 'false';
  search?: string;               // Buscar en name, description
  sort_by?: 'name' | 'display_order' | 'created_at';
  order?: 'asc' | 'desc';
}
```

**Response:** `200 OK`

```typescript
Category[]
```

**Ejemplo:**

```
GET /categories?organization_id=org123&type=product&status=active&sort_by=display_order
```

---

### 3. Obtener Categoría por ID

**Endpoint:** `GET /categories/:id`

**Response:** `200 OK`

```typescript
Category;
```

**Errores:**

- `404 Not Found` - Categoría no encontrada

---

### 4. Obtener Categoría por Slug

Busca categoría por su slug URL-friendly.

**Endpoint:** `GET /categories/slug/:slug/:organization_id`

**Ejemplo:**

```
GET /categories/slug/bebidas-calientes/org_abc123
```

**Response:** `200 OK`

```typescript
Category;
```

---

### 5. Obtener Árbol de Categorías

Retorna estructura jerárquica completa de categorías.

**Endpoint:** `GET /categories/organization/:organization_id/tree`

**Response:** `200 OK`

```typescript
CategoryTree[]
```

**Estructura CategoryTree:**

```typescript
{
  id: string;
  name: string;
  slug: string;
  level: number;
  display_order: number;
  children: CategoryTree[];      // Recursivo
  product_count?: number;        // Productos directos
  total_product_count?: number;  // Incluye subcategorías
  // ... resto de campos Category
}
```

**Ejemplo de respuesta:**

```json
[
  {
    "id": "cat_bebidas",
    "name": "Bebidas",
    "level": 0,
    "product_count": 5,
    "total_product_count": 23,
    "children": [
      {
        "id": "cat_calientes",
        "name": "Calientes",
        "level": 1,
        "product_count": 8,
        "total_product_count": 8,
        "children": []
      },
      {
        "id": "cat_frias",
        "name": "Frías",
        "level": 1,
        "product_count": 10,
        "children": [
          {
            "id": "cat_frappes",
            "name": "Frappés",
            "level": 2,
            "product_count": 5,
            "children": []
          }
        ]
      }
    ]
  }
]
```

---

### 6. Obtener Breadcrumbs

Retorna ruta de navegación desde raíz hasta la categoría.

**Endpoint:** `GET /categories/:id/breadcrumbs`

**Response:** `200 OK`

```typescript
CategoryBreadcrumb[]
```

**Estructura:**

```typescript
{
  id: string;
  name: string;
  slug: string;
  level: number;
}
```

**Ejemplo:**

```json
[
  { "id": "cat1", "name": "Bebidas", "slug": "bebidas", "level": 0 },
  { "id": "cat2", "name": "Frías", "slug": "frias", "level": 1 },
  { "id": "cat3", "name": "Frappés", "slug": "frappes", "level": 2 }
]
```

---

### 7. Obtener Hijos Directos

Retorna solo las categorías hijas inmediatas.

**Endpoint:** `GET /categories/:id/children`

**Response:** `200 OK`

```typescript
Category[]  // Solo nivel inmediato inferior
```

---

### 8. Obtener Todos los Descendientes

Retorna todos los descendientes (hijos, nietos, bisnietos...).

**Endpoint:** `GET /categories/:id/descendants`

**Response:** `200 OK`

```typescript
Category[]  // Todos los descendientes en cualquier nivel
```

---

### 9. Actualizar Categoría

Actualiza campos de una categoría existente.

**Endpoint:** `PATCH /categories/:id`

**Request Body:** (todos opcionales)

```typescript
{
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  status?: 'active' | 'inactive' | 'archived';
  is_featured?: boolean;
  show_in_menu?: boolean;
  tags?: string[];
  // ... otros campos
}
```

**Response:** `200 OK`

```typescript
Category; // Categoría actualizada
```

**Errores:**

- `404 Not Found` - Categoría no existe
- `409 Conflict` - Nombre duplicado

---

### 10. Mover Categoría

Mueve una categoría a nuevo padre y/o reordena.

**Endpoint:** `PATCH /categories/:id/move`

**Request Body:**

```typescript
{
  new_parent_id?: string | null;  // null = mover a raíz
  new_display_order?: number;
}
```

**Response:** `200 OK`

```typescript
Category; // Categoría con level y path actualizados
```

**Comportamiento:**

- Actualiza `level` según profundidad del nuevo padre
- Recalcula `path` (ej: `/bebidas/calientes`)
- Actualiza `display_order` si se proporciona
- Valida que no se cree ciclo (padre no puede ser descendiente)

**Errores:**

- `400 Bad Request` - Intentar mover a un descendiente propio (ciclo)
- `404 Not Found` - new_parent_id no existe

---

### 11. Eliminar Categoría

Elimina una categoría si no tiene productos ni hijos.

**Endpoint:** `DELETE /categories/:id`

**Response:** `204 No Content`

**Errores:**

- `404 Not Found` - Categoría no existe
- `400 Bad Request` - Categoría tiene productos o subcategorías

**Nota:** Para eliminar categorías con hijos, primero mover/eliminar los hijos.

---

### 12. Obtener Estadísticas

Retorna métricas agregadas de categorías.

**Endpoint:** `GET /categories/organization/:organization_id/stats`

**Response:** `200 OK`

```typescript
{
  total_categories: number;
  by_type: {
    product: number;
    inventory: number;
    recipe: number;
    expense: number;
  };
  by_status: {
    active: number;
    inactive: number;
    archived: number;
  };
  by_level: {
    0: number;  // Categorías raíz
    1: number;  // Nivel 1
    2: number;  // Nivel 2
    // ...
  };
  total_products: number;
  average_products_per_category: number;
  categories_without_products: number;
}
```

---

### 13. Reordenar Múltiples Categorías

Actualiza el orden de visualización de múltiples categorías.

**Endpoint:** `POST /categories/reorder`

**Request Body:**

```typescript
{
  items: [
    { id: string, sortOrder: number },
    { id: string, sortOrder: number },
    // ...
  ];
}
```

**Response:** `200 OK`

```typescript
{
  success: true;
  data: {
    count: number; // Categorías reordenadas exitosamente
  }
  message: 'X categorías reordenadas exitosamente';
}
```

**Ejemplo:**

```json
{
  "items": [
    { "id": "cat_bebidas", "sortOrder": 0 },
    { "id": "cat_alimentos", "sortOrder": 1 },
    { "id": "cat_postres", "sortOrder": 2 }
  ]
}
```

**Uso típico:** Drag & drop en UI para reordenar menú

---

### 14. Eliminar Múltiples Categorías

Elimina múltiples categorías en una operación.

**Endpoint:** `POST /categories/bulk-delete`

**Request Body:**

```typescript
{
  categoryIds: string[];
}
```

**Response:** `200 OK`

```typescript
{
  success: true;
  data: {
    count: number;
  }
  message: 'X categorías eliminadas exitosamente';
}
```

**Comportamiento:**

- Valida que cada categoría no tenga productos
- Valida que cada categoría no tenga hijos
- Continúa con siguiente si una falla
- Retorna contador de éxitos

**Ejemplo:**

```json
{
  "categoryIds": ["cat1", "cat2", "cat3"]
}
```

---

### 15. Actualizar Estado Masivo

Cambia el estado de múltiples categorías.

**Endpoint:** `POST /categories/bulk-update-status`

**Request Body:**

```typescript
{
  categoryIds: string[];
  status: 'active' | 'inactive' | 'archived';
}
```

**Response:** `200 OK`

```typescript
{
  success: true;
  data: {
    count: number;
  }
  message: 'X categorías actualizadas a {status}';
}
```

**Ejemplo:**

```json
{
  "categoryIds": ["cat1", "cat2"],
  "status": "inactive"
}
```

---

## Tipos y Enums

### CategoryType

```typescript
enum CategoryType {
  PRODUCT = 'product', // Categorías de productos del menú
  INVENTORY = 'inventory', // Categorías de inventario/insumos
  RECIPE = 'recipe', // Categorías de recetas
  EXPENSE = 'expense', // Categorías de gastos
}
```

### CategoryStatus

```typescript
enum CategoryStatus {
  ACTIVE = 'active', // Categoría activa y visible
  INACTIVE = 'inactive', // Oculta pero no eliminada
  ARCHIVED = 'archived', // Archivada (histórico)
}
```

---

## Validaciones Comunes

### Nombre de Categoría

- Debe ser único por organización
- Mínimo 2 caracteres
- Máximo 100 caracteres
- Se genera slug automáticamente (URL-friendly)

### Color

- Formato hex válido: `#RRGGBB`
- Ejemplo: `#FF5733`, `#3B82F6`

### Jerarquía

- Máximo 5 niveles de profundidad (configurable)
- No se permiten ciclos (padre no puede ser descendiente)
- Al mover categoría, todos los hijos se mueven también

### Display Order

- Número entero >= 0
- Menor número = aparece primero
- Se puede duplicar (empate se resuelve por nombre)

---

## Ejemplos de Uso

### Crear Estructura de Menú

```bash
# 1. Crear categoría raíz
POST /categories
{
  "organization_id": "org123",
  "name": "Bebidas",
  "type": "product",
  "icon": "coffee",
  "color": "#8B4513",
  "display_order": 0
}
# Response: { "id": "cat_bebidas", "level": 0, "path": "/bebidas", ... }

# 2. Crear subcategoría
POST /categories
{
  "organization_id": "org123",
  "name": "Calientes",
  "type": "product",
  "parent_id": "cat_bebidas",
  "display_order": 0
}
# Response: { "id": "cat_calientes", "level": 1, "path": "/bebidas/calientes", ... }

# 3. Crear categoría de tercer nivel
POST /categories
{
  "organization_id": "org123",
  "name": "Espresso",
  "type": "product",
  "parent_id": "cat_calientes",
  "display_order": 0
}
# Response: { "id": "cat_espresso", "level": 2, "path": "/bebidas/calientes/espresso", ... }
```

### Obtener Árbol para Navegación

```bash
GET /categories/organization/org123/tree

# Response: Estructura jerárquica completa
[
  {
    "name": "Bebidas",
    "children": [
      {
        "name": "Calientes",
        "children": [
          { "name": "Espresso", "children": [] },
          { "name": "Americano", "children": [] }
        ]
      },
      {
        "name": "Frías",
        "children": [...]
      }
    ]
  }
]
```

### Reordenar Menú con Drag & Drop

```bash
POST /categories/reorder
{
  "items": [
    { "id": "cat_postres", "sortOrder": 0 },    # Movido a primero
    { "id": "cat_bebidas", "sortOrder": 1 },    # Ahora segundo
    { "id": "cat_alimentos", "sortOrder": 2 }   # Ahora tercero
  ]
}
```

### Mover Categoría a Diferente Padre

```bash
# Mover "Espresso" de "Calientes" a raíz
PATCH /categories/cat_espresso/move
{
  "new_parent_id": null,  # null = raíz
  "new_display_order": 0
}
# Result: level = 0, path = "/espresso"
```

### Desactivar Categorías de Temporada

```bash
POST /categories/bulk-update-status
{
  "categoryIds": ["cat_pumpkin_spice", "cat_holiday_drinks"],
  "status": "inactive"
}
```

---

## Casos de Uso Específicos

### 1. Menú de Cafetería

```
Bebidas (level 0)
├── Calientes (level 1)
│   ├── Espresso (level 2)
│   ├── Americano (level 2)
│   └── Cappuccino (level 2)
├── Frías (level 1)
│   ├── Frappés (level 2)
│   └── Smoothies (level 2)
└── Especiales (level 1)

Alimentos (level 0)
├── Panadería (level 1)
└── Bocadillos (level 1)
```

### 2. Breadcrumbs de Navegación

```bash
GET /categories/cat_cappuccino/breadcrumbs

# UI: Bebidas > Calientes > Cappuccino
[
  { "name": "Bebidas", "slug": "bebidas", "level": 0 },
  { "name": "Calientes", "slug": "calientes", "level": 1 },
  { "name": "Cappuccino", "slug": "cappuccino", "level": 2 }
]
```

### 3. Filtrar Productos por Categoría + Descendientes

```bash
# 1. Obtener todos los descendientes de "Bebidas"
GET /categories/cat_bebidas/descendants

# 2. Usar IDs para filtrar productos
GET /products?category_id=cat_bebidas,cat_calientes,cat_frias,cat_espresso,...
```

---

## Códigos de Estado HTTP

- `200 OK` - Operación exitosa
- `201 Created` - Categoría creada
- `204 No Content` - Eliminación exitosa
- `400 Bad Request` - Validación fallida, ciclo detectado
- `401 Unauthorized` - Token inválido
- `404 Not Found` - Categoría no encontrada
- `409 Conflict` - Nombre duplicado

---

## Notas Técnicas

### Multi-Tenancy

- Todas las categorías están aisladas por `organization_id`
- Slugs deben ser únicos solo dentro de la organización
- Filtrado automático por organización en consultas

### Performance

- Árbol de categorías usa Map en memoria (desarrollo)
- En producción: Prisma + PostgreSQL con Nested Sets o Closure Table
- Cache recomendado para árbol completo (cambios poco frecuentes)

### Slug Generation

- Generado automáticamente desde `name`
- Formato: lowercase, sin espacios, sin acentos
- Ejemplo: "Bebidas Calientes" → "bebidas-calientes"

### Path Calculation

- Construido recursivamente desde raíz
- Formato: `/parent/child/grandchild`
- Se actualiza en cascada al mover categorías

---

## Swagger UI

Documentación interactiva disponible en:

```
/api/docs
```

Todos los endpoints tienen:

- Decoradores `@ApiOperation`
- Esquemas de request/response
- Ejemplos de uso
- Códigos de error documentados

---

## Próximas Mejoras

- [ ] Integración con Prisma ORM
- [ ] Soft delete con `deleted_at`
- [ ] Upload de imágenes para categorías
- [ ] Traducciones multi-idioma
- [ ] SEO metadata (meta_title, meta_description)
- [ ] Permisos granulares por categoría
- [ ] Auditoría de cambios (change log)
- [ ] Import/Export de estructura jerárquica
