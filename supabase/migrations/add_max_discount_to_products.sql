-- Límite máximo de descuento por producto
-- El administrador configura el tope de descuento que el preventista puede aplicar
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount_percentage DECIMAL(5,2) DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount_fixed DECIMAL(12,2) DEFAULT NULL;
