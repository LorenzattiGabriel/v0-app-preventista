-- Permite vender un mismo producto por unidad o por peso (ej: una horma se vende
-- entera o a granel) y registrar un peso real opcional al armar el pedido.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS sale_unit TEXT NOT NULL DEFAULT 'unidad'
    CHECK (sale_unit IN ('unidad', 'peso')),
  ADD COLUMN IF NOT EXISTS assembled_weight_kg DECIMAL(12, 3);

COMMENT ON COLUMN order_items.sale_unit IS
  '''unidad'' = quantity_requested es cantidad de unidades; ''peso'' = quantity_requested está en kg';

COMMENT ON COLUMN order_items.assembled_weight_kg IS
  'Peso real al armar (referencia opcional, ej: peso de hormas pesadas en balanza)';
