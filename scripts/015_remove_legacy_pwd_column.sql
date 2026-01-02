-- ============================================
-- MIGRATION: Remove legacy pwd column from profiles
-- ============================================
-- This column was used in an older authentication system.
-- Now we use Supabase Auth which stores passwords securely
-- in auth.users table with bcrypt hashing.
-- ============================================

-- Remove the legacy pwd column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS pwd;

-- Add comment explaining the authentication system
COMMENT ON TABLE public.profiles IS 'User profiles linked to auth.users. Authentication is handled by Supabase Auth - passwords are stored securely in auth.users table, not here.';

