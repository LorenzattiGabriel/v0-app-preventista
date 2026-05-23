-- =====================================================
-- MÓDULO DE EGRESOS
-- Gestión de egresos de la distribuidora (proveedores,
-- categorías fijas/variables y comprobantes opcionales).
-- =====================================================

-- 1. Categorías de egreso
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('fijo','variable')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name   ON suppliers(name);

-- 3. Egresos
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id) ON DELETE RESTRICT,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT,
  proof_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier_id);

-- 4. RLS abierto (patrón del proyecto, ver 008_disable_rls_for_simple_auth.sql)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_expense_categories" ON expense_categories;
CREATE POLICY "auth_all_expense_categories" ON expense_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_suppliers" ON suppliers;
CREATE POLICY "auth_all_suppliers" ON suppliers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_expenses" ON expenses;
CREATE POLICY "auth_all_expenses" ON expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Storage bucket público para comprobantes (PDF/img)
INSERT INTO storage.buckets (id, name, public)
VALUES ('expense-proofs', 'expense-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "auth_upload_expense_proofs" ON storage.objects;
CREATE POLICY "auth_upload_expense_proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-proofs');

DROP POLICY IF EXISTS "auth_delete_expense_proofs" ON storage.objects;
CREATE POLICY "auth_delete_expense_proofs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'expense-proofs');

DROP POLICY IF EXISTS "public_read_expense_proofs" ON storage.objects;
CREATE POLICY "public_read_expense_proofs" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'expense-proofs');

-- 6. Seeds iniciales de categorías
INSERT INTO expense_categories (name, expense_type, description) VALUES
  ('Alquiler',      'fijo',     'Alquiler de depósito/oficina'),
  ('Servicios',     'fijo',     'Luz, agua, gas, internet'),
  ('Sueldos',       'fijo',     'Sueldos del personal'),
  ('Combustible',   'variable', 'Combustible de vehículos'),
  ('Mantenimiento', 'variable', 'Reparaciones y mantenimiento'),
  ('Insumos',       'variable', 'Bolsas, etiquetas, papelería'),
  ('Impuestos',     'variable', 'IIBB, AFIP, municipales'),
  ('Otros',         'variable', 'Egresos varios')
ON CONFLICT (name) DO NOTHING;

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
CREATE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_expenses_updated_at();
