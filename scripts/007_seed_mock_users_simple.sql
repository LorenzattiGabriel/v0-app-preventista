-- ============================================
-- SEED MOCK USERS WITH SIMPLE AUTHENTICATION
-- ============================================
-- This script inserts users directly into profiles table with pwd field
-- For prototyping purposes only - bypasses Supabase Auth

-- Ensure foreign key constraint is dropped before inserting
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ADMINISTRATIVOS (2 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin@distribuidora.com', 'Carlos Administrador', 'administrativo', '351-6660001', 'admin123', true),
  ('10000000-0000-0000-0000-000000000002', 'admin2@distribuidora.com', 'María Supervisora', 'administrativo', '351-6660002', 'admin123', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  pwd = EXCLUDED.pwd,
  is_active = EXCLUDED.is_active;

-- PREVENTISTAS (3 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('20000000-0000-0000-0000-000000000001', 'preventista1@distribuidora.com', 'Juan Preventista', 'preventista', '351-6660003', 'prev123', true),
  ('20000000-0000-0000-0000-000000000002', 'preventista2@distribuidora.com', 'Laura Vendedora', 'preventista', '351-6660004', 'prev123', true),
  ('20000000-0000-0000-0000-000000000003', 'preventista3@distribuidora.com', 'Roberto Ventas', 'preventista', '351-6660005', 'prev123', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  pwd = EXCLUDED.pwd,
  is_active = EXCLUDED.is_active;

-- ENCARGADOS DE ARMADO (3 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('30000000-0000-0000-0000-000000000001', 'armado1@distribuidora.com', 'Pedro Armador', 'encargado_armado', '351-6660006', 'armado123', true),
  ('30000000-0000-0000-0000-000000000002', 'armado2@distribuidora.com', 'Ana Depósito', 'encargado_armado', '351-6660007', 'armado123', true),
  ('30000000-0000-0000-0000-000000000003', 'armado3@distribuidora.com', 'Jorge Preparador', 'encargado_armado', '351-6660008', 'armado123', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  pwd = EXCLUDED.pwd,
  is_active = EXCLUDED.is_active;

-- REPARTIDORES (4 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('40000000-0000-0000-0000-000000000001', 'repartidor1@distribuidora.com', 'Carlos Méndez', 'repartidor', '351-6661111', 'repar123', true),
  ('40000000-0000-0000-0000-000000000002', 'repartidor2@distribuidora.com', 'Roberto Díaz', 'repartidor', '351-6662222', 'repar123', true),
  ('40000000-0000-0000-0000-000000000003', 'repartidor3@distribuidora.com', 'Martín Gómez', 'repartidor', '351-6663333', 'repar123', true),
  ('40000000-0000-0000-0000-000000000004', 'repartidor4@distribuidora.com', 'Diego Transportista', 'repartidor', '351-6664444', 'repar123', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  pwd = EXCLUDED.pwd,
  is_active = EXCLUDED.is_active;

-- CLIENTES (5 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('50000000-0000-0000-0000-000000000001', 'cliente1@email.com', 'José Pérez', 'cliente', '351-5551234', 'cliente123', true),
  ('50000000-0000-0000-0000-000000000002', 'cliente2@email.com', 'María González', 'cliente', '351-5552345', 'cliente123', true),
  ('50000000-0000-0000-0000-000000000003', 'cliente3@email.com', 'Carlos Rodríguez', 'cliente', '351-5553456', 'cliente123', true),
  ('50000000-0000-0000-0000-000000000004', 'cliente4@email.com', 'Ana Martínez', 'cliente', '351-5554567', 'cliente123', true),
  ('50000000-0000-0000-0000-000000000005', 'cliente5@email.com', 'Roberto Sánchez', 'cliente', '351-5555678', 'cliente123', true)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone = EXCLUDED.phone,
  pwd = EXCLUDED.pwd,
  is_active = EXCLUDED.is_active;
