-- =====================================================
-- MIGRACIÓN: Normalizar campos de pago en tabla orders
-- =====================================================
-- Esta migración mueve los campos relacionados al pago desde
-- route_orders hacia orders para una mejor normalización.
--
-- Razón: Los datos de pago pertenecen al PEDIDO, no a la ruta.
-- Un pedido puede pagarse fuera de una ruta (cuenta corriente).
-- =====================================================

-- 1. Agregar nuevos campos a orders (si no existen)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS was_collected_on_delivery BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT;

-- 2. Migrar datos existentes de route_orders a orders
UPDATE orders o
SET 
  amount_paid = COALESCE(ro.collected_amount, 0),
  was_collected_on_delivery = COALESCE(ro.was_collected, FALSE),
  payment_method = COALESCE(ro.payment_method, o.payment_method)
FROM route_orders ro
WHERE ro.order_id = o.id
  AND ro.was_collected = TRUE;

-- 3. Agregar comentarios descriptivos
COMMENT ON COLUMN orders.amount_paid IS 'Monto pagado al momento de la entrega';
COMMENT ON COLUMN orders.was_collected_on_delivery IS 'Si se cobró al momento de la entrega';
COMMENT ON COLUMN orders.transfer_proof_url IS 'URL del comprobante de transferencia bancaria';

-- 4. Crear índice para búsquedas de pagos
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_was_collected ON orders(was_collected_on_delivery) WHERE was_collected_on_delivery = TRUE;

-- =====================================================
-- NOTA: Los campos en route_orders se mantienen por compatibilidad
-- pero ya no se usarán para nuevas entregas.
-- En una futura migración se pueden eliminar:
--   ALTER TABLE route_orders DROP COLUMN IF EXISTS collected_amount;
--   ALTER TABLE route_orders DROP COLUMN IF EXISTS was_collected;
--   ALTER TABLE route_orders DROP COLUMN IF EXISTS payment_method;
--   ALTER TABLE route_orders DROP COLUMN IF EXISTS transfer_proof_url;
-- =====================================================

-- 5. Verificar migración
SELECT 
  'Pedidos migrados' as tipo,
  COUNT(*) as cantidad
FROM orders 
WHERE was_collected_on_delivery = TRUE;





