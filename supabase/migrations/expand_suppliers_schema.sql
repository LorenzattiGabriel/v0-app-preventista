-- =====================================================
-- Migration: expand_suppliers_schema
-- =====================================================
-- Amplía la tabla suppliers para soportar todos los campos
-- del Excel "PROVEEDORES ALEF MAYO.xlsm".
--
-- Campos nuevos:
--   external_id      → ID interno del sistema viejo (UNIQUE para upsert)
--   fiscal_condition → MT / RI / CF / EXE
--   address          → Domicilio
--   locality         → Localidad
--   province         → Provincia
--   mobile           → Celular (phone queda para fijo)
--   credit_limit     → Límite de cuenta corriente
--   category         → Categoría (uso futuro)
--   siap_concept     → Concepto SIAP (uso futuro)
--
-- Correr en Supabase SQL Editor.
-- =====================================================

ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS external_id      TEXT,
  ADD COLUMN IF NOT EXISTS fiscal_condition TEXT,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS locality         TEXT,
  ADD COLUMN IF NOT EXISTS province         TEXT,
  ADD COLUMN IF NOT EXISTS mobile           TEXT,
  ADD COLUMN IF NOT EXISTS credit_limit     DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS category         TEXT,
  ADD COLUMN IF NOT EXISTS siap_concept     TEXT;

-- UNIQUE en external_id para upsert idempotente
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_external_id
  ON suppliers(external_id)
  WHERE external_id IS NOT NULL;

-- CHECK: fiscal_condition válido (MT=Monotributo, RI=Resp. Inscripto, CF=Cons. Final, EXE=Exento)
-- Hago DROP primero por si la re-corrés
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_fiscal_condition_check;
ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_fiscal_condition_check
  CHECK (fiscal_condition IS NULL OR fiscal_condition IN ('MT', 'RI', 'CF', 'EXE'));

COMMENT ON COLUMN suppliers.external_id IS
  'ID del sistema externo de origen. UNIQUE → usado como clave de upsert en imports.';
COMMENT ON COLUMN suppliers.fiscal_condition IS
  'MT=Monotributo, RI=Responsable Inscripto, CF=Consumidor Final, EXE=Exento.';
COMMENT ON COLUMN suppliers.mobile IS
  'Teléfono celular. phone queda para línea fija.';
COMMENT ON COLUMN suppliers.credit_limit IS
  'Límite de cuenta corriente con el proveedor (uso futuro).';
