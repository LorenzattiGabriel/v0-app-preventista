-- Agregar tipo de pedido "local" para clientes que se acercan a la distribuidora
-- a hacer un pedido presencialmente en el depósito
ALTER TYPE order_type ADD VALUE IF NOT EXISTS 'local';
