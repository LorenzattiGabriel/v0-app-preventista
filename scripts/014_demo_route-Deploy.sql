-- =================================================================
-- REALISTIC DEMO DATA SCRIPT FOR DELIVERY ROUTE
-- =================================================================
-- This script inserts a complete, realistic demo route using
-- existing customers and products. It is designed to be
-- idempotent (rerunnable without causing errors).
-- =================================================================

DO $$
DECLARE
  -- Declare variables to hold the UUIDs of created entities
  v_admin_id          UUID;
  v_driver_id         UUID;
  v_zone_id           UUID;
  v_customer_central_id UUID;
  v_customer_esquina_id UUID;
  v_product_aceite_id   UUID;
  v_product_arroz_id    UUID;
  v_order1_id         UUID;
  v_order2_id         UUID;
  v_route_id          UUID;
  v_scheduled_date    DATE := CURRENT_DATE;
  v_route_code        TEXT;
  v_unique_suffix     TEXT := substr(gen_random_uuid()::text, 1, 4); -- Suffix for uniqueness

BEGIN
  -- 1. SET PROFILE IDs
  -- Using specific UUIDs for the admin and driver for consistency.
  v_admin_id := 'ca77324d-89b9-4ddd-b37b-551c82b36856';
  v_driver_id := '212729a1-8863-4835-8083-306fe44ecf98';

  IF v_admin_id IS NULL OR v_driver_id IS NULL THEN
    RAISE EXCEPTION 'Admin or Driver ID is not set correctly.';
  END IF;
  RAISE NOTICE 'Admin ID: %', v_admin_id;
  RAISE NOTICE 'Driver ID: %', v_driver_id;

  -- 2. GET EXISTING ZONE ID
  -- The script will use 'Zona Centro' for the demo route, as it matches the customers.
  SELECT id INTO v_zone_id FROM public.zones WHERE name = 'Zona Centro' LIMIT 1;

  IF v_zone_id IS NULL THEN
      RAISE EXCEPTION 'Zone "Zona Centro" not found. Please ensure it exists in the database.';
  END IF;
  RAISE NOTICE 'Zone ID: %', v_zone_id;

  -- 3. GET CUSTOMER IDs (assuming they exist from your provided data)
  SELECT id INTO v_customer_central_id FROM public.customers WHERE code = 'CLI-0006'; -- Almacén Central
  SELECT id INTO v_customer_esquina_id FROM public.customers WHERE code = 'CLI-0002'; -- Despensa La Esquina

  RAISE NOTICE 'Customer "Almacén Central" ID: %', v_customer_central_id;
  RAISE NOTICE 'Customer "Despensa La Esquina" ID: %', v_customer_esquina_id;

  -- 4. GET PRODUCT IDs (assuming they exist from your provided data)
  SELECT id INTO v_product_aceite_id FROM public.products WHERE code = 'PROD-0001'; -- Aceite de Oliva 500ml
  SELECT id INTO v_product_arroz_id FROM public.products WHERE code = 'PROD-0002';  -- Arroz Largo Fino 1kg

  RAISE NOTICE 'Product "Aceite" ID: %', v_product_aceite_id;
  RAISE NOTICE 'Product "Arroz" ID: %', v_product_arroz_id;

  -- 5. INSERT ORDERS & ORDER ITEMS
  -- Ensure customers and products were found before creating orders
  IF v_customer_central_id IS NULL OR v_customer_esquina_id IS NULL OR v_product_aceite_id IS NULL OR v_product_arroz_id IS NULL THEN
    RAISE EXCEPTION 'One or more required Customers or Products were not found. Aborting script.';
  END IF;

  -- Order 1 for "Almacén Central"
  INSERT INTO public.orders (order_number, customer_id, delivery_date, order_type, status, subtotal, total, created_by)
  VALUES ('PED-DEMO-101-' || v_unique_suffix, v_customer_central_id, v_scheduled_date, 'presencial', 'PENDIENTE_ENTREGA', 3050.00, 3050.00, v_admin_id)
  RETURNING id INTO v_order1_id;

  IF v_order1_id IS NOT NULL THEN
    -- Insert items only if they don't exist for this order
    INSERT INTO public.order_items (order_id, product_id, quantity_requested, unit_price, subtotal)
    SELECT v_order1_id, v_product_aceite_id, 2, 850.00, 1700.00 WHERE NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = v_order1_id AND product_id = v_product_aceite_id);
    INSERT INTO public.order_items (order_id, product_id, quantity_requested, unit_price, subtotal)
    SELECT v_order1_id, v_product_arroz_id, 3, 450.00, 1350.00 WHERE NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = v_order1_id AND product_id = v_product_arroz_id);
  ELSE
    RAISE WARNING 'Order PED-DEMO-101 was not created or found, skipping item insertion.';
  END IF;
  RAISE NOTICE 'Order 1 ID: %', v_order1_id;

  -- Order 2 for "Despensa La Esquina"
  INSERT INTO public.orders (order_number, customer_id, delivery_date, order_type, status, subtotal, total, created_by)
  VALUES ('PED-DEMO-102-' || v_unique_suffix, v_customer_esquina_id, v_scheduled_date, 'web', 'PENDIENTE_ENTREGA', 2250.00, 2250.00, v_admin_id)
  RETURNING id INTO v_order2_id;

  IF v_order2_id IS NOT NULL THEN
    INSERT INTO public.order_items (order_id, product_id, quantity_requested, unit_price, subtotal)
    SELECT v_order2_id, v_product_arroz_id, 5, 450.00, 2250.00 -- 5 x Arroz
    WHERE NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = v_order2_id AND product_id = v_product_arroz_id);
  ELSE
    RAISE WARNING 'Order PED-DEMO-102 was not created or found, skipping item insertion.';
  END IF;
  RAISE NOTICE 'Order 2 ID: %', v_order2_id;

  -- 6. CREATE THE ROUTE
  -- Generate a unique route code for today
  v_route_code := 'R-DEMO-' || to_char(v_scheduled_date, 'YYYYMMDD') || '-' || v_unique_suffix;
  
  INSERT INTO public.routes (route_code, driver_id, zone_id, scheduled_date, status, created_by, total_distance, estimated_duration)
  VALUES (v_route_code, v_driver_id, v_zone_id, v_scheduled_date, 'PLANIFICADO', v_admin_id, 8.4, 45)
  RETURNING id INTO v_route_id;

  RAISE NOTICE 'Route ID: %', v_route_id;

  -- 7. LINK ORDERS TO THE ROUTE (if the route was created)
  IF v_route_id IS NOT NULL AND v_order1_id IS NOT NULL AND v_order2_id IS NOT NULL THEN
    -- Insert route-order links only if they don't already exist
    INSERT INTO public.route_orders (route_id, order_id, delivery_order)
    SELECT v_route_id, v_order1_id, 1 WHERE NOT EXISTS (SELECT 1 FROM public.route_orders WHERE route_id = v_route_id AND order_id = v_order1_id);
    INSERT INTO public.route_orders (route_id, order_id, delivery_order)
    SELECT v_route_id, v_order2_id, 2 WHERE NOT EXISTS (SELECT 1 FROM public.route_orders WHERE route_id = v_route_id AND order_id = v_order2_id);
    RAISE NOTICE 'Linked orders to route %', v_route_code;
  ELSE
    RAISE WARNING 'Could not link orders because route or orders were not properly created/found.';
  END IF;

  RAISE NOTICE '✅ Demo route creation script finished successfully.';

END $$;
