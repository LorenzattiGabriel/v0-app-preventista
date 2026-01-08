-- =====================================================
-- PRIORIDAD DE CLIENTES
-- =====================================================
-- Permite asignar prioridad (baja/normal/alta) a cada cliente

-- 1. Crear tipo enum para prioridad de cliente
DO $$ BEGIN
  CREATE TYPE customer_priority AS ENUM ('baja', 'normal', 'alta');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Agregar columna priority a customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS priority customer_priority DEFAULT 'normal';

-- 3. Índice para filtrar por prioridad
CREATE INDEX IF NOT EXISTS idx_customers_priority 
ON customers(priority);

-- 4. Comentario para documentación
COMMENT ON COLUMN customers.priority IS 'Prioridad del cliente: baja, normal o alta';



