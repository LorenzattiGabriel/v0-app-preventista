-- =====================================================
-- MIGRACIÓN DE PRUEBA: Poner ruta en estado EN_CURSO
-- Para probar el flujo de cuenta corriente
-- =====================================================

-- 1. Actualizar la ruta a EN_CURSO
UPDATE routes 
SET 
  status = 'EN_CURSO',
  actual_start_time = NOW()
WHERE route_code = 'REC-0002-20251210';

-- 2. Actualizar los pedidos de esa ruta a EN_REPARTICION
UPDATE orders 
SET 
  status = 'EN_REPARTICION',
  delivery_started_at = NOW()
WHERE id IN (
  SELECT ro.order_id 
  FROM route_orders ro
  JOIN routes r ON r.id = ro.route_id
  WHERE r.route_code = 'REC-0002-20251210'
);

-- 3. Verificar los cambios
SELECT 
  r.route_code,
  r.status as route_status,
  r.actual_start_time,
  COUNT(ro.id) as total_orders
FROM routes r
LEFT JOIN route_orders ro ON ro.route_id = r.id
WHERE r.route_code = 'REC-0002-20251210'
GROUP BY r.id;

-- 4. Verificar los pedidos actualizados
SELECT 
  o.order_number,
  o.status,
  o.total,
  c.commercial_name as cliente,
  c.current_balance as saldo_actual_cliente
FROM orders o
JOIN customers c ON c.id = o.customer_id
WHERE o.id IN (
  SELECT ro.order_id 
  FROM route_orders ro
  JOIN routes r ON r.id = ro.route_id
  WHERE r.route_code = 'REC-0002-20251210'
);



