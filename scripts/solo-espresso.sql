-- ==================================================================
-- SISTEMA MÍNIMO: SOLO ESPRESSO
-- ==================================================================
-- Limpia TODO y crea únicamente:
-- - 1 categoría: Café
-- - 1 producto: Espresso ($45, costo $9)
-- - 1 item inventario: Café espresso (18g x $0.50)
-- - 1 receta: Espresso Shot con 1 ingrediente
-- ==================================================================

-- 1. LIMPIAR TODO
DELETE FROM recipe_ingredients;
DELETE FROM recipes;
DELETE FROM inventory_movements;
DELETE FROM inventory_items;
DELETE FROM transaction_line_items;
DELETE FROM ticket_lines;
DELETE FROM tickets;
DELETE FROM transactions;
DELETE FROM product_modifiers;
DELETE FROM products;
DELETE FROM categories;

-- 2. CREAR CATEGORÍA
INSERT INTO categories (id, organization_id, name, description, active, created_at, updated_at)
VALUES (
  'cat_cafe_001',
  'cmhaz6zi60007f2z0m702c6un',  -- organization_id
  'Café',
  'Bebidas de café',
  true,
  NOW(),
  NOW()
);

-- 3. CREAR PRODUCTO: ESPRESSO
INSERT INTO products (
  id,
  organization_id,
  name, 
  sku, 
  category_id, 
  price, 
  cost,
  description, 
  active, 
  created_at, 
  updated_at
)
VALUES (
  'prod_espresso_001',
  'cmhaz6zi60007f2z0m702c6un',  -- organization_id
  'Espresso',
  'ESP-001',
  'cat_cafe_001',
  45.00,  -- Precio de venta
  9.00,   -- Costo: 18g x $0.50
  'Shot de espresso puro - 30ml',
  true,
  NOW(),
  NOW()
);

-- 4. CREAR ITEM DE INVENTARIO: CAFÉ EN GRANO
INSERT INTO inventory_items (
  id,
  code,
  name,
  description,
  unit_of_measure,
  cost_per_unit,
  par_level,
  category,
  active,
  created_at,
  updated_at
)
VALUES (
  'inv_cafe_001',
  'CAFE-GRANO',
  'Café en Grano',
  'Café en grano entero para moler',
  'g',           -- gramos
  0.50,          -- $0.50 por gramo
  10000,         -- Par level: 10kg
  'INGREDIENTS',
  true,
  NOW(),
  NOW()
);

-- 5. CREAR RECETA: ESPRESSO SHOT
INSERT INTO recipes (
  id,
  organization_id,
  product_id,
  name,
  description,
  instructions,
  yield,
  yield_unit,
  prep_time,
  version,
  active,
  created_at,
  updated_at
)
VALUES (
  'recipe_espresso_001',
  'cmhaz6zi60007f2z0m702c6un',  -- organization_id
  'prod_espresso_001',
  'Espresso Shot',
  'Preparación de shot de espresso perfecto',
  E'1. Moler 18g de café espresso\n2. Distribuir y tampar uniformemente\n3. Extraer durante 25-30 segundos\n4. Obtener 30ml de espresso\n5. Servir inmediatamente',
  30,            -- Rinde 30ml
  'ml',
  60,            -- 60 segundos de preparación
  1,
  true,
  NOW(),
  NOW()
);

-- 6. INGREDIENTE DE LA RECETA
INSERT INTO recipe_ingredients (
  id,
  recipe_id,
  inventory_item_id,
  quantity,
  unit,
  notes
)
VALUES (
  'ri_espresso_001',
  'recipe_espresso_001',
  'inv_cafe_001',
  18.0,          -- 18 gramos
  'g',
  'Molienda fina para espresso'
);

-- 7. STOCK INICIAL
INSERT INTO inventory_movements (
  id,
  location_id,
  inventory_item_id,
  type,
  quantity,
  unit_cost,
  reason,
  notes,
  created_at
)
VALUES (
  'im_inicial_001',
  (SELECT id FROM locations LIMIT 1),
  'inv_cafe_001',
  'IN',
  10000,         -- 10kg = 10,000 gramos
  0.50,
  'PURCHASE',
  'Stock inicial de café en grano - suficiente para 555 espressos',
  NOW()
);

-- ==================================================================
-- VERIFICACIÓN
-- ==================================================================
SELECT '=== SISTEMA LISTO ===' as status;

SELECT 
  'Categoría' as tipo,
  name as nombre,
  description as detalle
FROM categories 
WHERE id = 'cat_cafe_001';

SELECT 
  'Producto' as tipo,
  name as nombre,
  sku,
  price as precio,
  cost as costo,
  ROUND((price - cost) / price * 100, 2) as margen_pct
FROM products 
WHERE id = 'prod_espresso_001';

SELECT 
  'Inventario' as tipo,
  name as nombre,
  unit_of_measure as unidad,
  cost_per_unit as costo_unitario
FROM inventory_items 
WHERE id = 'inv_cafe_001';

SELECT 
  'Receta' as tipo,
  name as nombre,
  yield || ' ' || yield_unit as rendimiento,
  prep_time || ' seg' as tiempo_prep
FROM recipes 
WHERE id = 'recipe_espresso_001';

SELECT 
  'Ingredientes' as tipo,
  COUNT(*) as cantidad_ingredientes,
  SUM(ri.quantity * ii.cost_per_unit) as costo_total_receta
FROM recipe_ingredients ri
JOIN inventory_items ii ON ri.inventory_item_id = ii.id
WHERE ri.recipe_id = 'recipe_espresso_001';

SELECT 
  'Stock Disponible' as tipo,
  SUM(im.quantity) as gramos_cafe,
  FLOOR(SUM(im.quantity) / 18.0) as espressos_posibles
FROM inventory_movements im
WHERE im.inventory_item_id = 'inv_cafe_001';

SELECT '=== SISTEMA LISTO PARA USAR ===' as status;
