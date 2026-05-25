-- =====================================================
-- Rol "supervisor_armado"
-- =====================================================
-- Es un armador con privilegios extra:
--   - Asigna/desasigna pedidos a armadores (como admin).
--   - Arma pedidos él mismo (como armador).
--   - Tiene un tablero de control read-only para ver el estado e historial
--     de los pedidos del depósito.
--
-- No es administrador: no gestiona usuarios, productos, clientes, rutas,
-- reportes ni configuración.
--
-- Correr en Supabase SQL Editor.
-- =====================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'supervisor_armado';
