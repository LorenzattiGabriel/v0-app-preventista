-- =====================================================
-- PORTAL DE CLIENTES CON CÓDIGO DE ACCESO
-- =====================================================
-- Hasta ahora, un profile con role='cliente' se vinculaba al customer
-- matcheando por email (ver app/cliente/dashboard/page.tsx). Eso es frágil
-- (se rompe si el email del cliente cambia) y además el portal de clientes
-- pasa a loguearse con un código de acceso que el admin genera, no con
-- email+contraseña real — para eso el profile usa un email sintético
-- (cliente-<code>@portal.interno) que nunca va a coincidir con el email de
-- negocio del customer.
--
-- customer_id es el vínculo explícito: para profiles de role='cliente',
-- apunta al customer que representa.
-- =====================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

CREATE INDEX IF NOT EXISTS idx_profiles_customer_id ON profiles(customer_id);

-- A lo sumo un usuario de portal por cliente
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_customer_id_unique
  ON profiles(customer_id)
  WHERE customer_id IS NOT NULL;

COMMENT ON COLUMN profiles.customer_id IS 'Para profiles con role=cliente: el customer al que representa (login por código de acceso, no por email real).';
