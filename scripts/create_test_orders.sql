-- ============================================
-- SCRIPT: Crear pedidos de prueba para testing de rutas
-- NOTA: Estos pedidos se pueden eliminar fácilmente buscando por 'TEST-'
-- ============================================

DO $$
DECLARE
  v_admin_id UUID;
  v_armador_id UUID;
  v_customer_ids UUID[];
  v_customer_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_product_id UUID;
  v_delivery_date DATE := CURRENT_DATE + 1; -- Mañana
  v_counter INT := 1;
BEGIN
  -- 1. Obtener un administrativo (created_by)
  SELECT id INTO v_admin_id FROM profiles WHERE role = 'administrativo' LIMIT 1;
  IF v_admin_id IS NULL THEN
    -- Si no hay administrativo, usar cualquier usuario
    SELECT id INTO v_admin_id FROM profiles LIMIT 1;
  END IF;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún usuario';
  END IF;

  -- 2. Obtener un encargado_armado (assembled_by)
  SELECT id INTO v_armador_id FROM profiles WHERE role = 'encargado_armado' LIMIT 1;
  IF v_armador_id IS NULL THEN
    v_armador_id := v_admin_id; -- Usar admin si no hay armador
  END IF;

  -- 3. Obtener 5 clientes que tengan coordenadas
  SELECT ARRAY_AGG(id) INTO v_customer_ids
  FROM (
    SELECT id 
    FROM customers 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
      AND is_active = true
    ORDER BY RANDOM()
    LIMIT 5
  ) sub;

  IF array_length(v_customer_ids, 1) IS NULL OR array_length(v_customer_ids, 1) < 3 THEN
    RAISE EXCEPTION 'No hay suficientes clientes con coordenadas (mínimo 3)';
  END IF;

  -- 4. Obtener un producto para los items
  SELECT id INTO v_product_id FROM products WHERE is_active = true LIMIT 1;
  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún producto activo';
  END IF;

  -- 5. Crear pedidos de prueba
  FOREACH v_customer_id IN ARRAY v_customer_ids
  LOOP
    v_order_number := 'TEST-' || LPAD(v_counter::TEXT, 3, '0');
    
    -- Insertar pedido
    INSERT INTO orders (
      order_number,
      customer_id,
      order_date,
      delivery_date,
      priority,
      order_type,
      status,
      subtotal,
      general_discount,
      total,
      requires_invoice,
      has_shortages,
      created_by,
      assembled_by,
      assembly_started_at,
      assembly_completed_at,
      payment_method,
      payment_status,
      has_time_restriction,
      amount_paid,
      original_delivery_date
    ) VALUES (
      v_order_number,
      v_customer_id,
      CURRENT_DATE,
      v_delivery_date,
      CASE WHEN v_counter = 1 THEN 'alta' ELSE 'normal' END,
      'whatsapp',
      'PENDIENTE_ENTREGA', -- Listo para ruta
      5000.00 * v_counter,
      0,
      5000.00 * v_counter,
      false,
      false,
      v_admin_id,
      v_armador_id,
      NOW() - INTERVAL '1 hour',
      NOW() - INTERVAL '30 minutes',
      'Efectivo',
      'PENDIENTE',
      false,
      0,
      v_delivery_date
    ) RETURNING id INTO v_order_id;

    -- Insertar item del pedido
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity,
      unit_price,
      discount,
      subtotal
    ) VALUES (
      v_order_id,
      v_product_id,
      v_counter,
      5000.00,
      0,
      5000.00 * v_counter
    );

    RAISE NOTICE 'Creado pedido TEST: % para cliente %', v_order_number, v_customer_id;
    v_counter := v_counter + 1;
  END LOOP;

  RAISE NOTICE '✅ Creados % pedidos de prueba con prefijo TEST-', array_length(v_customer_ids, 1);
END $$;

-- Verificar los pedidos creados
SELECT 
  o.order_number,
  c.commercial_name as cliente,
  c.locality,
  o.delivery_date,
  o.status,
  o.total,
  CASE WHEN c.latitude IS NOT NULL THEN '✅' ELSE '❌' END as tiene_coords
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_number LIKE 'TEST-%'
ORDER BY o.order_number;

