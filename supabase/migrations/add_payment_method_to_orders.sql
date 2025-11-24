-- Migration: Add payment_method column to orders table
-- Description: Track payment method used for each order (Efectivo, Transferencia, Tarjeta, etc.)
-- Author: AI Assistant
-- Date: 2024-11-24

-- Add payment_method column
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Efectivo';

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_method IS 'Método de pago utilizado: Efectivo, Transferencia, Tarjeta de Débito, Tarjeta de Crédito, Cuenta Corriente, etc.';

-- Create index for performance (queries often filter by payment method)
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Update existing orders to have a default payment method
UPDATE orders
SET payment_method = 'Efectivo'
WHERE payment_method IS NULL;

-- Optional: Create a check constraint to limit valid payment methods (uncomment if needed)
-- ALTER TABLE orders
-- ADD CONSTRAINT valid_payment_method CHECK (
--   payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Cuenta Corriente', 'Cheque')
-- );

