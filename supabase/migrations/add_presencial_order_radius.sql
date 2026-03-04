-- Radio configurable para validación de pedidos presenciales
-- El admin puede configurar a cuántos metros del cliente debe estar el preventista
ALTER TABLE depot_configuration ADD COLUMN IF NOT EXISTS presencial_order_radius_meters INTEGER DEFAULT 600;
