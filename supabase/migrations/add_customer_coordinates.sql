-- Migration: Add latitude and longitude columns to customers table
-- Description: Adds geolocation coordinates for customer addresses
-- Author: AI Assistant
-- Date: 2024-11-24

-- Add latitude and longitude columns if they don't exist
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add comments for documentation
COMMENT ON COLUMN customers.latitude IS 'Latitud de la dirección del cliente (geocodificada desde Google Maps)';
COMMENT ON COLUMN customers.longitude IS 'Longitud de la dirección del cliente (geocodificada desde Google Maps)';

-- Create an index for geospatial queries (useful for route optimization)
CREATE INDEX IF NOT EXISTS idx_customers_coordinates 
ON customers (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a check constraint to ensure valid coordinate ranges
ALTER TABLE customers
ADD CONSTRAINT chk_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE customers
ADD CONSTRAINT chk_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

COMMENT ON CONSTRAINT chk_latitude_range ON customers IS 'Latitude must be between -90 and 90 degrees';
COMMENT ON CONSTRAINT chk_longitude_range ON customers IS 'Longitude must be between -180 and 180 degrees';

