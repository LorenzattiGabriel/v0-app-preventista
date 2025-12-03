-- ============================================
-- Add Delivery Photo Evidence System
-- ============================================

-- Remove old delivery code system
ALTER TABLE orders
DROP COLUMN IF EXISTS delivery_code;

-- Add new delivery evidence fields
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT,
ADD COLUMN IF NOT EXISTS received_by_name TEXT;

COMMENT ON COLUMN orders.delivery_photo_url IS 'URL de la foto de evidencia de entrega guardada en Supabase Storage bucket "delivery"';
COMMENT ON COLUMN orders.received_by_name IS 'Nombre de la persona que recibió el pedido';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_delivery_photo ON orders(delivery_photo_url);

-- ============================================
-- Supabase Storage Bucket Configuration
-- ============================================
-- IMPORTANTE: Ejecutar esto en Supabase Storage:
-- 
-- 1. Crear bucket "delivery" con configuración:
--    - Public: false (privado)
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- 2. Configurar RLS (Row Level Security) para el bucket:
--
-- Policy 1: Allow repartidor to upload
-- CREATE POLICY "Repartidores can upload delivery photos"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'delivery' AND
--   auth.jwt() ->> 'role' = 'repartidor'
-- );
--
-- Policy 2: Allow authenticated users to read
-- CREATE POLICY "Authenticated users can view delivery photos"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'delivery');
--
-- ============================================

