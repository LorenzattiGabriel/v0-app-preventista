-- ============================================================================
-- Notas de Débito
-- ----------------------------------------------------------------------------
-- Contraparte de las Notas de Crédito, para casos donde hay que AUMENTAR la
-- deuda de un cliente con un motivo documentado (ej: un cheque que vino
-- rechazado del banco y hay que volver a cargarlo en la cuenta corriente).
-- A diferencia de la NC, no tiene líneas de producto: es un monto + motivo,
-- opcionalmente vinculado a un pedido de referencia.
-- ============================================================================

-- 1. Nuevo tipo de movimiento de cuenta corriente
ALTER TYPE account_movement_type ADD VALUE IF NOT EXISTS 'NOTA_DEBITO';

-- 2. Tabla
CREATE TABLE IF NOT EXISTS public.debit_notes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debit_note_number TEXT NOT NULL UNIQUE,              -- correlativo, ej: ND-0001
  customer_id       UUID NOT NULL REFERENCES public.customers (id),
  order_id          UUID REFERENCES public.orders (id), -- pedido de referencia (opcional)
  reason            TEXT NOT NULL,                       -- motivo (ej: cheque rechazado banco X nº 1234)
  amount            NUMERIC(12, 2) NOT NULL,
  proof_url         TEXT,                                -- comprobante (ej: foto del cheque rechazado)
  notes             TEXT,
  created_by        UUID REFERENCES public.profiles (id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_customer ON public.debit_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_debit_notes_order ON public.debit_notes (order_id);

-- 3. Numeración correlativa: ND-0001, ND-0002, ...
CREATE OR REPLACE FUNCTION public.generate_debit_note_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(debit_note_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.debit_notes
  WHERE debit_note_number ~ '^ND-[0-9]+$';

  RETURN 'ND-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. RLS abierto para authenticated (los permisos los maneja la app, igual que el resto)
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debit_notes_all" ON public.debit_notes;
CREATE POLICY "debit_notes_all" ON public.debit_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
