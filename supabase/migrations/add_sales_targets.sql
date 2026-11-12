-- =====================================================
-- OBJETIVOS DE VENTA (mensuales, por canal, generales o individuales)
-- =====================================================
-- channel: 'venta_directa' (ventas locales) o 'preventista' (canal de
-- reparto, el resto de los pedidos). scope 'general' = objetivo del canal
-- completo (assigned_to NULL); scope 'individual' = objetivo de un
-- preventista o vendedor de venta directa puntual (assigned_to = su id).
-- El admin lo administra desde /admin/objetivos-venta; el preventista ve su
-- propio progreso en su dashboard.
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  period_month DATE NOT NULL, -- primer día del mes, ej. 2026-11-01
  channel TEXT NOT NULL CHECK (channel IN ('venta_directa', 'preventista')),
  scope TEXT NOT NULL DEFAULT 'general' CHECK (scope IN ('general', 'individual')),
  assigned_to UUID REFERENCES profiles(id), -- NULL si scope = 'general'
  target_amount DECIMAL(14, 2) NOT NULL CHECK (target_amount >= 0),

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT sales_targets_scope_assigned_check CHECK (
    (scope = 'general' AND assigned_to IS NULL) OR
    (scope = 'individual' AND assigned_to IS NOT NULL)
  )
);

-- A lo sumo un objetivo general por mes y canal
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_general
  ON sales_targets (period_month, channel)
  WHERE scope = 'general';

-- A lo sumo un objetivo individual por persona, mes y canal
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_targets_individual
  ON sales_targets (period_month, channel, assigned_to)
  WHERE scope = 'individual';

CREATE INDEX IF NOT EXISTS idx_sales_targets_period ON sales_targets (period_month);
CREATE INDEX IF NOT EXISTS idx_sales_targets_assigned ON sales_targets (assigned_to);

-- Reusa el trigger genérico que ya usan depot_configuration y otras tablas
-- (ver scripts/014_add_depot_configuration.sql) en vez de crear uno nuevo.
DROP TRIGGER IF EXISTS trg_sales_targets_updated_at ON sales_targets;
CREATE TRIGGER trg_sales_targets_updated_at
  BEFORE UPDATE ON sales_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS abierto, como el resto de las tablas de esta app: los permisos los
-- maneja la aplicación, no la base (ver add_route_reorder_log.sql para el
-- mismo patrón).
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_targets_authenticated_all" ON sales_targets;
CREATE POLICY "sales_targets_authenticated_all"
  ON sales_targets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE sales_targets IS 'Objetivos de venta mensuales por canal (venta_directa/preventista), generales o individuales.';
