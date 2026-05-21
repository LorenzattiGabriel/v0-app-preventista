-- Agrega sale_unit y estimated_weight_kg a products para el modelo
-- "pieza pesada": el preventista carga piezas, el armador carga kg de balanza.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sale_unit TEXT NOT NULL DEFAULT 'unidad'
    CHECK (sale_unit IN ('unidad', 'peso')),
  ADD COLUMN IF NOT EXISTS estimated_weight_kg DECIMAL(12, 3);

COMMENT ON COLUMN products.sale_unit IS
  '''unidad'' = pedido en unidades, facturado por unidad; ''peso'' = pedido en piezas enteras, facturado por kg de balanza × precio/kg';

COMMENT ON COLUMN products.estimated_weight_kg IS
  'Peso estimado por pieza (kg). Solo relevante cuando sale_unit=peso. Referencia para el preventista al crear el pedido.';

-- Actualizar el comentario de order_items.sale_unit para reflejar la nueva semántica
COMMENT ON COLUMN order_items.sale_unit IS
  '''unidad'' = quantity_requested es piezas, facturado por cantidad × precio; ''peso'' = quantity_requested es piezas enteras, facturado por assembled_weight_kg × precio/kg';
