-- Notas de referencia de la dirección (ej: "casa rejas negras", "cartel luminoso entrada")
-- Permite al repartidor encontrar la ubicación más fácilmente
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address_notes TEXT;
