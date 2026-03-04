-- Soporte para cantidades decimales en order_items (productos por peso/kg)
-- Cambia INTEGER a DECIMAL para permitir 1.5 kg, 0.750 kg, etc.

ALTER TABLE order_items ALTER COLUMN quantity_requested TYPE DECIMAL(12,3);
ALTER TABLE order_items ALTER COLUMN quantity_assembled TYPE DECIMAL(12,3);
ALTER TABLE order_items ALTER COLUMN quantity_delivered TYPE DECIMAL(12,3);
