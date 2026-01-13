-- Agregar columna para foto de comprobante cuando no se puede entregar
-- Esta foto es evidencia de por qué no se pudo realizar la entrega

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS no_delivery_photo_url TEXT;

-- Comentario de documentación
COMMENT ON COLUMN orders.no_delivery_photo_url IS 'URL de la foto de comprobante cuando no se puede entregar (ej: local cerrado, dirección vacía)';




