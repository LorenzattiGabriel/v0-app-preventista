-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Administrativos can view all profiles
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- ============================================
-- ZONES POLICIES
-- ============================================

-- All authenticated users can view zones
CREATE POLICY "zones_select_all"
  ON public.zones FOR SELECT
  TO authenticated
  USING (true);

-- Only administrativos can manage zones
CREATE POLICY "zones_all_admin"
  ON public.zones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- ============================================
-- CUSTOMERS POLICIES
-- ============================================

-- Preventistas and administrativos can view all customers
CREATE POLICY "customers_select_staff"
  ON public.customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('preventista', 'administrativo')
    )
  );

-- Preventistas can create customers
CREATE POLICY "customers_insert_preventista"
  ON public.customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'preventista'
    )
  );

-- Preventistas and administrativos can update customers
CREATE POLICY "customers_update_staff"
  ON public.customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('preventista', 'administrativo')
    )
  );

-- Clientes can view their own customer record
CREATE POLICY "customers_select_own"
  ON public.customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'cliente'
      AND p.email = customers.email
    )
  );

-- ============================================
-- PRODUCTS POLICIES
-- ============================================

-- All authenticated users can view products
CREATE POLICY "products_select_all"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

-- Only administrativos can manage products
CREATE POLICY "products_all_admin"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- ============================================
-- ORDERS POLICIES
-- ============================================

-- Preventistas can view orders they created
CREATE POLICY "orders_select_preventista"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'preventista'
      AND (orders.created_by = auth.uid() OR role = 'administrativo')
    )
  );

-- Encargados de armado can view orders pending assembly
CREATE POLICY "orders_select_armado"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'encargado_armado'
      AND orders.status IN ('PENDIENTE_ARMADO', 'EN_ARMADO', 'ESPERANDO_STOCK')
    )
  );

-- Repartidores can view their assigned orders
CREATE POLICY "orders_select_repartidor"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'repartidor'
      AND orders.delivered_by = auth.uid()
    )
  );

-- Clientes can view their own orders
CREATE POLICY "orders_select_cliente"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.customers c ON c.email = p.email
      WHERE p.id = auth.uid() 
      AND p.role = 'cliente'
      AND orders.customer_id = c.id
    )
  );

-- Administrativos can view all orders
CREATE POLICY "orders_select_admin"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- Preventistas can create orders
CREATE POLICY "orders_insert_preventista"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'preventista'
    )
  );

-- Preventistas can update their own draft orders
CREATE POLICY "orders_update_preventista"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'preventista'
      AND orders.created_by = auth.uid()
      AND orders.status = 'BORRADOR'
    )
  );

-- Encargados can update orders during assembly
CREATE POLICY "orders_update_armado"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'encargado_armado'
      AND orders.status IN ('PENDIENTE_ARMADO', 'EN_ARMADO', 'ESPERANDO_STOCK')
    )
  );

-- Repartidores can update their assigned orders
CREATE POLICY "orders_update_repartidor"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'repartidor'
      AND orders.delivered_by = auth.uid()
      AND orders.status IN ('PENDIENTE_ENTREGA', 'EN_REPARTICION')
    )
  );

-- Administrativos can update all orders
CREATE POLICY "orders_update_admin"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- ============================================
-- ORDER ITEMS POLICIES
-- ============================================

-- Users can view order items if they can view the order
CREATE POLICY "order_items_select"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
    )
  );

-- Users can manage order items if they can manage the order
CREATE POLICY "order_items_all"
  ON public.order_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
    )
  );

-- ============================================
-- ROUTES POLICIES
-- ============================================

-- Repartidores can view their assigned routes
CREATE POLICY "routes_select_repartidor"
  ON public.routes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role = 'repartidor'
      AND routes.driver_id = auth.uid()
    )
  );

-- Administrativos can manage all routes
CREATE POLICY "routes_all_admin"
  ON public.routes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'administrativo'
    )
  );

-- ============================================
-- ROUTE ORDERS POLICIES
-- ============================================

-- Users can view route orders if they can view the route
CREATE POLICY "route_orders_select"
  ON public.route_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.routes
      WHERE routes.id = route_orders.route_id
    )
  );

-- Users can manage route orders if they can manage the route
CREATE POLICY "route_orders_all"
  ON public.route_orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.routes
      WHERE routes.id = route_orders.route_id
    )
  );

-- ============================================
-- ORDER RATINGS POLICIES
-- ============================================

-- Clientes can view and create ratings for their orders
CREATE POLICY "order_ratings_cliente"
  ON public.order_ratings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.customers c ON c.email = p.email
      WHERE p.id = auth.uid() 
      AND p.role = 'cliente'
      AND order_ratings.customer_id = c.id
    )
  );

-- Staff can view all ratings
CREATE POLICY "order_ratings_select_staff"
  ON public.order_ratings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() 
      AND role IN ('preventista', 'administrativo', 'repartidor')
    )
  );

-- ============================================
-- ORDER HISTORY POLICIES
-- ============================================

-- All authenticated users can view order history for orders they can access
CREATE POLICY "order_history_select"
  ON public.order_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_history.order_id
    )
  );

-- System can insert history (no user restriction)
CREATE POLICY "order_history_insert"
  ON public.order_history FOR INSERT
  WITH CHECK (true);
