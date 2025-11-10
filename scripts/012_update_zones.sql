-- ============================================
-- UPDATE ZONES
-- ============================================

-- Delete specific zones by ID
DELETE FROM public.zones
WHERE id IN (
  '172c4993-03e4-493a-a5cd-c7d7a20d2566',
  'cbf047c0-cae8-4e7f-96f7-58ea487597d7',
  '0c4fa864-b9d1-4982-a654-c58ebd20e2e2',
  '91dcac93-8e42-4acb-a145-e92fd3632d0d'
);

-- Update the name of a specific zone
UPDATE public.zones 
SET name = 'Zona Oeste', description = 'Zona Oeste de la ciudad'
WHERE id = 'd891c992-c6d6-4243-9fdc-44e1299e1d91';
