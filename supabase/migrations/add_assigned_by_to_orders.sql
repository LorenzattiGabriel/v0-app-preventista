-- =====================================================
-- Migration: add_assigned_by_to_orders
-- =====================================================
-- Permite distinguir entre:
--   - Pedido auto-asignado (un armador lo abrió y se autobloqueó)
--     → assigned_by IS NULL, assembled_by = user.id
--   - Pedido asignado por un admin / supervisor de armado
--     → assigned_by = admin/supervisor.id, assembled_by = armador.id
--
-- Correr en Supabase SQL Editor.
-- =====================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN orders.assigned_by IS
  'Usuario (admin/supervisor) que asignó el pedido al armador. NULL = el armador lo tomó por sí mismo.';

-- Index opcional para reportes futuros sobre quién asigna pedidos.
CREATE INDEX IF NOT EXISTS idx_orders_assigned_by ON orders(assigned_by);
