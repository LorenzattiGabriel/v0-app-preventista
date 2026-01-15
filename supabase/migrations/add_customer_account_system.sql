-- =====================================================
-- SISTEMA DE CUENTA CORRIENTE DE CLIENTES
-- =====================================================

-- 1. TIPOS ENUMERADOS
-- =====================================================

CREATE TYPE account_movement_type AS ENUM (
  'DEUDA_PEDIDO',           -- Deuda generada por pedido con faltante
  'PAGO_EFECTIVO',          -- Pago en efectivo
  'PAGO_TRANSFERENCIA',     -- Pago por transferencia
  'PAGO_TARJETA',           -- Pago con tarjeta
  'AJUSTE_CREDITO',         -- Ajuste administrativo a favor
  'AJUSTE_DEBITO',          -- Ajuste administrativo en contra
  'NOTA_CREDITO',           -- Nota de crédito
  'PAGO_ADELANTADO'         -- Pago adelantado de pedido
);

CREATE TYPE payment_status AS ENUM (
  'PENDIENTE',      -- No pagado
  'PAGO_PARCIAL',   -- Pagado parcialmente
  'PAGADO',         -- Pagado completamente
  'VENCIDO'         -- Pago vencido
);

-- 2. TABLA: customer_account_movements (Movimientos de cuenta corriente)
-- =====================================================

CREATE TABLE customer_account_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Tipo y descripción
  movement_type account_movement_type NOT NULL,
  description TEXT NOT NULL,
  
  -- Montos (DECIMAL para precisión monetaria)
  debit_amount DECIMAL(12,2) DEFAULT 0,   -- Aumenta deuda (positivo)
  credit_amount DECIMAL(12,2) DEFAULT 0,  -- Reduce deuda (pago)
  balance_after DECIMAL(12,2) NOT NULL,   -- Saldo después del movimiento
  
  -- Relaciones opcionales
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  -- Constraint: solo uno de los montos debe ser > 0
  CONSTRAINT check_one_amount CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  )
);

-- Índices para performance
CREATE INDEX idx_customer_movements_customer ON customer_account_movements(customer_id);
CREATE INDEX idx_customer_movements_order ON customer_account_movements(order_id);
CREATE INDEX idx_customer_movements_date ON customer_account_movements(created_at DESC);

-- 3. TABLA: order_payments (Pagos de pedidos)
-- =====================================================

CREATE TABLE order_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Montos
  order_total DECIMAL(12,2) NOT NULL,      -- Total del pedido
  total_paid DECIMAL(12,2) DEFAULT 0,      -- Total pagado
  balance_due DECIMAL(12,2) NOT NULL,      -- Saldo pendiente
  
  -- Estado de pago
  payment_status payment_status DEFAULT 'PENDIENTE',
  
  -- Vencimiento (basado en credit_days del cliente)
  due_date DATE,
  
  -- Control
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_order_payment UNIQUE(order_id)
);

CREATE INDEX idx_order_payments_status ON order_payments(payment_status);
CREATE INDEX idx_order_payments_due_date ON order_payments(due_date);

-- 4. TABLA: route_cash_closures (Cierres de caja)
-- =====================================================

CREATE TABLE route_cash_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL UNIQUE REFERENCES routes(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Montos calculados automáticamente
  total_expected DECIMAL(12,2) NOT NULL,   -- Suma de totales de pedidos
  total_collected DECIMAL(12,2) NOT NULL,  -- Suma de collected_amount
  total_difference DECIMAL(12,2) NOT NULL, -- Diferencia (puede ser negativa)
  
  -- Contadores
  total_orders INTEGER NOT NULL,
  orders_delivered INTEGER NOT NULL,
  orders_collected INTEGER NOT NULL,       -- Pedidos donde was_collected = true
  
  -- Desglose por método de pago
  cash_collected DECIMAL(12,2) DEFAULT 0,
  transfer_collected DECIMAL(12,2) DEFAULT 0,
  card_collected DECIMAL(12,2) DEFAULT 0,
  
  -- Timestamps
  closure_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Inmutable: no se puede modificar una vez creado
  is_locked BOOLEAN DEFAULT true,
  
  -- Notas del repartidor al cerrar
  notes TEXT
);

CREATE INDEX idx_cash_closures_driver ON route_cash_closures(driver_id);
CREATE INDEX idx_cash_closures_date ON route_cash_closures(closure_date DESC);

-- 5. MODIFICACIONES A TABLAS EXISTENTES
-- =====================================================

-- Agregar payment_status a orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'PENDIENTE';

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Agregar current_balance a customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(12,2) DEFAULT 0;

-- Índice para encontrar clientes con deuda
CREATE INDEX IF NOT EXISTS idx_customers_with_debt ON customers(current_balance) 
WHERE current_balance > 0;

-- Agregar payment_method a route_orders para desglose
ALTER TABLE route_orders
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'efectivo';

-- 6. FUNCIÓN: Actualizar saldo del cliente
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el saldo actual del cliente basado en balance_after del último movimiento
  UPDATE customers 
  SET current_balance = NEW.balance_after,
      updated_at = NOW()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo automáticamente
DROP TRIGGER IF EXISTS trigger_update_customer_balance ON customer_account_movements;
CREATE TRIGGER trigger_update_customer_balance
AFTER INSERT ON customer_account_movements
FOR EACH ROW
EXECUTE FUNCTION update_customer_balance();

-- 7. FUNCIÓN: Actualizar estado de pago del pedido
-- =====================================================

CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Determinar el estado de pago basado en balance_due
  IF NEW.balance_due <= 0 THEN
    NEW.payment_status := 'PAGADO';
  ELSIF NEW.total_paid > 0 THEN
    NEW.payment_status := 'PAGO_PARCIAL';
  ELSE
    NEW.payment_status := 'PENDIENTE';
  END IF;
  
  -- Actualizar también el payment_status en orders
  UPDATE orders 
  SET payment_status = NEW.payment_status,
      updated_at = NOW()
  WHERE id = NEW.order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado de pago
DROP TRIGGER IF EXISTS trigger_update_order_payment ON order_payments;
CREATE TRIGGER trigger_update_order_payment
BEFORE INSERT OR UPDATE ON order_payments
FOR EACH ROW
EXECUTE FUNCTION update_order_payment_status();

-- 8. FUNCIÓN: Crear registro de pago cuando se crea un pedido
-- =====================================================

CREATE OR REPLACE FUNCTION create_order_payment_record()
RETURNS TRIGGER AS $$
DECLARE
  v_credit_days INTEGER;
  v_due_date DATE;
BEGIN
  -- Solo crear si el pedido pasa de BORRADOR a otro estado
  IF NEW.status != 'BORRADOR' AND (OLD IS NULL OR OLD.status = 'BORRADOR') THEN
    -- Obtener días de crédito del cliente
    SELECT credit_days INTO v_credit_days
    FROM customers WHERE id = NEW.customer_id;
    
    -- Calcular fecha de vencimiento
    v_due_date := CURRENT_DATE + COALESCE(v_credit_days, 0);
    
    -- Insertar registro de pago (si no existe)
    INSERT INTO order_payments (order_id, order_total, balance_due, due_date)
    VALUES (NEW.id, NEW.total, NEW.total, v_due_date)
    ON CONFLICT (order_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear registro de pago automáticamente
DROP TRIGGER IF EXISTS trigger_create_order_payment ON orders;
CREATE TRIGGER trigger_create_order_payment
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION create_order_payment_record();







