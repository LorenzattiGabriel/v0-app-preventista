-- ============================================
-- ⚠️ DEPRECATED - DO NOT USE
-- ============================================
-- This script was part of an older authentication system that stored
-- passwords in plain text. This is a SECURITY RISK.
-- 
-- The application now uses Supabase Auth which properly hashes passwords
-- using bcrypt in the auth.users table.
-- 
-- See: scripts/015_remove_legacy_pwd_column.sql for cleanup
-- ============================================

-- DEPRECATED: This column should be removed
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pwd TEXT;

-- DEPRECATED: Never store passwords in plain text
-- UPDATE public.profiles SET pwd = 'admin123' WHERE pwd IS NULL;
