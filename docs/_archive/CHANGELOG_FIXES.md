# Registro de Correcciones y Auditoría de Integridad de Datos

## Objetivo

Asegurar la integridad relacional entre Inventario, Recetas, Costeo y POS, y verificar la propagación correcta de `organizationId` en todo el sistema.

## Estado Actual

- [x] Auditoría de Hooks Frontend (`use-inventory`, `use-recipes`, `use-orders`): **APROBADO**. `organizationId` se inyecta correctamente.
- [ ] Análisis de Modelos (Prisma Schema)
- [ ] Simulación de Flujo de Datos (Backend)
- [ ] Verificación de Endpoints

## Hallazgos

_Iniciando auditoría..._

### 🚨 Hallazgo Crítico: Falta de Multi-Tenancy en Inventarios

**Fecha:** 02/12/2025
**Severidad:** ALTA

Durante el análisis del esquema de base de datos (`schema.prisma`), se detectó que las siguientes entidades carecen del campo `organizationId`, lo que rompería el aislamiento de datos entre clientes:

1.  **`InventoryItem`**: Los insumos (ej. "Leche", "Café Grano") son globales. Si el Cliente A crea "Leche", el Cliente B vería ese mismo registro o tendría conflictos de unicidad con el campo `code`.
2.  **`Supplier`**: Los proveedores son globales.

**Acción Requerida:**

1.  Agregar `organizationId` a `InventoryItem`.
2.  Actualizar la restricción de unicidad de `code` en `InventoryItem` para que sea compuesta: `@@unique([code, organizationId])`.
3.  Agregar `organizationId` a `Supplier`.
4.  Actualizar relaciones en `Organization`.

### 🚨 Hallazgo Crítico: Modelo de Datos Incompleto

**Fecha:** 02/12/2025
**Severidad:** MEDIA

El modelo Prisma `InventoryItem` es significativamente más simple que el DTO `CreateInventoryItemDto` y la interfaz utilizada en el servicio. Faltan campos críticos para la operación real:

- `brand`
- `type` (Ingrediente, Suministro, etc.)
- `conversion_factor` y `conversion_unit` (Vital para recetas: ej. Botella -> Mililitros)
- `barcode`
- `storage_location`
- `is_perishable`

**Acción Requerida:**

- Extender el modelo `InventoryItem` en `schema.prisma` para soportar estos campos, o utilizar un campo `metadata` JSON para flexibilidad. Por ahora, se priorizará la corrección de `organizationId` y la implementación básica en Prisma.

## Correcciones Aplicadas

- [x] **Schema**: Agregado `organizationId` a `InventoryItem` y `Supplier`.
- [x] **Schema**: Actualizada unicidad de `InventoryItem` a `[code, organizationId]`.
- [x] **Backend**: Actualizado `InventoryService.findAll` para filtrar por `organizationId`.
- [x] **Backend**: Actualizado `RecipesService.findAll` para filtrar por `organizationId`.
- [x] **Backend**: Refactorizado `PosService` para usar inyección de dependencias.
- [x] **Backend**: Implementada lógica de descuento de inventario en `PosService.closeTicket`.

## Próximos Pasos

- [ ] Verificar endpoints de API (Swagger/Postman) para asegurar que los cambios funcionan.
- [ ] Ejecutar migración de base de datos (cuando sea posible) para aplicar cambios de schema.
- [ ] Implementar campos faltantes en `InventoryItem` (metadata).

### 🚨 Hallazgo Crítico: Lógica de Descuento de Inventario Inexistente

**Fecha:** 02/12/2025
**Severidad:** CRÍTICA

El servicio `PosService` tiene un comentario `// TODO: Aquí iría la lógica de descuento de inventario` en el método `closeTicket`. Esto significa que las ventas **NO** están descontando inventario.

**Acción Requerida:**

1.  Implementar la lógica de descuento en `closeTicket`.
2.  Recuperar las líneas del ticket.
3.  Buscar la receta activa para cada producto.
4.  Calcular el consumo de ingredientes.
5.  Actualizar `InventoryItem.currentStock`.
6.  Registrar `InventoryMovement` (tipo `SALE`).

### ⚠️ Deuda Técnica: Inyección de Dependencias

`PosService` instancia `new PrismaClient()` directamente en lugar de usar `PrismaService` inyectado. Esto rompe el patrón de NestJS y dificulta el testing.

**Acción Requerida:**

- Refactorizar `PosService` para usar inyección de dependencias.
