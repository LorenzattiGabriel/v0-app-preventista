-- Agregar columna google_maps_url a la tabla routes
-- Esta columna almacenará el link directo a Google Maps para la ruta optimizada

ALTER TABLE routes
ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

-- Comentario en la columna
COMMENT ON COLUMN routes.google_maps_url IS 'URL directa a Google Maps con la ruta optimizada completa';

-- Migrar datos existentes del campo optimized_route al nuevo campo
-- (Solo si existen rutas con el link en optimized_route->googleMapsUrl)
UPDATE routes
SET google_maps_url = (optimized_route->>'googleMapsUrl')
WHERE optimized_route IS NOT NULL 
  AND optimized_route->>'googleMapsUrl' IS NOT NULL
  AND google_maps_url IS NULL;

