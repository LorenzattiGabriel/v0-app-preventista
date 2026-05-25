-- =====================================================
-- Migration: normalize_supplier_provinces
-- =====================================================
-- Normaliza los valores existentes de suppliers.province al formato canónico
-- (Title Case con tildes) usado por lib/constants/argentina.ts.
--
-- Estado actual de los datos (al momento de generar esta migración):
--   CÓRDOBA: 69
--   SANTA FE: 2
--   BUENOS AIRES: 1
--   CIUDAD DE BUENOS AIRES: 1
--
-- Correr en Supabase SQL Editor.
-- =====================================================

UPDATE suppliers SET province = 'Córdoba'                          WHERE province = 'CÓRDOBA';
UPDATE suppliers SET province = 'Santa Fe'                         WHERE province = 'SANTA FE';
UPDATE suppliers SET province = 'Buenos Aires'                     WHERE province = 'BUENOS AIRES';
UPDATE suppliers SET province = 'Ciudad Autónoma de Buenos Aires'  WHERE province = 'CIUDAD DE BUENOS AIRES';

-- (Opcional) si en el futuro entran nuevos uppercase, esta query te muestra cuáles:
-- SELECT DISTINCT province FROM suppliers WHERE province IS NOT NULL AND province = UPPER(province);
