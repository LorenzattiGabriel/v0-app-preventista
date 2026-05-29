-- ============================================================================
-- Función transaccional para cancelar una ruta y devolver sus pedidos
-- ============================================================================
-- Al crear una ruta los pedidos pasan a EN_REPARTICION. Si la ruta se cancela,
-- los pedidos vuelven a PENDIENTE_ENTREGA (su estado previo a la ruta) para
-- poder reasignarlos a otra ruta.
--
-- Solo se puede cancelar una ruta PLANIFICADO (antes de iniciarse). Si el
-- repartidor ya la inició (EN_CURSO) no se puede cancelar: no hay vuelta atrás.
--
-- Todo corre en una sola transacción (plpgsql): si algo falla, se revierte.
-- La ruta queda en CANCELADO (se conserva para histórico); como el guard de
-- duplicados solo mira rutas PLANIFICADO/EN_CURSO, los pedidos vueltos a
-- pendiente quedan disponibles de nuevo.
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_route(
  p_route_id     UUID,
  p_cancelled_by UUID
)
RETURNS INTEGER  -- cantidad de pedidos devueltos a PENDIENTE_ENTREGA
LANGUAGE plpgsql
AS $$
DECLARE
  v_status   route_status;
  v_reverted INTEGER := 0;
  v_order    RECORD;
BEGIN
  SELECT status INTO v_status FROM public.routes WHERE id = p_route_id FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Ruta no encontrada';
  END IF;

  IF v_status <> 'PLANIFICADO' THEN
    RAISE EXCEPTION 'Solo se puede cancelar una ruta antes de iniciarse (PLANIFICADO). Estado actual: %', v_status;
  END IF;

  -- Devolver a PENDIENTE_ENTREGA los pedidos de la ruta que todavía no se entregaron
  FOR v_order IN
    SELECT o.id, o.status AS prev_status
    FROM public.route_orders ro
    JOIN public.orders o ON o.id = ro.order_id
    WHERE ro.route_id = p_route_id
      AND o.status = 'EN_REPARTICION'
  LOOP
    UPDATE public.orders
    SET status = 'PENDIENTE_ENTREGA',
        delivery_started_at = NULL,
        delivered_by = NULL
    WHERE id = v_order.id;

    INSERT INTO public.order_history (order_id, previous_status, new_status, changed_by, change_reason)
    VALUES (v_order.id, v_order.prev_status, 'PENDIENTE_ENTREGA', p_cancelled_by,
            'Ruta cancelada — pedido devuelto a pendiente de entrega');

    v_reverted := v_reverted + 1;
  END LOOP;

  -- Cancelar la ruta (se conserva con sus route_orders para histórico)
  UPDATE public.routes
  SET status = 'CANCELADO'
  WHERE id = p_route_id;

  RETURN v_reverted;
END;
$$;
