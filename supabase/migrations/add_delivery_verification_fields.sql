-- ============================================
-- Add Delivery Verification System
-- ============================================

-- Add delivery_code column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_code VARCHAR(4);

COMMENT ON COLUMN orders.delivery_code IS 'Código de 4 dígitos para verificar la entrega. Solo visible para el cliente.';

-- Add no_delivery_reason column for when delivery fails
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS no_delivery_reason TEXT;

COMMENT ON COLUMN orders.no_delivery_reason IS 'Razón por la cual no se pudo entregar el pedido (ausente, rechazó, dirección incorrecta, etc.)';

-- Add no_delivery_notes column for additional details
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS no_delivery_notes TEXT;

COMMENT ON COLUMN orders.no_delivery_notes IS 'Notas adicionales del repartidor cuando no se pudo entregar';

-- ============================================
-- Function to generate 4-digit delivery code
-- ============================================

CREATE OR REPLACE FUNCTION generate_delivery_code()
RETURNS VARCHAR(4)
LANGUAGE plpgsql
AS $$
DECLARE
  code VARCHAR(4);
BEGIN
  -- Generate a random 4-digit code (1000-9999)
  code := LPAD((1000 + floor(random() * 9000))::TEXT, 4, '0');
  RETURN code;
END;
$$;

COMMENT ON FUNCTION generate_delivery_code() IS 'Genera un código aleatorio de 4 dígitos para verificación de entrega';

-- ============================================
-- Update existing orders without delivery code
-- ============================================

-- Generate delivery codes for existing orders that don't have one
UPDATE orders
SET delivery_code = generate_delivery_code()
WHERE delivery_code IS NULL 
  AND status NOT IN ('BORRADOR', 'CANCELADO');

-- Add index for faster lookups by delivery_code
CREATE INDEX IF NOT EXISTS idx_orders_delivery_code ON orders(delivery_code);

