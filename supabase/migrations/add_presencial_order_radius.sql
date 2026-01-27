-- Migration: Add presencial order radius configuration
-- This allows admin to configure the maximum distance a preventista must be from a customer
-- to create a "presencial" (in-person) order

-- Add column to depot_configuration table
ALTER TABLE public.depot_configuration 
  ADD COLUMN IF NOT EXISTS presencial_order_radius_meters INTEGER DEFAULT 600;

-- Add comment explaining the column
COMMENT ON COLUMN public.depot_configuration.presencial_order_radius_meters IS 
  'Maximum distance in meters that a preventista must be from a customer to create a presencial order. Default: 600m';

-- Update existing records to have the default value
UPDATE public.depot_configuration 
SET presencial_order_radius_meters = 600 
WHERE presencial_order_radius_meters IS NULL;

