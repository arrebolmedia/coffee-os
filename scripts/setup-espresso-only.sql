-- ============================================
-- SISTEMA DE PRUEBA: SOLO ESPRESSO
-- ============================================
-- Limpia TODO y crea únicamente el producto Espresso
-- con su receta, inventario y costeo completo
-- ============================================

-- 1. LIMPIAR TODO
-- ============================================
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
-- ============================================
INSERT INTO categories (id, name, description, active, created_at, updated_at)
VALUES (
  'cat_espresso_001',
  'Café',
  'Bebidas de café espresso',
  true,
  NOW(),
  NOW()
);

-- 3. CREAR PRODUCTO: ESPRESSO
-- ============================================
INSERT INTO products (
  id, 
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
  'Espresso',
  'ESP-001',
  'cat_espresso_001',
  45.00,  -- Precio de venta
  9.00,   -- Costo directo (18g x $0.50)
  'Shot de espresso puro - 30ml',
  true,
  NOW(),
  NOW()
);

-- 4. CREAR ITEM DE INVENTARIO: CAFÉ ESPRESSO
-- ============================================
INSERT INTO inventory_items (
  id,
  name,
  code,
  category,
  unit,
  unit_cost,
  quantity,
  minimum_quantity,
  active,
  created_at,
  updated_at
)
VALUES (
  'inv_cafe_espresso_001',
  'Café Espresso (granos)',
  'INV-CAFE-ESP',
  'INGREDIENTS',
  'g',           -- gramos
  0.50,          -- $0.50 por gramo
  10000,         -- 10kg en stock
  1000,          -- Mínimo 1kg
  true,
  NOW(),
  NOW()
);

-- 5. CREAR RECETA: ESPRESSO
-- ============================================
INSERT INTO recipes (
  id,
  product_id,
  name,
  version,
  yield_amount,
  yield_unit,
  preparation_minutes,
  instructions,
  notes,
  active,
  created_at,
  updated_at
)
VALUES (
  'recipe_espresso_001',
  'prod_espresso_001',
  'Espresso Shot',
  1,
  30,            -- Rinde 30ml
  'ml',
  1,             -- 1 minuto de preparación
  '1. Moler 18g de café espresso\n2. Tampar en el portafiltro\n3. Extraer por 25-30 segundos\n4. Servir inmediatamente',
  'Temperatura del agua: 93°C. Presión: 9 bares',
  true,
  NOW(),
  NOW()
);

-- 6. INGREDIENTES DE LA RECETA
-- ============================================
INSERT INTO recipe_ingredients (
  id,
  recipe_id,
  inventory_item_id,
  quantity,
  unit,
  notes
)
VALUES (
  'ri_espresso_cafe_001',
  'recipe_espresso_001',
  'inv_cafe_espresso_001',
  18.0,          -- 18 gramos de café
  'g',
  'Café espresso molido fino'
);

-- 7. MOVIMIENTO DE INVENTARIO INICIAL
-- ============================================
INSERT INTO inventory_movements (
  id,
  inventory_item_id,
  location_id,
  type,
  quantity,
  unit_cost,
  total_cost,
  reference_type,
  notes,
  user_id,
  performed_at,
  created_at,
  updated_at
)
VALUES (
  'im_initial_cafe_001',
  'inv_cafe_espresso_001',
  (SELECT id FROM locations LIMIT 1),  -- Primera ubicación
  'IN',
  10000,         -- 10kg inicial
  0.50,          -- Costo por gramo
  5000.00,       -- Total: 10000g x $0.50
  'PURCHASE',
  'Stock inicial de café espresso',
  (SELECT id FROM users LIMIT 1),  -- Primer usuario
  NOW(),
  NOW(),
  NOW()
);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  '=== RESUMEN DEL SISTEMA ===' as info;

SELECT 
  'Categorías creadas' as tipo, 
  COUNT(*) as cantidad 
FROM categories;

SELECT 
  'Productos creados' as tipo, 
  COUNT(*) as cantidad 
FROM products;

SELECT 
  'Items de inventario' as tipo, 
  COUNT(*) as cantidad 
FROM inventory_items;

SELECT 
  'Recetas creadas' as tipo, 
  COUNT(*) as cantidad 
FROM recipes;

SELECT 
  'Ingredientes en recetas' as tipo, 
  COUNT(*) as cantidad 
FROM recipe_ingredients;

-- Detalle del producto
SELECT 
  '=== PRODUCTO: ESPRESSO ===' as info;

SELECT 
  p.name as producto,
  p.price as precio_venta,
  p.cost as costo_base,
  (p.price - p.cost) as ganancia_bruta,
  ROUND(((p.price - p.cost) / p.price * 100)::numeric, 2) as margen_porcentaje
FROM products p
WHERE p.id = 'prod_espresso_001';

-- Detalle de la receta
SELECT 
  '=== RECETA ===' as info;

SELECT 
  r.name as receta,
  ri.quantity || ' ' || ri.unit as cantidad,
  ii.name as ingrediente,
  (ri.quantity * ii.unit_cost) as costo_ingrediente,
  ii.quantity as stock_disponible
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_items ii ON ri.inventory_item_id = ii.id
WHERE r.id = 'recipe_espresso_001';

-- Costo real de la receta
SELECT 
  '=== COSTEO ===' as info;

SELECT 
  r.name as receta,
  SUM(ri.quantity * ii.unit_cost) as costo_total_receta,
  ROUND(SUM(ri.quantity * ii.unit_cost)::numeric, 2) as costo_redondeado
FROM recipes r
JOIN recipe_ingredients ri ON r.id = ri.recipe_id
JOIN inventory_items ii ON ri.inventory_item_id = ii.id
WHERE r.id = 'recipe_espresso_001'
GROUP BY r.name;

SELECT 
  '=== INVENTARIO DISPONIBLE ===' as info;

SELECT 
  ii.name as item,
  ii.quantity || ' ' || ii.unit as stock_actual,
  ii.unit_cost as costo_por_unidad,
  (ii.quantity * ii.unit_cost) as valor_total_stock
FROM inventory_items ii
WHERE ii.id = 'inv_cafe_espresso_001';

-- Cuántos espressos se pueden hacer con el inventario actual
SELECT 
  '=== CAPACIDAD DE PRODUCCIÓN ===' as info;

SELECT 
  FLOOR(ii.quantity / 18.0) as espressos_disponibles,
  '10000g stock / 18g por espresso' as calculo
FROM inventory_items ii
WHERE ii.id = 'inv_cafe_espresso_001';
