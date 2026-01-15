-- ============================================
-- MIGRACIÓN: Sistema de Pedidos Retrasados
-- ============================================

-- 1. Agregar campos para tracking de cambios de fecha en order_history
ALTER TABLE public.order_history 
ADD COLUMN IF NOT EXISTS change_type VARCHAR(50) DEFAULT 'STATUS_CHANGE',
ADD COLUMN IF NOT EXISTS previous_delivery_date DATE,
ADD COLUMN IF NOT EXISTS new_delivery_date DATE;

-- 2. Agregar campo de fecha original en orders (para referencia)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS original_delivery_date DATE;

-- 3. Agregar contador de reprogramaciones
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0;

-- 4. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_order_history_change_type 
ON public.order_history(change_type);

CREATE INDEX IF NOT EXISTS idx_orders_original_delivery_date 
ON public.orders(original_delivery_date);

-- 5. Función para establecer fecha original automáticamente
CREATE OR REPLACE FUNCTION set_original_delivery_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_delivery_date IS NULL THEN
    NEW.original_delivery_date = NEW.delivery_date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para fecha original (solo en INSERT)
DROP TRIGGER IF EXISTS trigger_set_original_delivery_date ON public.orders;
CREATE TRIGGER trigger_set_original_delivery_date
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION set_original_delivery_date();

-- 7. Actualizar pedidos existentes que no tienen original_delivery_date
UPDATE public.orders 
SET original_delivery_date = delivery_date 
WHERE original_delivery_date IS NULL;

-- 8. Vista para consulta eficiente de pedidos retrasados
CREATE OR REPLACE VIEW delayed_orders_view AS
SELECT 
  o.id,
  o.order_number,
  o.customer_id,
  o.delivery_date,
  o.original_delivery_date,
  o.status,
  o.priority,
  o.total,
  o.reschedule_count,
  o.created_at,
  o.observations,
  c.commercial_name AS customer_name,
  c.contact_name AS customer_contact,
  c.locality AS customer_locality,
  c.phone AS customer_phone,
  c.latitude AS customer_latitude,
  c.longitude AS customer_longitude,
  CURRENT_DATE - o.delivery_date AS days_delayed,
  CASE 
    WHEN CURRENT_DATE - o.delivery_date > 7 THEN 'critical'
    WHEN CURRENT_DATE - o.delivery_date > 3 THEN 'warning'
    ELSE 'minor'
  END AS delay_severity
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.delivery_date < CURRENT_DATE
  AND o.status = 'PENDIENTE_ENTREGA'
  AND NOT EXISTS (
    SELECT 1 FROM route_orders ro
    JOIN routes r ON ro.route_id = r.id
    WHERE ro.order_id = o.id
    AND r.status IN ('PLANIFICADO', 'EN_CURSO')
  );

-- 9. Función para reprogramar pedido con historial
CREATE OR REPLACE FUNCTION reschedule_order(
  p_order_id UUID,
  p_new_delivery_date DATE,
  p_reason TEXT,
  p_changed_by UUID,
  p_increase_priority BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
  v_old_date DATE;
  v_old_priority order_priority;
  v_new_priority order_priority;
  v_order_number TEXT;
BEGIN
  -- Obtener datos actuales del pedido
  SELECT delivery_date, priority, order_number 
  INTO v_old_date, v_old_priority, v_order_number
  FROM orders 
  WHERE id = p_order_id;
  
  IF v_old_date IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Pedido no encontrado');
  END IF;
  
  -- Calcular nueva prioridad si se solicita aumento
  v_new_priority := v_old_priority;
  IF p_increase_priority THEN
    v_new_priority := CASE v_old_priority
      WHEN 'baja' THEN 'normal'
      WHEN 'normal' THEN 'media'
      WHEN 'media' THEN 'alta'
      WHEN 'alta' THEN 'urgente'
      ELSE 'urgente'
    END;
  END IF;
  
  -- Actualizar pedido
  UPDATE orders 
  SET 
    delivery_date = p_new_delivery_date,
    priority = v_new_priority,
    reschedule_count = COALESCE(reschedule_count, 0) + 1,
    updated_at = NOW()
  WHERE id = p_order_id;
  
  -- Registrar en historial
  INSERT INTO order_history (
    order_id,
    change_type,
    previous_delivery_date,
    new_delivery_date,
    previous_status,
    new_status,
    changed_by,
    change_reason
  ) VALUES (
    p_order_id,
    'DELIVERY_DATE_CHANGE',
    v_old_date,
    p_new_delivery_date,
    'PENDIENTE_ENTREGA',
    'PENDIENTE_ENTREGA',
    p_changed_by,
    p_reason
  );
  
  -- Si cambió la prioridad, registrar también
  IF v_new_priority != v_old_priority THEN
    INSERT INTO order_history (
      order_id,
      change_type,
      previous_status,
      new_status,
      changed_by,
      change_reason
    ) VALUES (
      p_order_id,
      'PRIORITY_CHANGE',
      'PENDIENTE_ENTREGA',
      'PENDIENTE_ENTREGA',
      p_changed_by,
      'Aumento automático de prioridad por reprogramación'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'order_number', v_order_number,
    'old_date', v_old_date,
    'new_date', p_new_delivery_date,
    'old_priority', v_old_priority,
    'new_priority', v_new_priority
  );
END;
$$ LANGUAGE plpgsql;



