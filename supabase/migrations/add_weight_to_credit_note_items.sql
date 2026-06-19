-- Devolución por peso en notas de crédito (productos con sale_unit='peso').
-- Para esos productos, en una línea devuelta:
--   - quantity            = PIEZAS devueltas (1, 0.5, 0.25 ...) → se reintegra al stock en piezas
--   - returned_weight_kg  = KG EXACTOS devueltos (pesados en balanza)
--   - unit_price          = precio por kg cobrado en la venta
--   - subtotal            = returned_weight_kg × unit_price
-- Para productos por unidad NO cambia nada: sale_unit queda NULL/'unidad' y subtotal = quantity × unit_price.
-- Columnas nullable: las NC existentes siguen funcionando sin tocar.

ALTER TABLE public.credit_note_items
  ADD COLUMN IF NOT EXISTS sale_unit TEXT,
  ADD COLUMN IF NOT EXISTS returned_weight_kg NUMERIC(12, 3);

COMMENT ON COLUMN public.credit_note_items.sale_unit IS
  '''peso'' = la línea se acredita por returned_weight_kg × unit_price (precio/kg); NULL o ''unidad'' = quantity × unit_price';
COMMENT ON COLUMN public.credit_note_items.returned_weight_kg IS
  'Kg exactos devueltos (solo sale_unit=''peso''). El monto de la línea se calcula sobre este peso.';
