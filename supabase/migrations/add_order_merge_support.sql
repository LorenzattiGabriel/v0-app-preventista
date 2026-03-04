-- Migración: Soporte para fusión de pedidos del mismo cliente
-- Permite unificar múltiples pedidos de un mismo cliente antes del armado

-- Columna para auditoría: guarda los IDs de pedidos que fueron absorbidos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS merged_from UUID[] DEFAULT NULL;

-- Índice para buscar rápidamente pedidos fusionables por cliente y estado
CREATE INDEX IF NOT EXISTS idx_orders_customer_status
ON orders (customer_id, status)
WHERE status IN ('BORRADOR', 'PENDIENTE_ARMADO');
