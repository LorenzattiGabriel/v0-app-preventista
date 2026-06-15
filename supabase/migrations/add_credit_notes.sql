-- ============================================================================
-- Notas de Crédito / Devoluciones
-- ----------------------------------------------------------------------------
-- Una nota de crédito SIEMPRE se basa en un pedido entregado. El admin elige los
-- productos de ese pedido a devolver y la RESOLUCIÓN; el sistema ejecuta la acción:
--   - 'reemplazo'        → se entrega producto de reemplazo (no toca cuenta corriente)
--   - 'saldo_favor'      → genera crédito en cuenta corriente (baja deuda / saldo a favor)
--   - 'devolucion_dinero'→ reintegro; impacta o no la cuenta corriente según affects_account
--
-- Por cada producto devuelto el admin define el destino (disposition):
--   - 'reintegrar'   → vuelve al stock vendible
--   - 'dejar_cliente'→ el cliente se lo queda (no vuelve al stock)
--   - 'desechar'     → se descarta (no vuelve al stock)
-- El stock de los productos de reemplazo se descuenta.
-- ============================================================================

-- 1. Tabla cabecera
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number TEXT NOT NULL UNIQUE,                 -- correlativo, ej: NC-0001
  customer_id        UUID NOT NULL REFERENCES public.customers (id),
  order_id           UUID REFERENCES public.orders (id),   -- pedido/venta de referencia (opcional)
  invoice_type       TEXT CHECK (invoice_type IN ('A', 'B', 'C')),
  resolution_type    TEXT NOT NULL CHECK (resolution_type IN ('reemplazo', 'saldo_favor', 'devolucion_dinero')),
  affects_account    BOOLEAN NOT NULL DEFAULT false,       -- si genera movimiento en cuenta corriente
  reason             TEXT NOT NULL,                        -- motivo (ej: falla de producto)
  authorized_by      TEXT,                                 -- quién autorizó (autorización previa)
  amount             NUMERIC(12, 2) NOT NULL DEFAULT 0,    -- monto total devuelto
  notes              TEXT,
  created_by         UUID REFERENCES public.profiles (id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_customer ON public.credit_notes (customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_order ON public.credit_notes (order_id);

-- 2. Tabla de líneas (productos devueltos y de reemplazo)
CREATE TABLE IF NOT EXISTS public.credit_note_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID NOT NULL REFERENCES public.credit_notes (id) ON DELETE CASCADE,
  product_id     UUID REFERENCES public.products (id),
  product_name   TEXT NOT NULL,
  line_type      TEXT NOT NULL CHECK (line_type IN ('devuelto', 'reemplazo')),
  quantity       NUMERIC(12, 3) NOT NULL DEFAULT 0,
  unit_price     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- solo 'devuelto': destino del producto físico devuelto
  disposition    TEXT CHECK (disposition IN ('reintegrar', 'dejar_cliente', 'desechar'))
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_note ON public.credit_note_items (credit_note_id);

-- 3. Numeración correlativa: NC-0001, NC-0002, ...
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(credit_note_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.credit_notes
  WHERE credit_note_number ~ '^NC-[0-9]+$';

  RETURN 'NC-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- 4. RLS abierto para authenticated (los permisos los maneja la app, igual que el resto)
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_notes_all" ON public.credit_notes;
CREATE POLICY "credit_notes_all" ON public.credit_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "credit_note_items_all" ON public.credit_note_items;
CREATE POLICY "credit_note_items_all" ON public.credit_note_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
