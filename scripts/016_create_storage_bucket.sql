-- 1. Ensure the delivery bucket is PUBLIC
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery', 'delivery', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Drop existing policies to avoid conflicts
-- We check for both the names I suggested AND the names you currently have
DO $$
BEGIN
    -- Drop "Public Access" variants
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Public can view delivery photos') THEN
        DROP POLICY "Public can view delivery photos" ON storage.objects;
    END IF;

    -- Drop "Authenticated Upload" variants
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Authenticated can upload delivery photos') THEN
        DROP POLICY "Authenticated can upload delivery photos" ON storage.objects;
    END IF;
END$$;

-- 3. Re-create policies with clear standard names

-- Allow public read access (SELECT) for everyone
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'delivery' );

-- Allow authenticated users to upload (INSERT)
CREATE POLICY "Authenticated Users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'delivery' );

-- Ensure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
