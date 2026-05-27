-- =====================================================
-- Migration: products_stock_to_decimal
-- =====================================================
-- Permite stock fraccionado en productos (necesario para "pieza pesada"
-- que admite fracciones, ej: 0.5, 1.5 piezas).
--
-- Cambios:
--   products.current_stock: INTEGER → DECIMAL(12,2)
--   products.min_stock:     INTEGER → DECIMAL(12,2)
--
-- Las RPC de venta directa (confirm_direct_sale_*) ya usan v_quantity::numeric,
-- así que siguen funcionando sin tocar nada.
--
-- Correr en Supabase SQL Editor.
-- =====================================================

ALTER TABLE products
  ALTER COLUMN current_stock TYPE DECIMAL(12,2) USING current_stock::DECIMAL(12,2);

ALTER TABLE products
  ALTER COLUMN min_stock TYPE DECIMAL(12,2) USING min_stock::DECIMAL(12,2);
