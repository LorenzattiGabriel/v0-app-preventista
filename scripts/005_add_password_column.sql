-- Add pwd column to profiles for simplified authentication
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pwd TEXT;

-- Update existing profiles with default password
UPDATE public.profiles SET pwd = 'admin123' WHERE pwd IS NULL;
