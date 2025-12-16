-- Agregar columna para indicar si el producto permite cantidades decimales
-- Útil para productos vendidos por peso (queso, fiambre, carnes) vs unidades (botellas, paquetes)

ALTER TABLE products
ADD COLUMN IF NOT EXISTS allows_decimal_quantity BOOLEAN DEFAULT FALSE;

-- Comentario de documentación
COMMENT ON COLUMN products.allows_decimal_quantity IS 'Si es TRUE, permite cantidades decimales (ej: 1.5 kg). Si es FALSE, solo permite enteros (ej: 1, 2, 3 unidades).';

-- Opcional: También agregar unidad de medida para mayor claridad
ALTER TABLE products
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20) DEFAULT 'unidad';

COMMENT ON COLUMN products.unit_of_measure IS 'Unidad de medida del producto (unidad, kg, litro, metro, etc.)';

