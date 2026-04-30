-- Tracking de facturación: cuándo se facturó un pedido, número de factura,
-- archivo adjunto (PDF/imagen) y quién la cargó.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_invoiced BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoice_file_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoiced_by UUID REFERENCES public.profiles(id);

-- Índice para acelerar el filtro "pendientes de facturación"
CREATE INDEX IF NOT EXISTS idx_orders_pending_invoice
  ON public.orders(requires_invoice, is_invoiced)
  WHERE requires_invoice = true AND is_invoiced = false;
