-- Permite que el admin habilite el armado anticipado de un pedido
-- (cuando la fecha de entrega es posterior a mañana y se quiere armar antes igual).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS early_assembly_allowed BOOLEAN DEFAULT false;
