-- ============================================================================
-- CoffeeOS - Setup Test Data Script
-- Limpia DB y crea productos realistas de cafetería con recetas y ventas
-- Fecha: Octubre 2025
-- ============================================================================

-- ============================================================================
-- PASO 1: LIMPIAR DATOS EXISTENTES
-- ============================================================================

-- Eliminar transacciones y líneas de transacción
DELETE FROM transaction_line_items;
DELETE FROM transactions;

-- Eliminar tickets y líneas de ticket
DELETE FROM ticket_line_modifiers;
DELETE FROM ticket_lines;
DELETE FROM payments;
DELETE FROM tickets;

-- Eliminar recetas e ingredientes
DELETE FROM recipe_ingredients;
DELETE FROM recipes;

-- Eliminar productos y modificadores
DELETE FROM product_modifiers;
DELETE FROM products;

-- Eliminar movimientos de inventario
DELETE FROM inventory_movements;
DELETE FROM goods_receipts;
DELETE FROM inventory_items;

-- Limpiar categorías (dejar solo las que necesitamos)
DELETE FROM categories;

PRINT 'Base de datos limpiada exitosamente';

-- ============================================================================
-- PASO 2: CREAR CATEGORÍAS
-- ============================================================================

INSERT INTO categories (id, name, description, color, icon, sort_order, active, created_at, updated_at)
VALUES
  ('cat_calientes_001', 'Calientes', 'Bebidas calientes de café', '#FF6B35', 'coffee', 1, true, NOW(), NOW()),
  ('cat_frios_002', 'Fríos', 'Bebidas frías de café', '#4ECDC4', 'ice-cream', 2, true, NOW(), NOW()),
  ('cat_sincafe_003', 'Sin Café', 'Bebidas sin cafeína', '#95E1D3', 'leaf', 3, true, NOW(), NOW());

PRINT 'Categorías creadas: Calientes, Fríos, Sin Café';

-- ============================================================================
-- PASO 3: CREAR PRODUCTOS CON PRECIOS REALISTAS MX
-- ============================================================================

-- Categoría: CALIENTES
INSERT INTO products (id, category_id, sku, name, description, price, cost, type, status, track_inventory, allow_modifiers, is_available, active, created_at, updated_at)
VALUES
  -- Espresso $45
  ('prod_espresso_001', 'cat_calientes_001', 'HOT-ESP-001', 'Espresso', 'Shot doble de espresso italiano', 45.00, 8.50, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Americano $50
  ('prod_americano_002', 'cat_calientes_001', 'HOT-AME-002', 'Americano', 'Espresso con agua caliente', 50.00, 10.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- V60 $65
  ('prod_v60_003', 'cat_calientes_001', 'HOT-V60-003', 'V60', 'Café de filtro método V60', 65.00, 15.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Chemex $70
  ('prod_chemex_004', 'cat_calientes_001', 'HOT-CHE-004', 'Chemex', 'Café de filtro método Chemex', 70.00, 16.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Cappuccino $60
  ('prod_cappuccino_005', 'cat_calientes_001', 'HOT-CAP-005', 'Cappuccino', 'Espresso con leche vaporizada y espuma', 60.00, 12.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Latte $65
  ('prod_latte_006', 'cat_calientes_001', 'HOT-LAT-006', 'Latte', 'Espresso con leche vaporizada', 65.00, 13.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Flat White $70
  ('prod_flatwhite_007', 'cat_calientes_001', 'HOT-FLT-007', 'Flat White', 'Espresso con microespuma de leche', 70.00, 14.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Mocha $75
  ('prod_mocha_008', 'cat_calientes_001', 'HOT-MOC-008', 'Mocha', 'Espresso con chocolate y leche', 75.00, 18.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW());

-- Categoría: FRÍOS
INSERT INTO products (id, category_id, sku, name, description, price, cost, type, status, track_inventory, allow_modifiers, is_available, active, created_at, updated_at)
VALUES
  -- Cold Brew $70
  ('prod_coldbrew_009', 'cat_frios_002', 'COLD-CBR-009', 'Cold Brew', 'Café extraído en frío 18 horas', 70.00, 16.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Iced Coffee $55
  ('prod_icedcoffee_010', 'cat_frios_002', 'COLD-ICF-010', 'Iced Coffee', 'Café americano con hielo', 55.00, 12.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Iced Latte $70
  ('prod_icedlatte_011', 'cat_frios_002', 'COLD-ILT-011', 'Iced Latte', 'Espresso con leche fría y hielo', 70.00, 15.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW());

-- Categoría: SIN CAFÉ
INSERT INTO products (id, category_id, sku, name, description, price, cost, type, status, track_inventory, allow_modifiers, is_available, active, created_at, updated_at)
VALUES
  -- Matcha Latte $75
  ('prod_matcha_012', 'cat_sincafe_003', 'NOCA-MAT-012', 'Matcha Latte', 'Té verde matcha con leche', 75.00, 20.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Chai Latte $70
  ('prod_chai_013', 'cat_sincafe_003', 'NOCA-CHA-013', 'Chai Latte', 'Té chai especiado con leche', 70.00, 16.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Golden Latte $75
  ('prod_golden_014', 'cat_sincafe_003', 'NOCA-GOL-014', 'Golden Latte', 'Cúrcuma con leche dorada', 75.00, 18.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW()),
  
  -- Chocolate $65
  ('prod_chocolate_015', 'cat_sincafe_003', 'NOCA-CHO-015', 'Chocolate', 'Chocolate caliente premium', 65.00, 15.00, 'SIMPLE', 'ACTIVE', false, true, true, true, NOW(), NOW());

PRINT '15 productos creados exitosamente';

-- ============================================================================
-- PASO 4: CREAR ITEMS DE INVENTARIO (INGREDIENTES)
-- ============================================================================

INSERT INTO inventory_items (id, code, name, description, unit_of_measure, cost_per_unit, par_level, reorder_point, category, active, created_at, updated_at)
VALUES
  -- Café
  ('inv_espresso_001', 'INV-ESP-001', 'Café Espresso', 'Granos de café para espresso', 'g', 0.80, 5000, 1000, 'Café', true, NOW(), NOW()),
  ('inv_filtro_002', 'INV-FIL-002', 'Café de Filtro', 'Granos para métodos de filtro', 'g', 0.75, 3000, 500, 'Café', true, NOW(), NOW()),
  ('inv_coldbrew_003', 'INV-CBD-003', 'Café Cold Brew', 'Café pre-preparado cold brew', 'ml', 0.50, 10000, 2000, 'Café', true, NOW(), NOW()),
  
  -- Lácteos
  ('inv_leche_004', 'INV-LEC-004', 'Leche Entera', 'Leche entera para bebidas', 'ml', 0.15, 20000, 5000, 'Lácteos', true, NOW(), NOW()),
  
  -- Otros
  ('inv_agua_005', 'INV-AGU-005', 'Agua Filtrada', 'Agua purificada', 'ml', 0.05, 50000, 10000, 'Agua', true, NOW(), NOW()),
  ('inv_hielo_006', 'INV-HIE-006', 'Hielo', 'Cubos de hielo', 'g', 0.03, 10000, 2000, 'Hielo', true, NOW(), NOW()),
  ('inv_chocolate_007', 'INV-CHO-007', 'Chocolate en Polvo', 'Chocolate premium', 'g', 1.20, 2000, 400, 'Chocolate', true, NOW(), NOW()),
  ('inv_matcha_008', 'INV-MAT-008', 'Té Matcha', 'Matcha ceremonial', 'g', 3.50, 500, 100, 'Té', true, NOW(), NOW()),
  ('inv_chai_009', 'INV-CHA-009', 'Chai Concentrado', 'Concentrado de chai especiado', 'ml', 0.80, 3000, 500, 'Té', true, NOW(), NOW()),
  ('inv_curcuma_010', 'INV-CUR-010', 'Cúrcuma en Polvo', 'Cúrcuma orgánica', 'g', 2.00, 500, 100, 'Especias', true, NOW(), NOW()),
  ('inv_miel_011', 'INV-MIE-011', 'Miel de Abeja', 'Miel natural', 'ml', 0.60, 2000, 400, 'Endulzantes', true, NOW(), NOW());

PRINT 'Items de inventario creados';

-- ============================================================================
-- PASO 5: CREAR RECETAS PARA CADA PRODUCTO
-- ============================================================================

-- Espresso (18g café)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_espresso_001', 'prod_espresso_001', 'Receta Espresso', 'Shot doble de espresso', 1, 'porción', 30, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_esp_001', 'rec_espresso_001', 'inv_espresso_001', 18, 'g', 'Molienda fina');

-- Americano (18g café + 180ml agua)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_americano_002', 'prod_americano_002', 'Receta Americano', 'Espresso con agua caliente', 1, 'porción', 45, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_ame_001', 'rec_americano_002', 'inv_espresso_001', 18, 'g', 'Para espresso'),
  ('ring_ame_002', 'rec_americano_002', 'inv_agua_005', 180, 'ml', 'Agua caliente');

-- V60 (20g café + 300ml agua)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_v60_003', 'prod_v60_003', 'Receta V60', 'Método de filtro V60', 1, 'porción', 180, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_v60_001', 'rec_v60_003', 'inv_filtro_002', 20, 'g', 'Molienda media'),
  ('ring_v60_002', 'rec_v60_003', 'inv_agua_005', 300, 'ml', 'Agua 93°C');

-- Chemex (22g café + 350ml agua)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_chemex_004', 'prod_chemex_004', 'Receta Chemex', 'Método de filtro Chemex', 1, 'porción', 240, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_che_001', 'rec_chemex_004', 'inv_filtro_002', 22, 'g', 'Molienda media-gruesa'),
  ('ring_che_002', 'rec_chemex_004', 'inv_agua_005', 350, 'ml', 'Agua 93°C');

-- Cappuccino (18g café + 150ml leche)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_cappuccino_005', 'prod_cappuccino_005', 'Receta Cappuccino', 'Espresso con leche y espuma', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_cap_001', 'rec_cappuccino_005', 'inv_espresso_001', 18, 'g', 'Espresso doble'),
  ('ring_cap_002', 'rec_cappuccino_005', 'inv_leche_004', 150, 'ml', 'Vaporizada con espuma');

-- Latte (18g café + 220ml leche)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_latte_006', 'prod_latte_006', 'Receta Latte', 'Espresso con leche vaporizada', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_lat_001', 'rec_latte_006', 'inv_espresso_001', 18, 'g', 'Espresso doble'),
  ('ring_lat_002', 'rec_latte_006', 'inv_leche_004', 220, 'ml', 'Vaporizada');

-- Flat White (18g café + 180ml leche)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_flatwhite_007', 'prod_flatwhite_007', 'Receta Flat White', 'Espresso con microespuma', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_flt_001', 'rec_flatwhite_007', 'inv_espresso_001', 18, 'g', 'Ristretto doble'),
  ('ring_flt_002', 'rec_flatwhite_007', 'inv_leche_004', 180, 'ml', 'Microespuma');

-- Mocha (18g café + 200ml leche + 25g chocolate)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_mocha_008', 'prod_mocha_008', 'Receta Mocha', 'Espresso con chocolate y leche', 1, 'porción', 120, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_moc_001', 'rec_mocha_008', 'inv_espresso_001', 18, 'g', 'Espresso doble'),
  ('ring_moc_002', 'rec_mocha_008', 'inv_leche_004', 200, 'ml', 'Vaporizada'),
  ('ring_moc_003', 'rec_mocha_008', 'inv_chocolate_007', 25, 'g', 'Chocolate derretido');

-- Cold Brew (250ml cold brew concentrado)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_coldbrew_009', 'prod_coldbrew_009', 'Receta Cold Brew', 'Café extraído en frío', 1, 'porción', 10, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_cbd_001', 'rec_coldbrew_009', 'inv_coldbrew_003', 250, 'ml', 'Concentrado'),
  ('ring_cbd_002', 'rec_coldbrew_009', 'inv_hielo_006', 100, 'g', 'Cubos de hielo');

-- Iced Coffee (18g café + 180ml agua + hielo)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_icedcoffee_010', 'prod_icedcoffee_010', 'Receta Iced Coffee', 'Americano con hielo', 1, 'porción', 60, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_icf_001', 'rec_icedcoffee_010', 'inv_espresso_001', 18, 'g', 'Espresso'),
  ('ring_icf_002', 'rec_icedcoffee_010', 'inv_agua_005', 180, 'ml', 'Agua fría'),
  ('ring_icf_003', 'rec_icedcoffee_010', 'inv_hielo_006', 120, 'g', 'Hielo');

-- Iced Latte (18g café + 220ml leche + hielo)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_icedlatte_011', 'prod_icedlatte_011', 'Receta Iced Latte', 'Latte con hielo', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_ilt_001', 'rec_icedlatte_011', 'inv_espresso_001', 18, 'g', 'Espresso'),
  ('ring_ilt_002', 'rec_icedlatte_011', 'inv_leche_004', 220, 'ml', 'Leche fría'),
  ('ring_ilt_003', 'rec_icedlatte_011', 'inv_hielo_006', 120, 'g', 'Hielo');

-- Matcha Latte (4g matcha + 250ml leche + 10ml miel)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_matcha_012', 'prod_matcha_012', 'Receta Matcha Latte', 'Té matcha con leche', 1, 'porción', 120, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_mat_001', 'rec_matcha_012', 'inv_matcha_008', 4, 'g', 'Matcha ceremonial'),
  ('ring_mat_002', 'rec_matcha_012', 'inv_leche_004', 250, 'ml', 'Vaporizada'),
  ('ring_mat_003', 'rec_matcha_012', 'inv_miel_011', 10, 'ml', 'Endulzante');

-- Chai Latte (100ml chai + 200ml leche)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_chai_013', 'prod_chai_013', 'Receta Chai Latte', 'Chai especiado con leche', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_cha_001', 'rec_chai_013', 'inv_chai_009', 100, 'ml', 'Concentrado'),
  ('ring_cha_002', 'rec_chai_013', 'inv_leche_004', 200, 'ml', 'Vaporizada');

-- Golden Latte (3g cúrcuma + 250ml leche + 10ml miel)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_golden_014', 'prod_golden_014', 'Receta Golden Latte', 'Leche dorada con cúrcuma', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_gol_001', 'rec_golden_014', 'inv_curcuma_010', 3, 'g', 'Cúrcuma'),
  ('ring_gol_002', 'rec_golden_014', 'inv_leche_004', 250, 'ml', 'Vaporizada'),
  ('ring_gol_003', 'rec_golden_014', 'inv_miel_011', 10, 'ml', 'Endulzante');

-- Chocolate (30g chocolate + 250ml leche)
INSERT INTO recipes (id, product_id, name, description, yield, yield_unit, prep_time, active, version, created_at, updated_at)
VALUES ('rec_chocolate_015', 'prod_chocolate_015', 'Receta Chocolate', 'Chocolate caliente premium', 1, 'porción', 90, true, 1, NOW(), NOW());

INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes)
VALUES 
  ('ring_cho_001', 'rec_chocolate_015', 'inv_chocolate_007', 30, 'g', 'Chocolate premium'),
  ('ring_cho_002', 'rec_chocolate_015', 'inv_leche_004', 250, 'ml', 'Vaporizada');

PRINT '15 recetas creadas con ingredientes';

-- ============================================================================
-- PASO 6: GENERAR INVENTARIO INICIAL SUFICIENTE
-- ============================================================================

-- Obtener el primer location_id disponible
DO $$
DECLARE
  v_location_id TEXT;
  v_org_id TEXT;
  v_user_id TEXT;
BEGIN
  -- Obtener organización, location y usuario
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  SELECT id INTO v_location_id FROM locations WHERE organization_id = v_org_id LIMIT 1;
  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id LIMIT 1;

  -- Si no hay location, crear uno
  IF v_location_id IS NULL THEN
    v_location_id := 'loc_default_001';
    INSERT INTO locations (id, organization_id, name, active, created_at, updated_at)
    VALUES (v_location_id, v_org_id, 'Cafetería Principal', true, NOW(), NOW());
  END IF;

  -- Crear movimientos de inventario IN (entrada de stock)
  -- Café espresso: 10kg = 10,000g (suficiente para ~555 bebidas)
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_espresso_001', 'IN', 10000, 0.80, 'Stock inicial', NOW());

  -- Café filtro: 5kg = 5,000g
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_filtro_002', 'IN', 5000, 0.75, 'Stock inicial', NOW());

  -- Cold brew: 20L = 20,000ml
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_coldbrew_003', 'IN', 20000, 0.50, 'Stock inicial', NOW());

  -- Leche: 50L = 50,000ml
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_leche_004', 'IN', 50000, 0.15, 'Stock inicial', NOW());

  -- Agua: 100L = 100,000ml
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_agua_005', 'IN', 100000, 0.05, 'Stock inicial', NOW());

  -- Hielo: 20kg = 20,000g
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_hielo_006', 'IN', 20000, 0.03, 'Stock inicial', NOW());

  -- Chocolate: 3kg = 3,000g
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_chocolate_007', 'IN', 3000, 1.20, 'Stock inicial', NOW());

  -- Matcha: 500g
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_matcha_008', 'IN', 500, 3.50, 'Stock inicial', NOW());

  -- Chai: 5L = 5,000ml
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_chai_009', 'IN', 5000, 0.80, 'Stock inicial', NOW());

  -- Cúrcuma: 500g
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_curcuma_010', 'IN', 500, 2.00, 'Stock inicial', NOW());

  -- Miel: 3L = 3,000ml
  INSERT INTO inventory_movements (id, location_id, inventory_item_id, type, quantity, unit_cost, reason, created_at)
  VALUES (gen_random_uuid()::text, v_location_id, 'inv_miel_011', 'IN', 3000, 0.60, 'Stock inicial', NOW());

  RAISE NOTICE 'Inventario inicial generado para location: %', v_location_id;
END $$;

PRINT 'Inventario inicial creado';

-- ============================================================================
-- RESUMEN
-- ============================================================================

SELECT 'RESUMEN DE SETUP' as title;
SELECT COUNT(*) as total_categorias FROM categories;
SELECT COUNT(*) as total_productos FROM products;
SELECT COUNT(*) as total_recetas FROM recipes;
SELECT COUNT(*) as total_ingredientes_receta FROM recipe_ingredients;
SELECT COUNT(*) as total_items_inventario FROM inventory_items;
SELECT COUNT(*) as total_movimientos FROM inventory_movements;

PRINT 'Setup completado exitosamente!';
PRINT 'Siguiente paso: Generar ventas de octubre 2025';
