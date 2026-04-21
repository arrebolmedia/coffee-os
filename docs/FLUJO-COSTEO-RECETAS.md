# 🔄 Sistema de Costeo y Activación de Productos

## Flujo de Trabajo Completo

### 1️⃣ CREACIÓN DE RECETA

**Módulo**: Recetas  
**Acción**: Crear nueva receta para un producto

```typescript
// Usuario crea receta "Cappuccino"
const recipe = await createRecipe({
  productId: 'cappuccino-id',
  name: 'Cappuccino Clásico',
  ingredients: [
    { name: 'Espresso', quantity: 30, unit: 'ml' }, // ← No existe
    { name: 'Leche', quantity: 150, unit: 'ml' }, // ← No existe
    { name: 'Espuma de leche', quantity: 50, unit: 'ml' }, // ← No existe
  ],
});

// 🤖 SISTEMA AUTO-CREA ingredientes
await autoCreateIngredients([
  {
    code: 'ING-ESP-001',
    name: 'Espresso',
    unitOfMeasure: 'ml',
    costPerUnit: 0, // ← Sin costear
    costingStatus: 'PENDING', // ← Status pendiente
  },
  // ... demás ingredientes
]);

// 📊 RESULTADO
recipe.costingStatus = 'PENDING'; // Receta sin costear
recipe.readyForPos = false; // NO aparece en POS
product.isAvailable = false; // Oculto del menú
```

---

### 2️⃣ COSTEO DE INGREDIENTES

**Módulo**: Costeo  
**Vista**: Lista de ingredientes pendientes

```typescript
// Usuario ve ingredientes PENDING
const pendingIngredients = await getIngredients({
  where: { costingStatus: 'PENDING' },
});

// Usuario costea cada ingrediente
await updateIngredient('ING-ESP-001', {
  costPerUnit: 0.85, // $0.85 por ml
  supplierId: 'supplier-123',
  costingStatus: 'COMPLETE', // ← Cambia status
});

// 🤖 SISTEMA RECALCULA receta
await recalculateRecipeCost(recipe.id);
// - Suma todos los ingredientes costeados
// - Actualiza recipe.totalCost
// - Cambia recipe.costingStatus → "COMPLETE"
```

**Estados del ingrediente**:

- `PENDING`: Creado sin costo
- `COMPLETE`: Tiene costo asignado

**Estados de la receta**:

- `PENDING`: Sin iniciar costeo
- `PARTIAL`: Algunos ingredientes costeados
- `COMPLETE`: Todos los ingredientes costeados

---

### 3️⃣ ACTIVACIÓN EN POS

**Módulo**: Recetas o Productos  
**Acción**: Aprobar receta para venta

```typescript
// Usuario verifica receta completa
if (recipe.costingStatus === 'COMPLETE') {
  // ✅ Puede activar para POS
  await approveRecipeForPos(recipe.id);
  // - recipe.readyForPos = true
  // - product.isAvailable = true
  // - Ahora SÍ aparece en POS
}

// ❌ Si no está completa
if (recipe.costingStatus !== 'COMPLETE') {
  throw new Error(
    'No puedes activar esta receta. Tienes 3 ingredientes sin costear.',
  );
}
```

---

### 4️⃣ VERIFICACIÓN DE INVENTARIO

**Módulo**: Inventario  
**Acción**: Alertas de stock bajo

```typescript
// Al vender un producto
async function sellProduct(productId: string, quantity: number) {
  // 1. Obtener receta del producto
  const recipe = await getRecipe(productId);

  // 2. Verificar stock de cada ingrediente
  for (const ingredient of recipe.ingredients) {
    const item = await getInventoryItem(ingredient.inventoryItemId);

    const requiredQty = ingredient.quantity * quantity;

    if (item.currentStock < requiredQty) {
      // ⚠️ ALERTA: Stock insuficiente
      await createAlert({
        type: 'LOW_STOCK',
        message: `Stock bajo de ${item.name}: ${item.currentStock} ${item.unitOfMeasure}`,
        severity: 'WARNING',
      });
    }

    if (item.currentStock < item.reorderPoint) {
      // 🚨 CRÍTICO: Por debajo del punto de reorden
      await createPurchaseOrderSuggestion(item);
    }

    // 3. Descontar del inventario
    await createInventoryMovement({
      inventoryItemId: item.id,
      type: 'OUT',
      quantity: requiredQty,
      reason: 'SALE',
      reference: ticketNumber,
    });
  }
}
```

---

## 📊 Estructura de Datos

### InventoryItem (Ingrediente)

```prisma
model InventoryItem {
  code            String        // "ING-ESP-001"
  name            String        // "Espresso"
  costPerUnit     Float         // 0.85
  costingStatus   CostingStatus // PENDING → COMPLETE
  currentStock    Float         // 5000 ml
  reorderPoint    Float         // 1000 ml (alerta)
  parLevel        Float         // 10000 ml (stock ideal)
}
```

### Recipe (Receta)

```prisma
model Recipe {
  name            String         // "Cappuccino Clásico"
  totalCost       Float          // 2.45 (auto-calculado)
  costingStatus   CostingStatus  // PENDING → PARTIAL → COMPLETE
  readyForPos     Boolean        // false → true (manual)
  lastCostedAt    DateTime?      // Última vez que se recalculó
  ingredients     RecipeIngredient[]
}
```

### RecipeIngredient (Ingrediente en receta)

```prisma
model RecipeIngredient {
  quantity    Float    // 30
  unit        String   // "ml"
  unitCost    Float?   // 0.85 (snapshot del costo)
  totalCost   Float?   // 25.5 (quantity * unitCost)
  isCosted    Boolean  // false → true
}
```

---

## 🎯 Validaciones del Sistema

### Al crear ingrediente en receta

```typescript
// Si ingrediente no existe → crear automáticamente
if (!ingredientExists(name)) {
  await createInventoryItem({
    code: generateCode(name),
    name: name,
    unitOfMeasure: unit,
    costPerUnit: 0,
    costingStatus: 'PENDING',
  });
}
```

### Al costear ingrediente

```typescript
// Recalcular todas las recetas que usan este ingrediente
const affectedRecipes = await getRecipesUsingIngredient(ingredientId);
for (const recipe of affectedRecipes) {
  await recalculateRecipeCost(recipe.id);
}
```

### Al aprobar receta

```typescript
// Validar que esté 100% costeada
const recipe = await getRecipe(id);
const allIngredients = recipe.ingredients;
const costedIngredients = allIngredients.filter((i) => i.isCosted);

if (costedIngredients.length < allIngredients.length) {
  throw new Error('Receta incompleta. Costea todos los ingredientes primero.');
}

recipe.readyForPos = true;
recipe.product.isAvailable = true;
```

---

## 🔗 Relaciones Clave

```
Product (Producto en menú)
  ├─> Recipe (Cómo se prepara)
  │     ├─> RecipeIngredient (30ml espresso)
  │     │     └─> InventoryItem (Espresso - $0.85/ml)
  │     │           └─> InventoryMovement (Stock: 5000ml)
  │     │
  │     └─> costingStatus: COMPLETE
  │     └─> readyForPos: true ✅
  │
  └─> isAvailable: true (VISIBLE EN POS)
```

---

## 📱 Flujo en UI

### Pantalla 1: Crear Receta

```
┌─────────────────────────────────────┐
│ Nueva Receta: Cappuccino            │
├─────────────────────────────────────┤
│ Ingredientes:                       │
│ [+] Agregar ingrediente             │
│                                     │
│ • Espresso - 30ml       [eliminar]  │
│ • Leche - 150ml         [eliminar]  │
│ • Espuma - 50ml         [eliminar]  │
│                                     │
│ ⚠️ 3 ingredientes sin costear       │
│                                     │
│ [Guardar Receta]                    │
└─────────────────────────────────────┘
```

### Pantalla 2: Costeo

```
┌─────────────────────────────────────┐
│ Ingredientes Pendientes (3)         │
├─────────────────────────────────────┤
│ ⏳ Espresso                          │
│    Costo/unidad: [____] por ml      │
│    Proveedor: [Seleccionar ▼]       │
│    [Guardar Costo]                  │
│                                     │
│ ⏳ Leche                             │
│ ⏳ Espuma de leche                   │
└─────────────────────────────────────┘
```

### Pantalla 3: Activar en POS

```
┌─────────────────────────────────────┐
│ Receta: Cappuccino                  │
├─────────────────────────────────────┤
│ ✅ Costo total: $2.45               │
│ ✅ Todos los ingredientes costeados │
│                                     │
│ Estado: Listo para activar          │
│                                     │
│ [✓ Activar en POS]                  │
└─────────────────────────────────────┘
```

---

## 🚀 Implementación Backend

### Service: RecipeService

```typescript
class RecipeService {
  async createRecipeWithIngredients(data: CreateRecipeDto) {
    // 1. Crear o encontrar ingredientes
    const ingredients = await Promise.all(
      data.ingredients.map(async (ing) => {
        let inventoryItem = await this.findIngredientByName(ing.name);

        if (!inventoryItem) {
          // Auto-crear ingrediente pendiente
          inventoryItem = await this.inventoryService.create({
            code: this.generateCode(ing.name),
            name: ing.name,
            unitOfMeasure: ing.unit,
            costPerUnit: 0,
            costingStatus: CostingStatus.PENDING,
          });
        }

        return {
          inventoryItemId: inventoryItem.id,
          quantity: ing.quantity,
          unit: ing.unit,
          isCosted: inventoryItem.costPerUnit > 0,
        };
      }),
    );

    // 2. Crear receta
    const recipe = await this.prisma.recipe.create({
      data: {
        ...data,
        costingStatus: CostingStatus.PENDING,
        readyForPos: false,
        ingredients: {
          create: ingredients,
        },
      },
    });

    // 3. Calcular costo inicial
    await this.recalculateCost(recipe.id);

    return recipe;
  }

  async recalculateCost(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: { inventoryItem: true },
        },
      },
    });

    let totalCost = 0;
    let costedCount = 0;

    for (const ingredient of recipe.ingredients) {
      const item = ingredient.inventoryItem;

      if (item.costPerUnit > 0) {
        const ingredientCost = ingredient.quantity * item.costPerUnit;
        totalCost += ingredientCost;
        costedCount++;

        // Actualizar costo en la relación
        await this.prisma.recipeIngredient.update({
          where: { id: ingredient.id },
          data: {
            unitCost: item.costPerUnit,
            totalCost: ingredientCost,
            isCosted: true,
          },
        });
      }
    }

    // Determinar status
    const totalIngredients = recipe.ingredients.length;
    let costingStatus: CostingStatus;

    if (costedCount === 0) {
      costingStatus = CostingStatus.PENDING;
    } else if (costedCount < totalIngredients) {
      costingStatus = CostingStatus.PARTIAL;
    } else {
      costingStatus = CostingStatus.COMPLETE;
    }

    // Actualizar receta
    return this.prisma.recipe.update({
      where: { id: recipeId },
      data: {
        totalCost,
        costingStatus,
        lastCostedAt: new Date(),
      },
    });
  }

  async approveForPos(recipeId: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id: recipeId },
    });

    if (recipe.costingStatus !== CostingStatus.COMPLETE) {
      throw new BadRequestException(
        'No se puede activar. Completa el costeo de todos los ingredientes.',
      );
    }

    // Activar receta y producto
    return this.prisma.$transaction([
      this.prisma.recipe.update({
        where: { id: recipeId },
        data: { readyForPos: true },
      }),
      this.prisma.product.update({
        where: { id: recipe.productId },
        data: { isAvailable: true },
      }),
    ]);
  }
}
```

---

## ✅ Checklist de Implementación

- [x] Schema actualizado con CostingStatus
- [x] Migración aplicada
- [ ] RecipeService con auto-creación de ingredientes
- [ ] CostingService para gestionar ingredientes pendientes
- [ ] InventoryService con tracking de stock
- [ ] Frontend: Módulo de Recetas
- [ ] Frontend: Módulo de Costeo
- [ ] Frontend: Aprobación para POS
- [ ] Alertas de stock bajo
- [ ] Tests E2E del flujo completo
