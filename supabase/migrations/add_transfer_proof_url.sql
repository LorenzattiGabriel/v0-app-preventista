-- Migration: Add transfer_proof_url column to route_orders table
-- Description: Allows storing the URL of the transfer proof image when payment method is "transferencia"

-- Add transfer_proof_url column to route_orders
ALTER TABLE route_orders
ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN route_orders.transfer_proof_url IS 'URL del comprobante de transferencia bancaria (obligatorio cuando payment_method = transferencia)';







