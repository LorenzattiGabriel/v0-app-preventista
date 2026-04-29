-- Auditoría de cambios manuales en el orden de la hoja de ruta
-- Cada vez que el repartidor reordena un stop sobre la marcha (botón "Ir ahora"),
-- se registra acá el motivo y los valores previos para que el admin pueda ver
-- la entrega real vs la propuesta original.

CREATE TABLE IF NOT EXISTS public.route_reorder_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  previous_order INTEGER NOT NULL,
  new_order INTEGER NOT NULL,
  reason TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES public.profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_reorder_log_route_id ON public.route_reorder_log(route_id);
CREATE INDEX IF NOT EXISTS idx_route_reorder_log_changed_at ON public.route_reorder_log(changed_at);

ALTER TABLE public.route_reorder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route_reorder_log_authenticated_all"
  ON public.route_reorder_log
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
