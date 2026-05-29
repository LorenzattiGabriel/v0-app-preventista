-- ============================================================================
-- Función transaccional para crear una ruta con sus paradas de forma atómica
-- ============================================================================
-- Antes, el cliente insertaba la ruta, luego cada route_orders y actualizaba el
-- estado de cada pedido de a uno, SIN transacción. Si fallaba a la mitad quedaba
-- una ruta parcial (paradas incompletas, pedidos a medio actualizar) imposible
-- de reintentar. Esta función corre todo dentro de la transacción implícita de
-- plpgsql: si algo falla, se revierte TODO.
--
-- El route_code se genera en el cliente (con generate_route_code) y se pasa acá.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_route_with_orders(
  p_route_code           TEXT,
  p_driver_id            UUID,
  p_zone_id              UUID,
  p_scheduled_date       DATE,
  p_scheduled_start_time TIME,
  p_scheduled_end_time   TIME,
  p_total_distance       DECIMAL,
  p_estimated_duration   INTEGER,
  p_google_maps_url      TEXT,
  p_optimized_route      JSONB,
  p_created_by           UUID,
  p_order_ids            UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_route_id UUID;
  v_order_id UUID;
  v_idx      INTEGER := 0;
BEGIN
  IF p_order_ids IS NULL OR array_length(p_order_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'La ruta debe tener al menos un pedido';
  END IF;

  -- 0) Lockear los pedidos para serializar creaciones concurrentes (cierra el TOCTOU).
  --    El ORDER BY id da un orden de lock consistente => evita deadlocks.
  PERFORM id
  FROM public.orders
  WHERE id = ANY(p_order_ids)
  ORDER BY id
  FOR UPDATE;

  -- 0.1) Guard atómico: ningún pedido puede estar ya en una ruta activa.
  IF EXISTS (
    SELECT 1
    FROM public.route_orders ro
    JOIN public.routes r ON r.id = ro.route_id
    WHERE ro.order_id = ANY(p_order_ids)
      AND r.status IN ('PLANIFICADO', 'EN_CURSO')
  ) THEN
    RAISE EXCEPTION 'Uno o más pedidos ya están en una ruta activa';
  END IF;

  -- 1) Insertar la ruta
  INSERT INTO public.routes (
    route_code, driver_id, zone_id, scheduled_date,
    scheduled_start_time, scheduled_end_time, total_distance,
    estimated_duration, google_maps_url, optimized_route, status, created_by
  ) VALUES (
    p_route_code, p_driver_id, p_zone_id, p_scheduled_date,
    p_scheduled_start_time, p_scheduled_end_time, p_total_distance,
    p_estimated_duration, p_google_maps_url, p_optimized_route, 'PLANIFICADO', p_created_by
  )
  RETURNING id INTO v_route_id;

  -- 2) Insertar las paradas en el orden recibido (delivery_order = posición)
  FOREACH v_order_id IN ARRAY p_order_ids
  LOOP
    v_idx := v_idx + 1;
    INSERT INTO public.route_orders (route_id, order_id, delivery_order)
    VALUES (v_route_id, v_order_id, v_idx);
  END LOOP;

  -- 3) Marcar los pedidos como EN_REPARTICION (asignados a la ruta)
  UPDATE public.orders
  SET status = 'EN_REPARTICION'
  WHERE id = ANY(p_order_ids);

  RETURN v_route_id;
END;
$$;
