-- Agregar columna proof_url para comprobantes de pago
-- Esta columna es opcional y permite adjuntar un comprobante a cualquier movimiento

ALTER TABLE customer_account_movements
ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Comentario de documentación
COMMENT ON COLUMN customer_account_movements.proof_url IS 'URL del comprobante de pago adjunto (opcional)';





