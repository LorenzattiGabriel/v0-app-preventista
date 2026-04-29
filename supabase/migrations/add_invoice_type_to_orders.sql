-- Tipo de factura cuando el pedido requiere facturación (A, B o C)
-- Solo aplica si requires_invoice = true
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_type TEXT
  CHECK (invoice_type IS NULL OR invoice_type IN ('A', 'B', 'C'));
