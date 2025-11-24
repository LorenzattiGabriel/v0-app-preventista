-- Migration: Add unique zones from customer data
-- Description: Insert 6 unique zones extracted from customer list (removing duplicates)
-- Author: AI Assistant
-- Date: 2024-11-24

-- Insert zones only if they don't already exist (by name)
-- Using INSERT ... WHERE NOT EXISTS to avoid duplicates
INSERT INTO zones (name, description, is_active)
SELECT 'CLIENTES SANTA ROSA', 'Zona de entrega: CLIENTES SANTA ROSA', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'CLIENTES SANTA ROSA');

INSERT INTO zones (name, description, is_active)
SELECT 'CLIENTES VF-LA PARA-MARULL', 'Zona de entrega: CLIENTES VF-LA PARA-MARULL', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'CLIENTES VF-LA PARA-MARULL');

INSERT INTO zones (name, description, is_active)
SELECT 'CLIENTES LP-LAS ARRIAS-SEB ELCANO', 'Zona de entrega: CLIENTES LP-LAS ARRIAS-SEB ELCANO', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'CLIENTES LP-LAS ARRIAS-SEB ELCANO');

INSERT INTO zones (name, description, is_active)
SELECT 'CLIENTES LA PUERTA-DIEGO DE ROJAS', 'Zona de entrega: CLIENTES LA PUERTA-DIEGO DE ROJAS', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'CLIENTES LA PUERTA-DIEGO DE ROJAS');

INSERT INTO zones (name, description, is_active)
SELECT 'CLIENTES - LA DORMIDA- RIO SECO - ZONA NORTE 2', 'Zona de entrega: CLIENTES - LA DORMIDA- RIO SECO - ZONA NORTE 2', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'CLIENTES - LA DORMIDA- RIO SECO - ZONA NORTE 2');

INSERT INTO zones (name, description, is_active)
SELECT 'VILLA DE ROSARIO- RIO PRIMERO- LUQUE', 'Zona de entrega: VILLA DE ROSARIO- RIO PRIMERO- LUQUE', true
WHERE NOT EXISTS (SELECT 1 FROM zones WHERE name = 'VILLA DE ROSARIO- RIO PRIMERO- LUQUE');

-- Verify insertion
SELECT 
  id,
  name,
  is_active,
  created_at
FROM zones
WHERE name IN (
  'CLIENTES SANTA ROSA',
  'CLIENTES VF-LA PARA-MARULL',
  'CLIENTES LP-LAS ARRIAS-SEB ELCANO',
  'CLIENTES LA PUERTA-DIEGO DE ROJAS',
  'CLIENTES - LA DORMIDA- RIO SECO - ZONA NORTE 2',
  'VILLA DE ROSARIO- RIO PRIMERO- LUQUE'
)
ORDER BY name;

