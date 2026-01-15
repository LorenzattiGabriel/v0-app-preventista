-- ============================================
-- SCRIPT: Eliminar pedidos de prueba y rutas asociadas
-- Busca pedidos con prefijo 'TEST-' y elimina todo relacionado
-- ============================================

-- 1. Mostrar qué se va a eliminar
SELECT 'PEDIDOS A ELIMINAR:' as info;
SELECT order_number, status, total FROM orders WHERE order_number LIKE 'TEST-%';

SELECT 'RUTAS CON PEDIDOS TEST:' as info;
SELECT DISTINCT r.route_code, r.status, r.scheduled_date
FROM routes r
JOIN route_orders ro ON r.id = ro.route_id
JOIN orders o ON ro.order_id = o.id
WHERE o.order_number LIKE 'TEST-%';

-- 2. Eliminar en orden correcto (respetando foreign keys)
DO $$
DECLARE
  v_route_ids UUID[];
  v_order_ids UUID[];
  v_deleted_routes INT := 0;
  v_deleted_orders INT := 0;
BEGIN
  -- Obtener IDs de pedidos TEST
  SELECT ARRAY_AGG(id) INTO v_order_ids
  FROM orders WHERE order_number LIKE 'TEST-%';

  IF v_order_ids IS NULL OR array_length(v_order_ids, 1) = 0 THEN
    RAISE NOTICE 'No hay pedidos TEST para eliminar';
    RETURN;
  END IF;

  -- Obtener rutas que contienen pedidos TEST
  SELECT ARRAY_AGG(DISTINCT r.id) INTO v_route_ids
  FROM routes r
  JOIN route_orders ro ON r.id = ro.route_id
  WHERE ro.order_id = ANY(v_order_ids);

  -- Eliminar route_cash_closures de rutas TEST
  IF v_route_ids IS NOT NULL AND array_length(v_route_ids, 1) > 0 THEN
    DELETE FROM route_cash_closures WHERE route_id = ANY(v_route_ids);
    RAISE NOTICE 'Eliminados cierres de caja de rutas TEST';
  END IF;

  -- Eliminar route_orders de pedidos TEST
  DELETE FROM route_orders WHERE order_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminadas asignaciones route_orders';

  -- Eliminar rutas vacías (que solo tenían pedidos TEST)
  IF v_route_ids IS NOT NULL AND array_length(v_route_ids, 1) > 0 THEN
    DELETE FROM routes 
    WHERE id = ANY(v_route_ids)
    AND NOT EXISTS (SELECT 1 FROM route_orders WHERE route_id = routes.id);
    GET DIAGNOSTICS v_deleted_routes = ROW_COUNT;
    RAISE NOTICE 'Eliminadas % rutas vacías', v_deleted_routes;
  END IF;

  -- Eliminar order_history
  DELETE FROM order_history WHERE order_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminado historial de pedidos';

  -- Eliminar order_payments
  DELETE FROM order_payments WHERE order_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminados pagos de pedidos';

  -- Eliminar order_items
  DELETE FROM order_items WHERE order_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminados items de pedidos';

  -- Eliminar customer_account_movements relacionados
  DELETE FROM customer_account_movements 
  WHERE reference_type = 'order' 
  AND reference_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminados movimientos de cuenta';

  -- Eliminar stock_movements relacionados
  DELETE FROM stock_movements WHERE order_id = ANY(v_order_ids);
  RAISE NOTICE 'Eliminados movimientos de stock';

  -- Finalmente, eliminar los pedidos
  DELETE FROM orders WHERE id = ANY(v_order_ids);
  GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;
  
  RAISE NOTICE '✅ ELIMINADOS: % pedidos TEST y % rutas asociadas', v_deleted_orders, v_deleted_routes;
END $$;

-- 3. Verificar que no quedan datos TEST
SELECT 'VERIFICACIÓN - Pedidos TEST restantes:' as info;
SELECT COUNT(*) as pedidos_test FROM orders WHERE order_number LIKE 'TEST-%';


