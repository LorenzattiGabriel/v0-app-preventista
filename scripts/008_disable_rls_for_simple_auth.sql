-- ============================================
-- DISABLE RLS FOR SIMPLE AUTHENTICATION
-- ============================================
-- This script disables RLS to allow the simple authentication system to work
-- ⚠️ FOR DEVELOPMENT/PROTOTYPING ONLY - NOT FOR PRODUCTION

-- Drop all existing policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Disable RLS on all tables
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.route_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_history DISABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon access (for simple auth system)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_anon_all" ON public.profiles FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "profiles_authenticated_all" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zones_anon_all" ON public.zones FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "zones_authenticated_all" ON public.zones FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_anon_all" ON public.customers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "customers_authenticated_all" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_anon_all" ON public.products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "products_authenticated_all" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_anon_all" ON public.orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "orders_authenticated_all" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_anon_all" ON public.order_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "order_items_authenticated_all" ON public.order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_anon_all" ON public.routes FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "routes_authenticated_all" ON public.routes FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.route_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "route_orders_anon_all" ON public.route_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "route_orders_authenticated_all" ON public.route_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_ratings_anon_all" ON public.order_ratings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "order_ratings_authenticated_all" ON public.order_ratings FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.order_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_history_anon_all" ON public.order_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "order_history_authenticated_all" ON public.order_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Print confirmation
DO $$ 
BEGIN
    RAISE NOTICE '✅ RLS policies updated for simple authentication';
    RAISE NOTICE '⚠️  WARNING: This configuration is for development only';
END $$;

