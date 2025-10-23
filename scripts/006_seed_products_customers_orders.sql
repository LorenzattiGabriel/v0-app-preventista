-- ============================================
-- SEED PRODUCTS, CUSTOMERS, AND ORDERS
-- ============================================

-- First, ensure we have zones
INSERT INTO public.zones (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'zona_1', 'Zona 1 - Centro y alrededores'),
  ('22222222-2222-2222-2222-222222222222', 'zona_2', 'Zona 2 - Norte'),
  ('33333333-3333-3333-3333-333333333333', 'zona_3', 'Zona 3 - Sur')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INSERT PRODUCTS
-- Updated to handle duplicate codes by updating existing products
-- ============================================

INSERT INTO public.products (id, code, name, brand, category, base_price, wholesale_price, retail_price, current_stock, is_active) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'PROD-0001', 'Aceite Girasol 900ml', 'Cocinero', 'Aceites', 1250.00, 1200.00, 1250.00, 100, true),
  ('a2222222-2222-2222-2222-222222222222', 'PROD-0002', 'Arroz Largo Fino 1kg', 'Gallo Oro', 'Granos', 890.00, 850.00, 890.00, 200, true),
  ('a3333333-3333-3333-3333-333333333333', 'PROD-0003', 'Azúcar 1kg', 'Ledesma', 'Endulzantes', 780.00, 750.00, 780.00, 150, true),
  ('a4444444-4444-4444-4444-444444444444', 'PROD-0004', 'Fideos Tirabuzón 500g', 'Matarazzo', 'Pastas', 650.00, 620.00, 650.00, 250, true),
  ('a5555555-5555-5555-5555-555555555555', 'PROD-0005', 'Harina 0000 1kg', 'Pureza', 'Harinas', 520.00, 500.00, 520.00, 180, true),
  ('a6666666-6666-6666-6666-666666666666', 'PROD-0006', 'Sal Fina 500g', 'Celusal', 'Condimentos', 280.00, 260.00, 280.00, 300, true),
  ('a7777777-7777-7777-7777-777777777777', 'PROD-0007', 'Yerba Mate 1kg', 'Playadito', 'Infusiones', 1890.00, 1800.00, 1890.00, 90, true),
  ('a8888888-8888-8888-8888-888888888888', 'PROD-0008', 'Café Molido 250g', 'La Virginia', 'Infusiones', 2150.00, 2050.00, 2150.00, 80, true),
  ('a9999999-9999-9999-9999-999999999999', 'PROD-0009', 'Polenta 500g', 'Presto Pronta', 'Granos', 680.00, 650.00, 680.00, 140, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'PROD-0010', 'Lentejas 500g', 'Arcor', 'Granos', 850.00, 820.00, 850.00, 120, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  base_price = EXCLUDED.base_price,
  wholesale_price = EXCLUDED.wholesale_price,
  retail_price = EXCLUDED.retail_price,
  current_stock = EXCLUDED.current_stock,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- INSERT CUSTOMERS
-- ============================================

INSERT INTO public.customers (
  id, code, commercial_name, contact_name, phone, 
  street, street_number, locality, province, 
  customer_type, zone_id, is_active
) VALUES
  ('c1111111-1111-1111-1111-111111111111', 'CLI-0001', 'Almacén Don José', 'José García', '351-5551234', 
   'San Martín', '450', 'Córdoba', 'Córdoba', 
   'mayorista', '11111111-1111-1111-1111-111111111111', true),
  
  ('c2222222-2222-2222-2222-222222222222', 'CLI-0002', 'Despensa La Esquina', 'María López', '351-5552345', 
   'Rivadavia', '780', 'Córdoba', 'Córdoba', 
   'minorista', '11111111-1111-1111-1111-111111111111', true),
  
  ('c3333333-3333-3333-3333-333333333333', 'CLI-0003', 'Super Familia Rodríguez', 'Carlos Rodríguez', '351-5553456', 
   'Av. Colón', '1520', 'Córdoba', 'Córdoba', 
   'mayorista', '22222222-2222-2222-2222-222222222222', true),
  
  ('c4444444-4444-4444-4444-444444444444', 'CLI-0004', 'Kiosco El Rápido', 'Ana Martínez', '351-5554567', 
   '27 de Abril', '890', 'Córdoba', 'Córdoba', 
   'minorista', '22222222-2222-2222-2222-222222222222', true),
  
  ('c5555555-5555-5555-5555-555555555555', 'CLI-0005', 'Minimercado Los Andes', 'Pedro Fernández', '351-5555678', 
   'Duarte Quirós', '2340', 'Córdoba', 'Córdoba', 
   'mayorista', '33333333-3333-3333-3333-333333333333', true),
  
  ('c6666666-6666-6666-6666-666666666666', 'CLI-0006', 'Almacén Central', 'Laura Gómez', '351-5556789', 
   'Independencia', '560', 'Córdoba', 'Córdoba', 
   'minorista', '11111111-1111-1111-1111-111111111111', true),
  
  ('c7777777-7777-7777-7777-777777777777', 'CLI-0007', 'Despensa San Vicente', 'Roberto Díaz', '351-5557890', 
   'Av. Vélez Sarsfield', '3400', 'Córdoba', 'Córdoba', 
   'minorista', '33333333-3333-3333-3333-333333333333', true),
  
  ('c8888888-8888-8888-8888-888888888888', 'CLI-0008', 'Distribuidora El Progreso', 'Silvia Torres', '351-5558901', 
   'Bv. San Juan', '1890', 'Córdoba', 'Córdoba', 
   'mayorista', '22222222-2222-2222-2222-222222222222', true)
ON CONFLICT (code) DO UPDATE SET
  commercial_name = EXCLUDED.commercial_name,
  contact_name = EXCLUDED.contact_name,
  phone = EXCLUDED.phone,
  street = EXCLUDED.street,
  street_number = EXCLUDED.street_number,
  locality = EXCLUDED.locality,
  province = EXCLUDED.province,
  customer_type = EXCLUDED.customer_type,
  zone_id = EXCLUDED.zone_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- INSERT ORDERS
-- ============================================

-- Order 1: PENDIENTE_ARMADO
INSERT INTO public.orders (
  id, order_number, customer_id, order_date, delivery_date, 
  priority, order_type, status, subtotal, total
) VALUES (
  '01111111-1111-1111-1111-111111111111', 
  'PED-0001', 
  'c1111111-1111-1111-1111-111111111111', 
  '2025-10-23', 
  '2025-10-24', 
  'alta', 
  'presencial', 
  'PENDIENTE_ARMADO', 
  15680.00, 
  15680.00
) ON CONFLICT (order_number) DO NOTHING;

-- Order 1 Items
INSERT INTO public.order_items (order_id, product_id, quantity_requested, unit_price, discount, subtotal) VALUES
  ('01111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 6, 1250.00, 0, 7500.00),
  ('01111111-1111-1111-1111-111111111111', 'a7777777-7777-7777-7777-777777777777', 4, 1890.00, 0, 7560.00);

-- Order 2: PENDIENTE_ENTREGA (already assembled)
INSERT INTO public.orders (
  id, order_number, customer_id, order_date, delivery_date, 
  priority, order_type, status, subtotal, total,
  assembly_completed_at
) VALUES (
  '02222222-2222-2222-2222-222222222222', 
  'PED-0002', 
  'c3333333-3333-3333-3333-333333333333', 
  '2025-10-23', 
  '2025-10-24', 
  'normal', 
  'web', 
  'PENDIENTE_ENTREGA', 
  8920.00, 
  8920.00,
  '2025-10-23 14:30:00'
) ON CONFLICT (order_number) DO NOTHING;

-- Order 2 Items
INSERT INTO public.order_items (order_id, product_id, quantity_requested, quantity_assembled, unit_price, discount, subtotal) VALUES
  ('02222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 10, 10, 890.00, 0, 8900.00);

-- Order 3: EN_REPARTICION
INSERT INTO public.orders (
  id, order_number, customer_id, order_date, delivery_date, 
  priority, order_type, status, subtotal, total,
  assembly_completed_at, delivery_started_at
) VALUES (
  '03333333-3333-3333-3333-333333333333', 
  'PED-0003', 
  'c2222222-2222-2222-2222-222222222222', 
  '2025-10-23', 
  '2025-10-24', 
  'media', 
  'presencial', 
  'EN_REPARTICION', 
  5640.00, 
  5640.00,
  '2025-10-23 15:00:00',
  '2025-10-24 08:00:00'
) ON CONFLICT (order_number) DO NOTHING;

-- Order 3 Items
INSERT INTO public.order_items (order_id, product_id, quantity_requested, quantity_assembled, quantity_delivered, unit_price, discount, subtotal) VALUES
  ('03333333-3333-3333-3333-333333333333', 'a4444444-4444-4444-4444-444444444444', 8, 8, 8, 650.00, 0, 5200.00);

-- Order 4: ENTREGADO
INSERT INTO public.orders (
  id, order_number, customer_id, order_date, delivery_date, 
  priority, order_type, status, subtotal, total,
  assembly_completed_at, delivery_started_at, delivered_at
) VALUES (
  '04444444-4444-4444-4444-444444444444', 
  'PED-0004', 
  'c6666666-6666-6666-6666-666666666666', 
  '2025-10-22', 
  '2025-10-23', 
  'normal', 
  'web', 
  'ENTREGADO', 
  12350.00, 
  12350.00,
  '2025-10-22 16:00:00',
  '2025-10-23 09:00:00',
  '2025-10-23 16:45:00'
) ON CONFLICT (order_number) DO NOTHING;

-- Order 4 Items
INSERT INTO public.order_items (order_id, product_id, quantity_requested, quantity_assembled, quantity_delivered, unit_price, discount, subtotal) VALUES
  ('04444444-4444-4444-4444-444444444444', 'a8888888-8888-8888-8888-888888888888', 5, 5, 5, 2150.00, 0, 10750.00),
  ('04444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333', 2, 2, 2, 780.00, 0, 1560.00);

-- Order 4 Rating
INSERT INTO public.order_ratings (order_id, customer_id, rating, comments) VALUES
  ('04444444-4444-4444-4444-444444444444', 'c6666666-6666-6666-6666-666666666666', 5, 'Excelente servicio')
ON CONFLICT (order_id) DO NOTHING;
