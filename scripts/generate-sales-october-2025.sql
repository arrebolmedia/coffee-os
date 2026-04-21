-- ============================================================================
-- CoffeeOS - Generate Sales for October 2025
-- Crear 10 ventas de cada producto (150 transacciones totales)
-- Distribuidas en diferentes fechas de octubre 2025
-- ============================================================================

DO $$
DECLARE
  v_org_id TEXT;
  v_location_id TEXT;
  v_user_id TEXT;
  v_customer_id TEXT;
  v_transaction_id TEXT;
  v_ticket_id TEXT;
  v_ticket_number TEXT;
  v_transaction_number TEXT;
  v_product_id TEXT;
  v_product_name TEXT;
  v_product_price NUMERIC;
  v_product_cost NUMERIC;
  v_date DATE;
  v_time TIME;
  v_counter INT := 1;
  v_day INT;
  v_hour INT;
  v_minute INT;
  product_record RECORD;
  sale_num INT;
BEGIN
  -- Obtener IDs necesarios
  SELECT id INTO v_org_id FROM organizations LIMIT 1;
  SELECT id INTO v_location_id FROM locations WHERE organization_id = v_org_id LIMIT 1;
  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id LIMIT 1;
  
  -- Crear un cliente genérico para las ventas
  v_customer_id := 'cust_walkin_001';
  INSERT INTO customers (id, email, phone, first_name, last_name, loyalty_points, total_spent, visit_count, active, created_at, updated_at)
  VALUES (v_customer_id, 'walkin@coffeedemo.mx', '5555555555', 'Cliente', 'General', 0, 0, 0, true, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Iniciando generación de ventas para octubre 2025...';
  RAISE NOTICE 'Organización: %, Location: %, Usuario: %', v_org_id, v_location_id, v_user_id;

  -- Iterar sobre cada producto
  FOR product_record IN 
    SELECT id, name, price, cost 
    FROM products 
    ORDER BY name
  LOOP
    v_product_id := product_record.id;
    v_product_name := product_record.name;
    v_product_price := product_record.price;
    v_product_cost := product_record.cost;

    RAISE NOTICE 'Generando 10 ventas para: % ($%)', v_product_name, v_product_price;

    -- Generar 10 ventas para este producto
    FOR sale_num IN 1..10 LOOP
      -- Generar fecha aleatoria en octubre 2025 (días 1-31)
      v_day := 1 + floor(random() * 31)::int;
      
      -- Horas de operación: 7am - 9pm (7-21)
      v_hour := 7 + floor(random() * 14)::int;
      v_minute := floor(random() * 60)::int;
      
      v_date := make_date(2025, 10, v_day);
      v_time := make_time(v_hour, v_minute, 0);

      -- Generar IDs únicos
      v_transaction_number := 'TRX-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad(v_counter::text, 6, '0');
      v_transaction_id := 'trx_' || replace(lower(v_transaction_number), '-', '_');
      
      v_ticket_number := 'TKT-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad(v_counter::text, 6, '0');
      v_ticket_id := 'tkt_' || replace(lower(v_ticket_number), '-', '_');

      -- Crear transacción
      INSERT INTO transactions (
        id, location_id, user_id, customer_id, transaction_number, status,
        subtotal, tax, discount, total, payment_method,
        created_at, updated_at, completed_at
      )
      VALUES (
        v_transaction_id,
        v_location_id,
        v_user_id,
        v_customer_id,
        v_transaction_number,
        'COMPLETED',
        v_product_price,
        v_product_price * 0.16, -- IVA 16%
        0,
        v_product_price * 1.16,
        'CASH',
        v_date + v_time,
        v_date + v_time,
        v_date + v_time
      );

      -- Crear línea de transacción
      INSERT INTO transaction_line_items (
        id, transaction_id, product_id, quantity, unit_price, subtotal
      )
      VALUES (
        'trxline_' || v_counter::text,
        v_transaction_id,
        v_product_id,
        1,
        v_product_price,
        v_product_price
      );

      -- Crear ticket
      INSERT INTO tickets (
        id, location_id, user_id, customer_id, ticket_number, status,
        subtotal, tax, tip, discount, total,
        opened_at, closed_at
      )
      VALUES (
        v_ticket_id,
        v_location_id,
        v_user_id,
        v_customer_id,
        v_ticket_number,
        'CLOSED',
        v_product_price,
        v_product_price * 0.16,
        0,
        0,
        v_product_price * 1.16,
        v_date + v_time,
        v_date + v_time + interval '5 minutes'
      );

      -- Crear línea de ticket
      INSERT INTO ticket_lines (
        id, ticket_id, product_id, quantity, unit_price, discount, total
      )
      VALUES (
        'tktline_' || v_counter::text,
        v_ticket_id,
        v_product_id,
        1,
        v_product_price,
        0,
        v_product_price
      );

      -- Crear pago
      INSERT INTO payments (
        id, ticket_id, transaction_id, method, amount, status, processed_at
      )
      VALUES (
        'pay_' || v_counter::text,
        v_ticket_id,
        v_transaction_id,
        'CASH',
        v_product_price * 1.16,
        'COMPLETED',
        v_date + v_time
      );

      -- Crear movimiento de inventario OUT (consumo de ingredientes)
      -- Esto simula el consumo de ingredientes al preparar la bebida
      INSERT INTO inventory_movements (
        id, location_id, inventory_item_id, type, quantity, unit_cost, 
        reason, reference, created_at
      )
      SELECT 
        gen_random_uuid()::text,
        v_location_id,
        ri.inventory_item_id,
        'OUT',
        ri.quantity,
        ii.cost_per_unit,
        'Venta: ' || v_product_name,
        v_ticket_number,
        v_date + v_time
      FROM recipe_ingredients ri
      JOIN recipes r ON r.id = ri.recipe_id
      JOIN inventory_items ii ON ii.id = ri.inventory_item_id
      WHERE r.product_id = v_product_id;

      v_counter := v_counter + 1;
    END LOOP;

  END LOOP;

  -- Actualizar totales del cliente
  UPDATE customers 
  SET 
    total_spent = (SELECT SUM(total) FROM tickets WHERE customer_id = v_customer_id),
    visit_count = (SELECT COUNT(*) FROM tickets WHERE customer_id = v_customer_id),
    last_visit = (SELECT MAX(closed_at) FROM tickets WHERE customer_id = v_customer_id)
  WHERE id = v_customer_id;

  RAISE NOTICE '✅ Generación completada!';
  RAISE NOTICE 'Total de transacciones: %', v_counter - 1;
  
END $$;

-- ============================================================================
-- VERIFICACIÓN Y RESUMEN
-- ============================================================================

SELECT '=== RESUMEN DE VENTAS OCTUBRE 2025 ===' as titulo;

SELECT 
  TO_CHAR(t.created_at, 'YYYY-MM-DD') as fecha,
  COUNT(*) as num_transacciones,
  SUM(t.total) as total_ventas
FROM transactions t
WHERE t.created_at >= '2025-10-01' AND t.created_at < '2025-11-01'
GROUP BY TO_CHAR(t.created_at, 'YYYY-MM-DD')
ORDER BY fecha;

SELECT '=== VENTAS POR PRODUCTO ===' as titulo;

SELECT 
  p.name as producto,
  COUNT(tli.id) as cantidad_vendida,
  p.price as precio_unitario,
  SUM(tli.subtotal) as total_ventas,
  p.cost as costo_unitario,
  SUM(tli.quantity * p.cost) as costo_total,
  SUM(tli.subtotal) - SUM(tli.quantity * p.cost) as utilidad_bruta,
  ROUND((SUM(tli.subtotal) - SUM(tli.quantity * p.cost)) / SUM(tli.subtotal) * 100, 2) as margen_pct
FROM transaction_line_items tli
JOIN transactions t ON t.id = tli.transaction_id
JOIN products p ON p.id = tli.product_id
WHERE t.created_at >= '2025-10-01' AND t.created_at < '2025-11-01'
GROUP BY p.name, p.price, p.cost
ORDER BY total_ventas DESC;

SELECT '=== TOTALES GENERALES ===' as titulo;

SELECT 
  COUNT(DISTINCT t.id) as total_transacciones,
  COUNT(DISTINCT DATE(t.created_at)) as dias_con_ventas,
  SUM(t.subtotal) as subtotal,
  SUM(t.tax) as impuestos,
  SUM(t.total) as total_con_impuestos,
  ROUND(AVG(t.total), 2) as ticket_promedio
FROM transactions t
WHERE t.created_at >= '2025-10-01' AND t.created_at < '2025-11-01';

SELECT '=== INVENTARIO CONSUMIDO ===' as titulo;

SELECT 
  ii.name as ingrediente,
  ii.unit_of_measure as unidad,
  SUM(im.quantity) as cantidad_consumida,
  ii.cost_per_unit as costo_unitario,
  ROUND(SUM(im.quantity * im.unit_cost), 2) as costo_total
FROM inventory_movements im
JOIN inventory_items ii ON ii.id = im.inventory_item_id
WHERE im.type = 'OUT' 
  AND im.created_at >= '2025-10-01' 
  AND im.created_at < '2025-11-01'
GROUP BY ii.name, ii.unit_of_measure, ii.cost_per_unit
ORDER BY costo_total DESC;
