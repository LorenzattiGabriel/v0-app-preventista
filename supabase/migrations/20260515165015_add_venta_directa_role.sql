-- =====================================================
-- Rol "venta_directa" + idempotencia en ventas directas
-- =====================================================
-- Este rol crea pedidos que nacen ENTREGADOS en una sola operación:
-- arma el pedido en el local, cobra (o registra cta cte) y descuenta stock.
-- No pasa por armado, ruta ni repartidor.

-- 1. Agregar el rol al enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'venta_directa';

-- 2. Agregar columna idempotency_key a orders
--    Evita ventas duplicadas por doble click o reintento del cliente.
--    Es UUID generado por el cliente (form) y único por venta.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN orders.idempotency_key IS
  'Llave de idempotencia generada por el cliente al confirmar una venta directa. Previene duplicados por doble click o reintento.';
