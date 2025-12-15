-- =====================================================
-- PEDIDOS DE PRUEBA CON TIME WINDOWS (VRPTW)
-- =====================================================
-- Ejecutar en Supabase SQL Editor
-- Crea 2 pedidos:
--   1. Pedido MAÑANA (08:00 - 12:00)
--   2. Pedido TARDE/NOCHE (16:00 - 20:00)

DO $$
DECLARE
    v_customer_1_id UUID;
    v_customer_2_id UUID;
    v_preventista_id UUID;
    v_order_1_id UUID;
    v_order_2_id UUID;
    v_product_id UUID;
    v_tomorrow DATE := CURRENT_DATE + 1;
BEGIN
    -- 1. Obtener un preventista
    SELECT id INTO v_preventista_id 
    FROM profiles 
    WHERE role = 'preventista' 
    LIMIT 1;

    IF v_preventista_id IS NULL THEN
        RAISE EXCEPTION 'No hay preventistas en el sistema';
    END IF;

    -- 2. Obtener 2 clientes con coordenadas
    SELECT id INTO v_customer_1_id 
    FROM customers 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
    ORDER BY created_at DESC
    LIMIT 1;

    SELECT id INTO v_customer_2_id 
    FROM customers 
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      AND id != v_customer_1_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_customer_1_id IS NULL OR v_customer_2_id IS NULL THEN
        RAISE EXCEPTION 'Necesitas al menos 2 clientes con coordenadas';
    END IF;

    -- 3. Obtener un producto
    SELECT id INTO v_product_id 
    FROM products 
    WHERE is_active = true 
    LIMIT 1;

    -- 4. Crear Pedido 1: MAÑANA (08:00 - 12:00)
    INSERT INTO orders (
        order_number,
        customer_id,
        order_date,
        delivery_date,
        priority,
        order_type,
        status,
        subtotal,
        total,
        created_by,
        observations,
        has_time_restriction,
        delivery_window_start,
        delivery_window_end,
        time_restriction_notes
    ) VALUES (
        'TEST-AM-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MI'),
        v_customer_1_id,
        CURRENT_DATE,
        v_tomorrow,
        'alta',
        'telefono',
        'PENDIENTE_ARMADO',
        5000.00,
        5000.00,
        v_preventista_id,
        'PEDIDO DE PRUEBA - Entrega por la MAÑANA',
        TRUE,
        '08:00:00',
        '12:00:00',
        'Cliente solo disponible en horario de mañana'
    ) RETURNING id INTO v_order_1_id;

    -- Agregar item al pedido 1
    IF v_product_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity_requested, unit_price, discount, subtotal)
        VALUES (v_order_1_id, v_product_id, 10, 500, 0, 5000);
    END IF;

    -- 5. Crear Pedido 2: TARDE/NOCHE (16:00 - 20:00)
    INSERT INTO orders (
        order_number,
        customer_id,
        order_date,
        delivery_date,
        priority,
        order_type,
        status,
        subtotal,
        total,
        created_by,
        observations,
        has_time_restriction,
        delivery_window_start,
        delivery_window_end,
        time_restriction_notes
    ) VALUES (
        'TEST-PM-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MI'),
        v_customer_2_id,
        CURRENT_DATE,
        v_tomorrow,
        'normal',
        'telefono',
        'PENDIENTE_ARMADO',
        3500.00,
        3500.00,
        v_preventista_id,
        'PEDIDO DE PRUEBA - Entrega por la TARDE/NOCHE',
        TRUE,
        '16:00:00',
        '20:00:00',
        'Cliente trabaja, solo disponible después de las 16hs'
    ) RETURNING id INTO v_order_2_id;

    -- Agregar item al pedido 2
    IF v_product_id IS NOT NULL THEN
        INSERT INTO order_items (order_id, product_id, quantity_requested, unit_price, discount, subtotal)
        VALUES (v_order_2_id, v_product_id, 7, 500, 0, 3500);
    END IF;

    RAISE NOTICE '✅ Pedidos creados exitosamente:';
    RAISE NOTICE '   📦 Pedido MAÑANA (08:00-12:00): %', v_order_1_id;
    RAISE NOTICE '   📦 Pedido TARDE (16:00-20:00): %', v_order_2_id;
    RAISE NOTICE '   📅 Fecha de entrega: %', v_tomorrow;
    
END $$;

-- =====================================================
-- VERIFICAR PEDIDOS CREADOS
-- =====================================================
SELECT 
    o.order_number,
    c.commercial_name as cliente,
    o.delivery_date as fecha_entrega,
    o.priority as prioridad,
    o.status,
    CASE WHEN o.has_time_restriction THEN '✅ SÍ' ELSE '❌ NO' END as tiene_restriccion,
    o.delivery_window_start as hora_inicio,
    o.delivery_window_end as hora_fin,
    o.time_restriction_notes as notas,
    o.total,
    c.latitude,
    c.longitude
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.order_number LIKE 'TEST-%'
ORDER BY o.created_at DESC
LIMIT 5;

