-- ============================================
-- ⚠️ DEPRECATED - DO NOT USE
-- ============================================
-- This script inserted users with plain text passwords directly into
-- the profiles table. This approach is INSECURE and has been replaced.
-- 
-- For creating new users, use the API endpoint:
--   POST /api/admin/users/create
-- 
-- Or use the admin panel:
--   /admin/usuarios
-- 
-- These methods use Supabase Auth which properly hashes passwords
-- using bcrypt in the auth.users table.
-- 
-- For development/testing, use:
--   scripts/create-mock-users.js (creates users via Supabase Auth)
-- ============================================

-- DEPRECATED: All INSERT statements below have been commented out
-- as they used plain text passwords

/*
-- ADMINISTRATIVOS (2 users)
INSERT INTO public.profiles (id, email, full_name, role, phone, pwd, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'admin@distribuidora.com', 'Carlos Administrador', 'administrativo', '351-6660001', 'admin123', true),
  ('10000000-0000-0000-0000-000000000002', 'admin2@distribuidora.com', 'María Supervisora', 'administrativo', '351-6660002', 'admin123', true);

-- ... rest of deprecated INSERT statements
*/
