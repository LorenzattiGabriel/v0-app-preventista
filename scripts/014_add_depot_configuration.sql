-- Create depot_configuration table to store warehouse/distribution center location
CREATE TABLE IF NOT EXISTS public.depot_configuration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'Distribuidora Principal',
  
  -- Address fields
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  floor_apt TEXT,
  locality TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  
  -- Coordinates (automatically geocoded from address)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- Tolerance radius in meters for check-in/check-out validation
  radius_meters INTEGER DEFAULT 100,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Only allow one active depot at a time
CREATE UNIQUE INDEX idx_depot_active ON public.depot_configuration (is_active) WHERE is_active = true;

-- Add depot reference to routes table
ALTER TABLE public.routes 
  ADD COLUMN IF NOT EXISTS depot_id UUID REFERENCES public.depot_configuration(id),
  ADD COLUMN IF NOT EXISTS start_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS start_longitude DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS end_latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS end_longitude DECIMAL(11, 8);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_routes_depot ON public.routes(depot_id);
CREATE INDEX IF NOT EXISTS idx_depot_coordinates ON public.depot_configuration(latitude, longitude);

-- Add trigger for updated_at
CREATE TRIGGER update_depot_configuration_updated_at 
  BEFORE UPDATE ON public.depot_configuration
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default depot (Córdoba, Argentina - adjust as needed)
INSERT INTO public.depot_configuration (
  name,
  street,
  street_number,
  locality,
  province,
  postal_code,
  latitude,
  longitude,
  radius_meters,
  is_active
) VALUES (
  'Distribuidora Central',
  'Av. Colón',
  '123',
  'Córdoba',
  'Córdoba',
  'X5000',
  -31.4201,
  -64.1888,
  100,
  true
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.depot_configuration IS 'Configuration for warehouse/distribution center location - start and end point for all routes';
COMMENT ON COLUMN public.depot_configuration.radius_meters IS 'Tolerance radius in meters for driver check-in/check-out validation';

