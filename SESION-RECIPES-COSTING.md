# 📝 Sesión: Módulo Recipes & Costing

**Fecha**: 20 de octubre de 2025  
**Duración**: ~1.5 horas  
**Módulo**: Recipes & Costing  
**Commit**: [43b5e30](https://github.com/arrebolmedia/coffee-os/commit/43b5e30)  
**Tests**: 28/28 ✅ (100% passing)  
**Endpoints**: 9 REST

---

## 🎯 Objetivo

Implementar un sistema completo de gestión de recetas con:
- Costeo automático de productos
- Escalado de porciones
- Análisis de rentabilidad
- Parámetros específicos de café
- Información nutricional y alérgenos

---

## 📦 Archivos Creados/Modificados

### DTOs (5 archivos)

1. **create-recipe.dto.ts** (260+ líneas)
   - 4 enums: `RecipeCategory`, `PreparationMethod`, `DifficultyLevel`, `AllergenType`
   - 4 nested DTOs: `RecipeIngredientDto`, `RecipeStepDto`, `PreparationParametersDto`, `NutritionalInfoDto`
   - 16 campos principales con validación completa

2. **update-recipe.dto.ts**
   - `PartialType(CreateRecipeDto)`

3. **query-recipes.dto.ts** (actualizado)
   - Filtros: organization_id, category, preparation_method, difficulty, is_active, max_cost, min_margin
   - Ordenamiento: sort_by (name/cost/margin/created_at), order (asc/desc)

4. **scale-recipe.dto.ts**
   - Campo: target_servings (min 1)

5. **index.ts**
   - Barrel exports para todos los DTOs

### Interfaces (2 archivos)

1. **recipe.interface.ts** (150+ líneas)
   - 9 interfaces:
     * `Recipe`: Interfaz principal con 25+ campos
     * `RecipeIngredient`: Ingredientes con costos
     * `RecipeStep`: Pasos de preparación
     * `RecipeCostBreakdown`: Desglose detallado de costos
     * `IngredientCostDetail`: Costo por ingrediente
     * `ScaledRecipe`: Receta escalada
     * `RecipeStats`: Estadísticas agregadas
     * `RecipeProfitability`: Análisis de rentabilidad

2. **index.ts**
   - Barrel exports

### Service (recipes.service.ts - 390 líneas)

**Métodos implementados:**

- `create(createRecipeDto)`: Crear receta con cálculo automático de costos
- `findAll(query?)`: Listar con filtros (8 filtros disponibles)
- `findById(id)`: Obtener receta por ID
- `update(id, updateRecipeDto)`: Actualizar con recálculo de costos
- `delete(id)`: Eliminar receta
- `calculateCost(id, recipe?)`: Costeo detallado
- `scaleRecipe(id, scaleDto)`: Escalar recetas
- `getStats(organization_id)`: Estadísticas agregadas
- `analyzeProfitability(organization_id)`: Análisis de rentabilidad

### Controller (recipes.controller.ts - 115 líneas)

**Endpoints REST (9 total):**

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/recipes` | Crear receta |
| GET | `/recipes` | Listar con filtros |
| GET | `/recipes/:id` | Obtener por ID |
| GET | `/recipes/:id/cost` | Desglose de costos |
| POST | `/recipes/:id/scale` | Escalar receta |
| PATCH | `/recipes/:id` | Actualizar |
| DELETE | `/recipes/:id` | Eliminar |
| GET | `/recipes/organization/:id/stats` | Estadísticas |
| GET | `/recipes/organization/:id/profitability` | Rentabilidad |

### Tests (recipes.service.spec.ts - 28 tests)

**Coverage por método:**

| Método | Tests | Descripción |
|--------|-------|-------------|
| create | 3 | Completo, cálculo automático, mínimo |
| findAll | 8 | Todos, filtros, búsqueda, ordenamiento |
| findById | 2 | Existente, no encontrado |
| calculateCost | 2 | Desglose, porcentajes |
| scaleRecipe | 3 | Escalar arriba, abajo, recálculo |
| update | 3 | Campos básicos, ingredientes, no encontrado |
| delete | 2 | Eliminar, no encontrado |
| getStats | 1 | Estadísticas completas |
| analyzeProfitability | 2 | Ordenamiento, métricas |

---

## ⚙️ Características Implementadas

### 1. Categorías de Recetas (8)

```typescript
enum RecipeCategory {
  ESPRESSO = 'espresso',
  FILTRADO = 'filtrado',
  COLD_BREW = 'cold_brew',
  LECHE = 'leche',
  BEBIDAS_FRIAS = 'bebidas_frias',
  POSTRES = 'postres',
  ALIMENTOS = 'alimentos',
  OTROS = 'otros',
}
```

### 2. Métodos de Preparación (9)

```typescript
enum PreparationMethod {
  ESPRESSO_MACHINE = 'espresso_machine',
  V60 = 'v60',
  CHEMEX = 'chemex',
  AEROPRESS = 'aeropress',
  FRENCH_PRESS = 'french_press',
  COLD_BREW_MAKER = 'cold_brew_maker',
  BLENDER = 'blender',
  STEAMER = 'steamer',
  MANUAL = 'manual',
}
```

### 3. Parámetros de Preparación (13 campos)

**Para Espresso:**
- `dose_grams` (0-100g)
- `extraction_time_seconds` (0-120s)
- `pressure_bars` (0-15 bars)
- `grind_size`

**Para Filtrado (V60, Chemex):**
- `water_temperature_celsius`
- `bloom_time_seconds`
- `total_brew_time_seconds`
- `pour_pattern`

**Para Cold Brew:**
- `steep_time_hours`
- `coffee_to_water_ratio` (1-20)

**General:**
- `water_quality_notes`

### 4. Costeo Automático

**Fórmula:**

```
Total Ingredientes = Σ (cantidad × costo_por_unidad)
Labor = Total Ingredientes × 0.20 (20%)
Overhead = Total Ingredientes × 0.10 (10%)
Total Cost = Total Ingredientes + Labor + Overhead
Cost Per Serving = Total Cost / servings
Suggested Price = Total Cost / (1 - target_margin_percentage / 100)
```

**Ejemplo (Espresso Doble):**
```
Ingredientes: 18g × $0.50/g = $9.00
Labor: $9.00 × 20% = $1.80
Overhead: $9.00 × 10% = $0.90
Total: $11.70
Margen objetivo: 70%
Precio sugerido: $11.70 / (1 - 0.70) = $39.00 MXN
```

### 5. Escalado de Recetas

**Algoritmo:**

```typescript
scaling_factor = target_servings / original_servings
scaled_quantity = original_quantity × scaling_factor
```

**Ejemplo:**
- Original: 1 porción, 18g café
- Escalado: 4 porciones
- Factor: 4 / 1 = 4
- Nuevo: 18g × 4 = 72g café

### 6. Análisis de Rentabilidad

**Profitability Score:**

```typescript
profitability_score = (margin_percentage × 0.7) + ((1 / cost) × 1000 × 0.3)
```

- Recetas con mayor margen y menor costo son más rentables
- Peso 70% margen, 30% eficiencia de costo
- Se ordenan de mayor a menor score

### 7. Información Nutricional (7 nutrientes)

```typescript
interface NutritionalInfoDto {
  calories?: number;
  protein_grams?: number;
  carbs_grams?: number;
  fat_grams?: number;
  sugar_grams?: number;
  caffeine_mg?: number;
  sodium_mg?: number;
}
```

### 8. Tracking de Alérgenos (8 tipos)

```typescript
enum AllergenType {
  LECHE = 'leche',
  GLUTEN = 'gluten',
  HUEVO = 'huevo',
  SOYA = 'soya',
  FRUTOS_SECOS = 'frutos_secos',
  MARISCOS = 'mariscos',
  PESCADO = 'pescado',
  SULFITOS = 'sulfitos',
}
```

---

## 📊 Ejemplos de Uso

### Crear Receta de Espresso

```typescript
POST /recipes
{
  "organization_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Espresso Doble",
  "description": "Espresso clásico de alta calidad",
  "category": "espresso",
  "preparation_method": "espresso_machine",
  "difficulty": "intermedio",
  "servings": 1,
  "serving_size_ml": 60,
  "estimated_time_minutes": 3,
  "target_margin_percentage": 70,
  "ingredients": [
    {
      "inventory_item_id": "item-001",
      "quantity": 18,
      "unit": "g",
      "cost_per_unit": 0.5
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "instruction": "Moler 18g de café arábica a textura fina",
      "duration_seconds": 15,
      "is_critical": true
    },
    {
      "step_number": 2,
      "instruction": "Extraer espresso a 9 bares por 25-30 segundos",
      "duration_seconds": 30,
      "is_critical": true
    }
  ],
  "preparation_parameters": {
    "dose_grams": 18,
    "extraction_time_seconds": 27,
    "pressure_bars": 9
  },
  "nutritional_info": {
    "calories": 5,
    "caffeine_mg": 120
  },
  "allergens": [],
  "is_active": true
}
```

**Respuesta:**
```json
{
  "id": "uuid-generated",
  "name": "Espresso Doble",
  "total_cost": 11.7,
  "cost_per_serving": 11.7,
  "suggested_price": 39,
  "actual_margin_percentage": 70,
  "created_at": "2025-10-20T22:43:57.895Z",
  "updated_at": "2025-10-20T22:43:57.895Z"
}
```

### Obtener Desglose de Costos

```typescript
GET /recipes/{id}/cost
```

**Respuesta:**
```json
{
  "recipe_id": "uuid",
  "recipe_name": "Espresso Doble",
  "servings": 1,
  "ingredients_cost": [
    {
      "inventory_item_id": "item-001",
      "inventory_item_name": "Café Arábica",
      "quantity": 18,
      "unit": "g",
      "cost_per_unit": 0.5,
      "total_cost": 9,
      "percentage_of_total": 100
    }
  ],
  "total_ingredients_cost": 9,
  "labor_cost": 1.8,
  "overhead_cost": 0.9,
  "total_cost": 11.7,
  "cost_per_serving": 11.7,
  "target_margin_percentage": 70,
  "suggested_price": 39,
  "suggested_price_per_serving": 39
}
```

### Escalar Receta

```typescript
POST /recipes/{id}/scale
{
  "target_servings": 4
}
```

**Respuesta:**
```json
{
  "id": "uuid",
  "name": "Espresso Doble",
  "original_servings": 1,
  "scaled_servings": 4,
  "scaling_factor": 4,
  "scaled_ingredients": [
    {
      "inventory_item_id": "item-001",
      "quantity": 72,  // 18 × 4
      "unit": "g"
    }
  ],
  "total_cost": 46.8,  // 11.7 × 4
  "cost_per_serving": 11.7,  // Se mantiene igual
  "suggested_price": 156  // 39 × 4
}
```

### Obtener Estadísticas

```typescript
GET /recipes/organization/{id}/stats
```

**Respuesta:**
```json
{
  "total_recipes": 15,
  "by_category": {
    "espresso": 5,
    "filtrado": 3,
    "cold_brew": 2,
    "leche": 3,
    "bebidas_frias": 2
  },
  "by_difficulty": {
    "facil": 4,
    "intermedio": 7,
    "avanzado": 3,
    "experto": 1
  },
  "by_preparation_method": {
    "espresso_machine": 5,
    "v60": 2,
    "chemex": 1,
    "french_press": 2
  },
  "average_cost": 18.5,
  "average_margin": 65.3,
  "total_value": 277.5
}
```

### Análisis de Rentabilidad

```typescript
GET /recipes/organization/{id}/profitability
```

**Respuesta:**
```json
[
  {
    "recipe_id": "uuid-1",
    "recipe_name": "Café Filtrado",
    "cost": 3.9,
    "suggested_price": 19.5,
    "margin_percentage": 80,
    "profitability_score": 133.08  // Alto margen + bajo costo
  },
  {
    "recipe_id": "uuid-2",
    "recipe_name": "Espresso Doble",
    "cost": 11.7,
    "suggested_price": 39,
    "margin_percentage": 70,
    "profitability_score": 74.56
  },
  {
    "recipe_id": "uuid-3",
    "recipe_name": "Bebida Especial",
    "cost": 260,
    "suggested_price": 520,
    "margin_percentage": 50,
    "profitability_score": 36.15  // Bajo margen + alto costo
  }
]
```

---

## 🧪 Tests Ejecutados

```bash
npm test -- tests/recipes.service.spec

PASS  src/modules/recipes/tests/recipes.service.spec.ts
  RecipesService
    ✓ should be defined (10 ms)
    create
      ✓ should create a recipe with all fields (2 ms)
      ✓ should calculate costs automatically on creation (1 ms)
      ✓ should create recipe with minimal fields (1 ms)
    findAll
      ✓ should return all recipes (1 ms)
      ✓ should filter by organization_id (1 ms)
      ✓ should filter by category (1 ms)
      ✓ should filter by preparation method (1 ms)
      ✓ should filter by difficulty (1 ms)
      ✓ should filter by is_active (1 ms)
      ✓ should search by name (1 ms)
      ✓ should sort by name ascending (1 ms)
      ✓ should sort by cost descending (1 ms)
    findById
      ✓ should return a recipe by id (1 ms)
      ✓ should throw NotFoundException for non-existent recipe (11 ms)
    calculateCost
      ✓ should calculate detailed cost breakdown (1 ms)
      ✓ should include ingredient cost details with percentages (1 ms)
    scaleRecipe
      ✓ should scale recipe up (2x) (1 ms)
      ✓ should scale recipe down (0.5x) (1 ms)
      ✓ should recalculate costs for scaled recipe
    update
      ✓ should update recipe basic fields
      ✓ should recalculate costs when updating ingredients
      ✓ should throw NotFoundException for non-existent recipe (1 ms)
    delete
      ✓ should delete a recipe
      ✓ should throw NotFoundException for non-existent recipe (1 ms)
    getStats
      ✓ should return recipe statistics (1 ms)
    analyzeProfitability
      ✓ should return profitability analysis sorted by score (1 ms)
      ✓ should include all profitability metrics (1 ms)

Test Suites: 1 passed, 1 total
Tests:       28 passed, 28 total
Time:        3.192 s
```

---

## 🚀 Impacto en CoffeeOS

### Control de Costos
- **Automático**: Cada producto calcula su COGS en tiempo real
- **Transparente**: Desglose completo por ingrediente con porcentajes
- **Predictivo**: Precio sugerido basado en margen objetivo

### Escalabilidad Operativa
- **Catering**: Escalar recetas para eventos (10x, 20x, 50x)
- **Batch Production**: Preparar grandes cantidades con proporciones exactas
- **Consistency**: Mismas proporciones sin importar el volumen

### Gestión de Menú
- **Profitability**: Identificar recetas estrella vs perros
- **Pricing Strategy**: Optimizar precios basados en costos reales
- **Menu Engineering**: Decidir qué promover/eliminar basado en datos

### Capacitación
- **Progresión**: 4 niveles de dificultad (fácil → experto)
- **Precisión**: Parámetros exactos de café (dosis, presión, temperatura)
- **Quality**: Pasos críticos marcados para consistencia

### Compliance
- **Alérgenos**: Tracking de 8 tipos para seguridad del cliente
- **Nutricional**: 7 nutrientes para transparencia
- **Trazabilidad**: Cada ingrediente vinculado a inventario

---

## 📈 Métricas del Módulo

| Métrica | Valor |
|---------|-------|
| Archivos creados/modificados | 10 |
| Líneas de código | 1,323 |
| Tests | 28 (100% passing) |
| Endpoints REST | 9 |
| Enums | 4 |
| Interfaces | 9 |
| DTOs | 5 |
| Métodos del service | 9 |
| Tiempo de ejecución tests | 3.192s |

---

## 🔄 Próximos Pasos

1. **Inventory Integration**
   - Vincular recipes con inventory items reales
   - Deducción automática de stock al vender productos
   - Alertas de bajo stock basadas en recetas

2. **Production Scheduling**
   - Batch preparation planning
   - Par levels calculation
   - Prep list generation

3. **Menu Engineering**
   - Análisis BCG Matrix (Stars, Cash Cows, Question Marks, Dogs)
   - Recomendaciones de pricing
   - Menu mix optimization

4. **Quality Control**
   - Foto upload de cada paso
   - Timer integration para pasos críticos
   - Barista checklist digital

5. **Advanced Analytics**
   - Ingredient waste tracking
   - Recipe performance over time
   - Seasonal recipe suggestions

---

## ✅ Checklist de Verificación

- [x] DTOs con validación completa
- [x] Interfaces TypeScript exhaustivas
- [x] Service con 9 métodos funcionales
- [x] Controller con 9 endpoints REST
- [x] Tests 100% passing (28/28)
- [x] Costeo automático implementado
- [x] Escalado de recetas funcional
- [x] Análisis de rentabilidad
- [x] Estadísticas agregadas
- [x] Parámetros específicos de café
- [x] Información nutricional
- [x] Tracking de alérgenos
- [x] Commit y push a GitHub
- [x] README actualizado (37% progreso)
- [x] TODO list actualizado

---

## 🎓 Lecciones Aprendidas

1. **Mock Development**: Almacenamiento en Map permite desarrollo rápido sin base de datos
2. **Type Safety**: Interfaces exhaustivas previenen errores en tiempo de compilación
3. **Business Logic**: Cálculos de costeo en el service, no en el controller
4. **Flexibility**: DTOs opcionales permiten crear recetas mínimas o completas
5. **Testing First**: Tests completos desde el inicio garantizan calidad
6. **Real-World Parameters**: Parámetros de café basados en estándares de barismo (SCA)

---

**Desarrollado por**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Versión**: 0.1.0-alpha  
**Licencia**: MIT
