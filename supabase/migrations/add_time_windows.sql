-- =====================================================
-- RESTRICCIONES HORARIAS (TIME WINDOWS) PARA VRPTW
-- =====================================================
-- Problema: Vehicle Routing Problem with Time Windows (VRPTW)

-- 1. AGREGAR CAMPOS A CUSTOMERS (franja horaria por defecto del cliente)
-- =====================================================

-- Indica si el cliente tiene restricción horaria
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS has_time_restriction BOOLEAN DEFAULT false;

-- Hora de inicio de la ventana de entrega (formato HH:MM)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS delivery_window_start TIME DEFAULT '08:00';

-- Hora de fin de la ventana de entrega (formato HH:MM)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS delivery_window_end TIME DEFAULT '18:00';

-- Notas sobre la restricción horaria
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS time_restriction_notes TEXT;

-- Índice para filtrar clientes con restricciones
CREATE INDEX IF NOT EXISTS idx_customers_time_restriction 
ON customers(has_time_restriction) WHERE has_time_restriction = true;


-- 2. AGREGAR CAMPOS A ORDERS (franja horaria específica del pedido)
-- =====================================================

-- Indica si el pedido tiene restricción horaria (puede diferir del cliente)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS has_time_restriction BOOLEAN DEFAULT false;

-- Hora de inicio de la ventana de entrega para este pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_window_start TIME;

-- Hora de fin de la ventana de entrega para este pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_window_end TIME;

-- Notas sobre la restricción horaria del pedido
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS time_restriction_notes TEXT;


-- 3. FUNCIÓN: Copiar restricción horaria del cliente al pedido
-- =====================================================

CREATE OR REPLACE FUNCTION copy_customer_time_restriction()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el pedido no tiene restricción definida, copiar del cliente
  IF NEW.has_time_restriction IS NULL THEN
    SELECT 
      has_time_restriction,
      delivery_window_start,
      delivery_window_end,
      time_restriction_notes
    INTO 
      NEW.has_time_restriction,
      NEW.delivery_window_start,
      NEW.delivery_window_end,
      NEW.time_restriction_notes
    FROM customers 
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para copiar restricción automáticamente
DROP TRIGGER IF EXISTS trigger_copy_time_restriction ON orders;
CREATE TRIGGER trigger_copy_time_restriction
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION copy_customer_time_restriction();


-- 4. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN customers.has_time_restriction IS 'Indica si el cliente tiene ventana de tiempo para entregas';
COMMENT ON COLUMN customers.delivery_window_start IS 'Hora de inicio de la ventana de entrega (HH:MM)';
COMMENT ON COLUMN customers.delivery_window_end IS 'Hora de fin de la ventana de entrega (HH:MM)';

COMMENT ON COLUMN orders.has_time_restriction IS 'Indica si el pedido tiene restricción horaria (puede diferir del cliente)';
COMMENT ON COLUMN orders.delivery_window_start IS 'Hora de inicio de la ventana de entrega para este pedido';
COMMENT ON COLUMN orders.delivery_window_end IS 'Hora de fin de la ventana de entrega para este pedido';








