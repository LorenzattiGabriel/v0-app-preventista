-- ============================================
-- SEED DATA
-- ============================================

-- Insert default zones
INSERT INTO public.zones (name, description) VALUES
  ('Zona Norte', 'Zona norte de la ciudad'),
  ('Zona Sur', 'Zona sur de la ciudad'),
  ('Zona Este', 'Zona este de la ciudad'),
  ('Zona Oeste', 'Zona oeste de la ciudad'),
  ('Centro', 'Centro de la ciudad');

-- Insert sample products
INSERT INTO public.products (code, name, brand, category, base_price, wholesale_price, retail_price, current_stock) VALUES
  ('PROD-0001', 'Aceite de Oliva 500ml', 'La Española', 'Aceites', 850.00, 800.00, 900.00, 100),
  ('PROD-0002', 'Arroz Largo Fino 1kg', 'Gallo', 'Granos', 450.00, 420.00, 480.00, 200),
  ('PROD-0003', 'Azúcar 1kg', 'Ledesma', 'Endulzantes', 380.00, 350.00, 400.00, 150),
  ('PROD-0004', 'Café Molido 250g', 'Cabrales', 'Infusiones', 1200.00, 1100.00, 1300.00, 80),
  ('PROD-0005', 'Fideos Secos 500g', 'Matarazzo', 'Pastas', 320.00, 300.00, 350.00, 250),
  ('PROD-0006', 'Harina 0000 1kg', 'Pureza', 'Harinas', 280.00, 260.00, 300.00, 180),
  ('PROD-0007', 'Leche Entera 1L', 'La Serenísima', 'Lácteos', 520.00, 480.00, 550.00, 120),
  ('PROD-0008', 'Yerba Mate 1kg', 'Rosamonte', 'Infusiones', 1800.00, 1650.00, 1900.00, 90),
  ('PROD-0009', 'Sal Fina 1kg', 'Celusal', 'Condimentos', 180.00, 160.00, 200.00, 300),
  ('PROD-0010', 'Tomate Triturado 500g', 'Arcor', 'Conservas', 420.00, 390.00, 450.00, 140);
