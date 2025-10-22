# Sistema de Modificadores - CoffeeOS Admin

## 📋 Descripción General

El sistema de modificadores permite agregar opciones personalizables a los productos, como tamaños, extras, tipos de leche, ingredientes adicionales, etc. Está diseñado para ser flexible y adaptarse a diferentes tipos de negocios de alimentos y bebidas.

## 🎯 Características Principales

### 1. Grupos de Modificadores

Cada grupo de modificadores define un conjunto de opciones relacionadas:

- **Nombre**: Identificador del grupo (ej: "Tamaños", "Extras", "Tipo de Leche")
- **Tipo de Selección**:
  - **Una opción (SINGLE)**: El cliente debe elegir exactamente una opción (radio buttons)
  - **Múltiples opciones (MULTIPLE)**: El cliente puede elegir varias opciones (checkboxes)
- **Obligatorio**: Define si el cliente debe seleccionar una opción
- **Min/Max Selecciones**: Para tipo MULTIPLE, define cuántas opciones se pueden elegir

### 2. Opciones de Modificador

Cada opción dentro de un grupo tiene:

- **Nombre**: Nombre de la opción (ej: "Chico", "Mediano", "Grande")
- **Ajuste de Precio**: Incremento o descuento sobre el precio base
  - Valores positivos: Incremento (ej: +$15.00 para tamaño grande)
  - Valores negativos: Descuento (ej: -$5.00 para sin crema)
  - Cero: Sin cambio de precio
- **Por defecto**: (Solo para SINGLE) Marca la opción que viene seleccionada

## 🚀 Flujo de Uso

### Crear un Grupo de Modificadores

1. Navegar a **Productos → Modificadores** o hacer clic en "Gestionar grupos" desde el modal de productos
2. Hacer clic en **"Nuevo Grupo"**
3. Completar el formulario:
   - Nombre del grupo
   - Tipo de selección (SINGLE o MULTIPLE)
   - Marcar si es obligatorio
   - Si es MULTIPLE, definir mínimo y máximo de selecciones
4. Agregar opciones:
   - Hacer clic en **"Agregar Opción"**
   - Ingresar nombre y ajuste de precio
   - Para SINGLE, seleccionar cuál es la opción por defecto
5. Guardar el grupo

### Asignar Modificadores a un Producto

1. Desde la lista de productos, editar un producto existente o crear uno nuevo
2. En el formulario, desplazarse a la sección **"Modificadores Opcionales"**
3. Seleccionar los grupos que aplican al producto
4. Los grupos seleccionados aparecerán en el POS cuando se agregue el producto al carrito

## 📊 Ejemplos de Uso

### Ejemplo 1: Tamaños de Café

```
Grupo: Tamaños
Tipo: SINGLE (una opción)
Obligatorio: Sí

Opciones:
- Chico       $0.00   [Por defecto]
- Mediano    +$10.00
- Grande     +$15.00
```

### Ejemplo 2: Extras para Postres

```
Grupo: Extras
Tipo: MULTIPLE (múltiples opciones)
Obligatorio: No
Min: 0, Max: 3

Opciones:
- Crema batida    +$8.00
- Caramelo        +$5.00
- Chocolate       +$5.00
- Chispas         +$3.00
- Fresas          +$12.00
```

### Ejemplo 3: Tipo de Leche

```
Grupo: Tipo de Leche
Tipo: SINGLE (una opción)
Obligatorio: Sí

Opciones:
- Entera      $0.00   [Por defecto]
- Descremada  $0.00
- Almendra   +$15.00
- Soya       +$10.00
- Coco       +$20.00
```

### Ejemplo 4: Ingredientes Personalizables

```
Grupo: Ingredientes
Tipo: MULTIPLE (múltiples opciones)
Obligatorio: No
Min: 0, Max: 5

Opciones:
- Extra shot espresso  +$15.00
- Sin azúcar            $0.00
- Sin crema             $0.00
- Doble shot           +$25.00
- Descafeinado          $0.00
```

## 🎨 Interfaz de Usuario

### Lista de Grupos de Modificadores

- **Vista de Tarjetas**: Cada grupo se muestra en una tarjeta con:
  - Nombre del grupo
  - Badge de tipo (Una opción / Múltiples opciones)
  - Badge de "Obligatorio" (si aplica)
  - Información de min/max (para MULTIPLE)
  - Lista de opciones con precios
  - Botones de editar y eliminar

### Modal de Creación/Edición

- **Información Básica**:
  - Campo de nombre
  - Selector de tipo (SINGLE/MULTIPLE)
  - Checkbox de obligatorio
  - Campos de min/max selecciones (solo para MULTIPLE)

- **Gestión de Opciones**:
  - Lista dinámica de opciones
  - Botón "Agregar Opción"
  - Cada opción tiene:
    - Campo de nombre
    - Campo de ajuste de precio ($)
    - Radio button "Por defecto" (solo para SINGLE)
    - Botón eliminar (mínimo 1 opción requerida)

### Integración en ProductModal

- **Sección de Modificadores**:
  - Aparece si hay grupos creados
  - Grid de 2 columnas con checkboxes
  - Cada grupo muestra:
    - Nombre
    - Badge de tipo
    - Badge de "Req." (si es obligatorio)
    - Cantidad de opciones
  - Contador de grupos seleccionados
  - Link directo a gestionar grupos

## 🔄 Comportamiento en el POS

Cuando un producto con modificadores se agrega al carrito:

1. Se muestra un modal/drawer con los grupos de modificadores
2. Para cada grupo:
   - Si es **SINGLE**: Radio buttons para seleccionar una opción
   - Si es **MULTIPLE**: Checkboxes con validación de min/max
   - Si es **Obligatorio**: No se puede agregar sin seleccionar
3. El precio se actualiza dinámicamente según las selecciones
4. Al confirmar, el producto se agrega con las opciones seleccionadas
5. En el carrito se muestra:
   - Producto base
   - Modificadores seleccionados (indentados)
   - Precio total ajustado

## 💾 Estructura de Datos

### Modifier (Grupo)

```typescript
interface Modifier {
  id: UUID;
  name: string;                    // "Tamaños"
  type: 'SINGLE' | 'MULTIPLE';     // Tipo de selección
  required: boolean;               // ¿Es obligatorio?
  min_selections: number;          // Mínimo de opciones (MULTIPLE)
  max_selections: number;          // Máximo de opciones (MULTIPLE)
  options: ModifierOption[];       // Lista de opciones
  created_at: Date;
  updated_at: Date;
}
```

### ModifierOption (Opción)

```typescript
interface ModifierOption {
  id: UUID;
  name: string;                    // "Grande"
  price_adjustment: number;        // +15.00
  is_default: boolean;             // ¿Es la opción por defecto?
}
```

### SelectedModifier (Selección en Orden)

```typescript
interface SelectedModifier {
  modifier_id: UUID;               // ID del grupo
  modifier_name: string;           // "Tamaños"
  option_id: UUID;                 // ID de la opción
  option_name: string;             // "Grande"
  price_adjustment: number;        // +15.00
}
```

## 🔌 Endpoints API

### GET /api/modifiers
Lista todos los grupos de modificadores

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Tamaños",
      "type": "SINGLE",
      "required": true,
      "min_selections": 1,
      "max_selections": 1,
      "options": [
        {
          "id": "uuid",
          "name": "Chico",
          "price_adjustment": 0,
          "is_default": true
        },
        {
          "id": "uuid",
          "name": "Grande",
          "price_adjustment": 15,
          "is_default": false
        }
      ]
    }
  ]
}
```

### POST /api/modifiers
Crear un nuevo grupo de modificadores

**Request:**
```json
{
  "name": "Tamaños",
  "type": "SINGLE",
  "required": true,
  "min_selections": 1,
  "max_selections": 1,
  "options": [
    {
      "name": "Chico",
      "price_adjustment": 0,
      "is_default": true
    },
    {
      "name": "Grande",
      "price_adjustment": 15,
      "is_default": false
    }
  ]
}
```

### PUT /api/modifiers/:id
Actualizar un grupo existente

### DELETE /api/modifiers/:id
Eliminar un grupo (verifica que no esté en uso)

## ✅ Validaciones

### En el Frontend

- Nombre del grupo: Requerido
- Tipo: Requerido (SINGLE o MULTIPLE)
- Min selecciones: ≥ 0 (solo para MULTIPLE)
- Max selecciones: ≥ 1 y > min_selections (solo para MULTIPLE)
- Opciones: Mínimo 1 opción requerida
- Nombre de opción: Requerido para cada opción
- Precio de ajuste: Número válido

### En el Backend

- Multi-tenancy: Validar organization_id y location_id
- Unicidad: Nombre del grupo único por organización
- Integridad: Al eliminar, verificar que no haya productos usando el grupo
- Lógica de negocio:
  - Para SINGLE: Solo una opción puede ser is_default
  - Para MULTIPLE: min_selections ≤ max_selections
  - max_selections ≤ cantidad de opciones disponibles

## 🎯 Casos de Uso Reales

### Café Especializado
- Tamaños (SINGLE, obligatorio)
- Tipo de leche (SINGLE, obligatorio)
- Shots extra (MULTIPLE, opcional, max: 3)
- Sabores (MULTIPLE, opcional, max: 2)

### Restaurante de Hamburguesas
- Término de cocción (SINGLE, obligatorio)
- Quesos (MULTIPLE, opcional, max: 2)
- Vegetales (MULTIPLE, opcional, max: 5)
- Salsas (MULTIPLE, opcional, max: 3)
- Extras (MULTIPLE, opcional, max: 4)

### Pizzería
- Tamaño (SINGLE, obligatorio)
- Tipo de masa (SINGLE, obligatorio)
- Ingredientes extra (MULTIPLE, opcional, max: 8)
- Quesos adicionales (MULTIPLE, opcional, max: 2)

### Heladería
- Tamaño (SINGLE, obligatorio)
- Sabores (MULTIPLE, obligatorio, min: 1, max: 3)
- Toppings (MULTIPLE, opcional, max: 5)
- Salsa (SINGLE, opcional)

## 📝 Notas Técnicas

### Rendimiento

- Los modificadores se cargan una vez al inicio y se cachean
- React Query mantiene la cache sincronizada
- Invalidación automática al crear/editar/eliminar

### Escalabilidad

- Límite recomendado: 20 grupos de modificadores por organización
- Límite recomendado: 15 opciones por grupo
- Límite de 5 grupos por producto (mejor UX en el POS)

### Mejoras Futuras

- [ ] Drag & drop para reordenar opciones
- [ ] Copiar grupo de modificadores
- [ ] Importar/exportar modificadores vía CSV
- [ ] Modificadores con imágenes
- [ ] Modificadores con límite de inventario
- [ ] Previsualización en vivo del POS
- [ ] Estadísticas de opciones más seleccionadas

## 🐛 Troubleshooting

### Los modificadores no aparecen en el producto
- Verificar que el grupo esté creado correctamente
- Asegurar que el grupo tenga al menos una opción
- Revisar que el producto tenga el grupo asignado

### Error al guardar grupo
- Verificar que el nombre sea único
- Verificar que haya al menos una opción
- Para MULTIPLE, verificar que min ≤ max

### Los precios no se calculan correctamente
- Verificar que price_adjustment sea un número válido
- Revisar que no haya opciones con precios null o undefined
- Verificar la lógica de suma en el carrito del POS

---

**Componentes creados:**
- `ModifierGroupModal.tsx` - Modal para crear/editar grupos (355 líneas)
- `ModifierGroupsList.tsx` - Lista de grupos con acciones (215 líneas)
- `app/dashboard/modifiers/page.tsx` - Página principal de modificadores
- Integración en `ProductModal.tsx` - Sección de selección de modificadores

**Estado:** ✅ Completado
**Próximo:** Acciones masivas en tabla de productos
