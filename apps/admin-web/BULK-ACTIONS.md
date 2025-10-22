# Acciones Masivas - Sistema de Productos

## 📋 Descripción General

El sistema de acciones masivas permite realizar operaciones en múltiples productos simultáneamente, mejorando la eficiencia en la gestión del catálogo. Incluye una barra flotante que aparece al seleccionar productos.

## ✨ Características Implementadas

### 1. Selección de Productos

- **Checkbox en cada fila**: Seleccionar productos individuales
- **Checkbox en header**: Seleccionar/deseleccionar todos los productos de la página
- **Persistencia de selección**: La selección se mantiene al cambiar de página
- **Indicador visual**: Fila seleccionada con fondo destacado

### 2. Barra de Acciones Flotante

Aparece automáticamente cuando hay productos seleccionados:

**Posición**: Fija en la parte inferior central de la pantalla
**Diseño**: Barra oscura redondeada con sombra elevada
**Animación**: Entrada suave desde abajo

#### Componentes de la Barra:

1. **Contador de Selección**
   - Badge circular con número de productos seleccionados
   - Texto descriptivo (singular/plural)

2. **Acciones Disponibles**:
   
   **Cambiar Categoría**:
   - Icono: `FolderInput`
   - Dropdown con lista de categorías
   - Selección muestra ícono y nombre de categoría
   - Actualización en batch
   
   **Activar Productos**:
   - Icono: `ToggleRight`
   - Cambia el estado a "Activo"
   - Feedback visual inmediato
   
   **Desactivar Productos**:
   - Icono: `ToggleLeft`
   - Cambia el estado a "Inactivo"
   - Útil para productos temporalmente no disponibles
   
   **Exportar a CSV**:
   - Icono: `Download`
   - Genera archivo CSV con productos seleccionados
   - Columnas: SKU, Nombre, Categoría, Precio, Stock, Estado
   - Nombre archivo: `productos_YYYY-MM-DD.csv`
   - Encoding: UTF-8 con BOM
   
   **Eliminar Productos**:
   - Icono: `Trash2`
   - Confirmación obligatoria
   - Advertencia de acción irreversible
   - Botón destacado en rojo

3. **Limpiar Selección**
   - Icono: `X`
   - Cierra la barra
   - Deselecciona todos los productos

## 🎯 Flujos de Uso

### Cambiar Categoría en Lote

1. Seleccionar productos usando checkboxes
2. Hacer clic en "Categoría" en la barra de acciones
3. Se despliega dropdown con categorías disponibles
4. Seleccionar la categoría destino
5. Confirmación automática
6. Actualización en backend
7. Tabla se actualiza mostrando nueva categoría
8. Selección se limpia automáticamente

### Activar/Desactivar en Lote

**Activar productos:**
1. Seleccionar productos inactivos
2. Clic en "Activar"
3. Estados actualizados a "Activo"
4. Badge verde en tabla

**Desactivar productos:**
1. Seleccionar productos activos
2. Clic en "Desactivar"
3. Estados actualizados a "Inactivo"
4. Badge gris en tabla

**Casos de uso:**
- Productos de temporada
- Items agotados temporalmente
- Cambios de menú
- Pruebas de nuevos productos

### Exportar Productos a CSV

1. Seleccionar productos a exportar
2. Clic en "Exportar"
3. Archivo CSV se descarga automáticamente
4. Abrir en Excel, Google Sheets, etc.

**Formato del CSV:**

```csv
SKU,Nombre,Categoría,Precio,Stock,Estado
"CF001","Café Americano","Bebidas Calientes","35.00","150","Activo"
"CF002","Latte","Bebidas Calientes","45.00","120","Activo"
"PS001","Croissant","Pastelería","30.00","45","Inactivo"
```

**Usos:**
- Backups de catálogo
- Análisis en hojas de cálculo
- Reportes para contabilidad
- Compartir con proveedores
- Auditorías de inventario

### Eliminar en Lote

1. Seleccionar productos a eliminar
2. Clic en "Eliminar" (botón rojo)
3. Aparece diálogo de confirmación:
   ```
   ¿Estás seguro de eliminar X producto(s)?
   
   Esta acción no se puede deshacer.
   ```
4. Confirmar eliminación
5. Productos eliminados del sistema
6. Tabla actualizada
7. Notificación de éxito

**⚠️ Advertencias:**
- Acción irreversible
- Verificar selección antes de eliminar
- Productos en órdenes activas no se pueden eliminar
- Considerar "Desactivar" en lugar de eliminar

## 🎨 Interfaz de Usuario

### Barra de Acciones Flotante

```
┌─────────────────────────────────────────────────────────────────┐
│  [5] 5 productos seleccionados │ Categoría ▼ │ Activar │ ... │ ✕ │
└─────────────────────────────────────────────────────────────────┘
```

**Diseño:**
- Fondo: `bg-gray-900`
- Texto: Blanco
- Botones: `bg-gray-800` con hover `bg-gray-700`
- Botón eliminar: `bg-red-600` con hover `bg-red-700`
- Bordes redondeados: `rounded-full`
- Sombra: `shadow-2xl`
- Padding: `px-6 py-4`

### Dropdown de Categorías

```
┌─────────────────────────┐
│ Selecciona una categoría│
├─────────────────────────┤
│ ☕ Bebidas Calientes    │
│ 🥤 Bebidas Frías        │
│ 🥐 Pastelería           │
│ 🥗 Alimentos            │
└─────────────────────────┘
```

**Características:**
- Posición: Sobre la barra (bottom-full)
- Fondo blanco con borde gris
- Scroll si hay muchas categorías
- Hover con fondo gris claro
- Cierre automático al seleccionar

### Animaciones

- **Entrada de barra**: `animate-in slide-in-from-bottom-4`
- **Transiciones de botones**: `transition-colors`
- **Hover**: Cambio suave de color de fondo

## 💾 Endpoints API

### POST /api/products/bulk-delete

Elimina múltiples productos

**Request:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "deleted_count": 3,
  "message": "3 producto(s) eliminado(s)"
}
```

### POST /api/products/bulk-update-status

Actualiza el estado de múltiples productos

**Request:**
```json
{
  "productIds": ["uuid1", "uuid2"],
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 2,
  "message": "2 producto(s) activados"
}
```

### POST /api/products/bulk-update-category

Cambia la categoría de múltiples productos

**Request:**
```json
{
  "productIds": ["uuid1", "uuid2", "uuid3"],
  "categoryId": "category-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 3,
  "category": {
    "id": "category-uuid",
    "name": "Bebidas Frías"
  },
  "message": "Categoría actualizada para 3 producto(s)"
}
```

## 🔄 Flujo de Datos

### 1. Selección de Productos

```
User selects checkbox
  ↓
@tanstack/react-table updates selection state
  ↓
table.getSelectedRowModel() returns selected rows
  ↓
BulkActionsBar receives selectedProducts prop
  ↓
Bar appears if selectedProducts.length > 0
```

### 2. Ejecución de Acción

```
User clicks action button
  ↓
useMutation hooks prepare request
  ↓
API call with product IDs
  ↓
Backend processes batch operation
  ↓
Success response
  ↓
React Query invalidates cache
  ↓
Table refetches data
  ↓
Selection cleared
  ↓
Toast notification shown
```

## ✅ Validaciones

### Frontend

- **Selección mínima**: Al menos 1 producto
- **Confirmación de eliminación**: Modal obligatorio
- **Categoría válida**: Solo categorías activas
- **CSV con datos**: Validar que haya productos antes de exportar

### Backend

- **Autenticación**: Usuario autenticado
- **Autorización**: Permisos de edición/eliminación
- **Multi-tenancy**: Productos del mismo organization_id
- **Integridad referencial**:
  - No eliminar productos en órdenes activas
  - No eliminar productos con inventario pendiente
  - Verificar categoría existe antes de asignar

## 🎯 Mejores Prácticas

### UX
- Mostrar contador de seleccionados siempre visible
- Feedback inmediato en cada acción
- Confirmación solo para acciones destructivas
- Limpiar selección después de operación exitosa

### Performance
- Operaciones en batch en backend
- Invalidación de cache eficiente
- Límite razonable de productos seleccionables (max 100)

### Seguridad
- Validar permisos en backend
- Sanitizar IDs de productos
- Rate limiting en endpoints bulk

## 📊 Casos de Uso Reales

### Cambio de Temporada
```
Escenario: Café introduce menú de verano
1. Seleccionar 15 bebidas de invierno
2. Clic en "Desactivar"
3. Resultado: Bebidas ocultas del menú POS
```

### Reorganización de Categorías
```
Escenario: Separar "Postres" en "Pasteles" y "Galletas"
1. Crear nuevas categorías
2. Seleccionar productos tipo pastel
3. Cambiar categoría a "Pasteles"
4. Seleccionar productos tipo galleta
5. Cambiar categoría a "Galletas"
6. Eliminar categoría "Postres" antigua
```

### Exportación para Contador
```
Escenario: Reporte mensual de inventario
1. Seleccionar todos los productos
2. Exportar a CSV
3. Abrir en Excel
4. Agregar columnas de movimientos
5. Enviar a contador
```

### Limpieza de Catálogo
```
Escenario: Eliminar productos descontinuados
1. Filtrar productos con stock = 0
2. Seleccionar productos no vendidos en 6 meses
3. Revisar lista
4. Clic en "Eliminar"
5. Confirmar eliminación
6. Resultado: Catálogo limpio
```

## 🐛 Troubleshooting

### La barra no aparece
- Verificar que hay productos seleccionados
- Revisar que BulkActionsBar está renderizado
- Comprobar z-index de la barra

### Las acciones no funcionan
- Verificar endpoints API están implementados
- Revisar console para errores de red
- Validar permisos de usuario

### CSV no se descarga
- Verificar que el navegador permite descargas
- Revisar bloqueadores de pop-ups
- Comprobar formato del CSV

### Selección se pierde
- Verificar que table.resetRowSelection() no se llama indebidamente
- Revisar estado de paginación
- Comprobar que no hay re-renders innecesarios

---

**Componente:** `BulkActionsBar.tsx` (260 líneas)
**Estado:** ✅ Completado
**Integración:** `app/dashboard/products/page.tsx`
**Próximo:** Backend API endpoints para acciones masivas
