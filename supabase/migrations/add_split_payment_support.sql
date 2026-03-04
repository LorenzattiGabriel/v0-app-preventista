-- Soporte para pagos múltiples (split payment) en entregas
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_methods_json jsonb DEFAULT NULL;
