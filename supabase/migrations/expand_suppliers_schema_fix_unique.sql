-- =====================================================
-- Fix: reemplazar UNIQUE parcial por UNIQUE constraint normal en suppliers.external_id
-- =====================================================
-- El índice parcial (con WHERE) no es aceptado como target de ON CONFLICT
-- por PostgREST/supabase-js, lo que rompe el upsert del script de import.
--
-- Solución: drop del índice parcial y crear una UNIQUE constraint sobre la
-- columna. Postgres permite múltiples NULLs en UNIQUE constraints, así que
-- no hace falta filtrar.
-- =====================================================

DROP INDEX IF EXISTS uq_suppliers_external_id;

ALTER TABLE suppliers
  DROP CONSTRAINT IF EXISTS suppliers_external_id_key;

ALTER TABLE suppliers
  ADD CONSTRAINT suppliers_external_id_key UNIQUE (external_id);
