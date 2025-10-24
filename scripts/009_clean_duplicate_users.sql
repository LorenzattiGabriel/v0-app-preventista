-- ============================================
-- CLEAN DUPLICATE USERS
-- ============================================
-- Remove duplicate users keeping only the oldest record for each email

-- First, show duplicates
DO $$ 
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as cnt
        FROM public.profiles
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % duplicate email(s)', duplicate_count;
END $$;

-- Delete duplicates, keeping only the oldest record for each email
DELETE FROM public.profiles
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
        FROM public.profiles
    ) t
    WHERE t.rn > 1
);

-- Show final count
DO $$ 
DECLARE
    final_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_count FROM public.profiles;
    RAISE NOTICE 'Total users after cleanup: %', final_count;
END $$;

-- Show remaining users by role
SELECT role, COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY role;

