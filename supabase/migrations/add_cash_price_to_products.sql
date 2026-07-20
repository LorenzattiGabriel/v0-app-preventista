-- Precio en efectivo (contado) por producto
-- Se muestra como columna adicional en la Lista de Precios (PDF/CSV/preview)
ALTER TABLE products ADD COLUMN IF NOT EXISTS cash_price DECIMAL(12,2) DEFAULT NULL;
