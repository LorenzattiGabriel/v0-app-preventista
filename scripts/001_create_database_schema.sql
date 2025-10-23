-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Drop existing types before creating to avoid "already exists" errors
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS order_priority CASCADE;
DROP TYPE IF EXISTS order_type CASCADE;
DROP TYPE IF EXISTS customer_type CASCADE;
DROP TYPE IF EXISTS iva_condition CASCADE;
DROP TYPE IF EXISTS shortage_reason CASCADE;
DROP TYPE IF EXISTS route_status CASCADE;

-- User roles
CREATE TYPE user_role AS ENUM (
  'preventista',
  'encargado_armado',
  'repartidor',
  'cliente',
  'administrativo'
);

-- Order status
CREATE TYPE order_status AS ENUM (
  'BORRADOR',
  'PENDIENTE_ARMADO',
  'EN_ARMADO',
  'PENDIENTE_ENTREGA',
  'EN_REPARTICION',
  'ENTREGADO',
  'CANCELADO',
  'ESPERANDO_STOCK'
);

-- Order priority
CREATE TYPE order_priority AS ENUM (
  'baja',
  'normal',
  'media',
  'alta',
  'urgente'
);

-- Order type
CREATE TYPE order_type AS ENUM (
  'web',
  'presencial',
  'telefono',
  'whatsapp'
);

-- Customer type
CREATE TYPE customer_type AS ENUM (
  'mayorista',
  'minorista'
);

-- IVA condition
CREATE TYPE iva_condition AS ENUM (
  'responsable_inscripto',
  'monotributista',
  'exento',
  'consumidor_final'
);

-- Shortage reason
CREATE TYPE shortage_reason AS ENUM (
  'sin_stock',
  'producto_danado',
  'producto_discontinuado',
  'error_pedido',
  'otro'
);

-- Route status
CREATE TYPE route_status AS ENUM (
  'PLANIFICADO',
  'EN_CURSO',
  'COMPLETADO',
  'CANCELADO'
);

-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================

-- Drop foreign key constraint if it exists (for simple auth)
ALTER TABLE IF EXISTS public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL,
  phone TEXT,
  pwd TEXT, -- Added password field for simple authentication
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ZONES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  polygon JSONB, -- GeoJSON polygon for zone boundaries
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- CLI-XXXX
  commercial_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  
  -- Address
  street TEXT NOT NULL,
  street_number TEXT NOT NULL,
  floor_apt TEXT,
  locality TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Business info
  legal_name TEXT,
  tax_id TEXT UNIQUE, -- CUIT/CUIL
  customer_type customer_type NOT NULL DEFAULT 'minorista',
  iva_condition iva_condition,
  
  -- Credit
  credit_days INTEGER DEFAULT 0,
  credit_limit DECIMAL(12, 2) DEFAULT 0,
  general_discount DECIMAL(5, 2) DEFAULT 0, -- Percentage
  
  -- Relations
  zone_id UUID REFERENCES public.zones(id),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Metadata
  observations TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PRODUCTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  category TEXT,
  
  -- Pricing
  base_price DECIMAL(12, 2) NOT NULL,
  wholesale_price DECIMAL(12, 2),
  retail_price DECIMAL(12, 2),
  
  -- Physical properties
  weight DECIMAL(10, 3), -- kg
  volume DECIMAL(10, 3), -- m³
  
  -- Stock
  current_stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL, -- PED-XXXX
  
  -- Customer
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  
  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE NOT NULL,
  
  -- Order details
  priority order_priority NOT NULL DEFAULT 'normal',
  order_type order_type NOT NULL,
  status order_status NOT NULL DEFAULT 'PENDIENTE_ARMADO',
  
  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  general_discount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  
  -- Flags
  requires_invoice BOOLEAN DEFAULT false,
  has_shortages BOOLEAN DEFAULT false,
  
  -- Users involved
  created_by UUID REFERENCES public.profiles(id),
  assembled_by UUID REFERENCES public.profiles(id),
  delivered_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  assembly_started_at TIMESTAMPTZ,
  assembly_completed_at TIMESTAMPTZ,
  delivery_started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  -- Notes
  observations TEXT,
  assembly_notes TEXT,
  delivery_notes TEXT,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ORDER ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  
  -- Quantities
  quantity_requested INTEGER NOT NULL,
  quantity_assembled INTEGER,
  quantity_delivered INTEGER,
  
  -- Pricing
  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) DEFAULT 0,
  subtotal DECIMAL(12, 2) NOT NULL,
  
  -- Shortage tracking
  is_shortage BOOLEAN DEFAULT false,
  shortage_reason shortage_reason,
  shortage_notes TEXT,
  
  -- Substitution
  is_substituted BOOLEAN DEFAULT false,
  substituted_product_id UUID REFERENCES public.products(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROUTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_code TEXT UNIQUE NOT NULL, -- REC-XXXX-FECHA
  
  -- Assignment
  driver_id UUID REFERENCES public.profiles(id),
  zone_id UUID REFERENCES public.zones(id),
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  
  -- Actual times
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Route details
  total_distance DECIMAL(10, 2), -- km
  estimated_duration INTEGER, -- minutes
  optimized_route JSONB, -- Google Maps route data
  
  -- Status
  status route_status NOT NULL DEFAULT 'PLANIFICADO',
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROUTE ORDERS TABLE (junction)
-- ============================================

CREATE TABLE IF NOT EXISTS public.route_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  
  -- Delivery sequence
  delivery_order INTEGER NOT NULL,
  estimated_arrival_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  
  -- Payment
  was_collected BOOLEAN DEFAULT false,
  collected_amount DECIMAL(12, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(route_id, order_id)
);

-- ============================================
-- ORDER RATINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(order_id)
);

-- ============================================
-- ORDER HISTORY TABLE (audit trail)
-- ============================================

CREATE TABLE IF NOT EXISTS public.order_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  previous_status order_status,
  new_status order_status NOT NULL,
  
  changed_by UUID REFERENCES public.profiles(id),
  change_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Customers
CREATE INDEX idx_customers_code ON public.customers(code);
CREATE INDEX idx_customers_zone ON public.customers(zone_id);
CREATE INDEX idx_customers_type ON public.customers(customer_type);

-- Products
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_products_category ON public.products(category);

-- Orders
CREATE INDEX idx_orders_number ON public.orders(order_number);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_delivery_date ON public.orders(delivery_date);
CREATE INDEX idx_orders_created_by ON public.orders(created_by);

-- Order Items
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_items_product ON public.order_items(product_id);

-- Routes
CREATE INDEX idx_routes_driver ON public.routes(driver_id);
CREATE INDEX idx_routes_date ON public.routes(scheduled_date);
CREATE INDEX idx_routes_status ON public.routes(status);

-- Route Orders
CREATE INDEX idx_route_orders_route ON public.route_orders(route_id);
CREATE INDEX idx_route_orders_order ON public.route_orders(order_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.orders;
  
  RETURN 'PED-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate customer code
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(code FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.customers;
  
  RETURN 'CLI-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate route code
CREATE OR REPLACE FUNCTION generate_route_code(route_date DATE)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  date_str TEXT;
BEGIN
  date_str := TO_CHAR(route_date, 'YYYYMMDD');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(route_code FROM 5 FOR 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.routes
  WHERE scheduled_date = route_date;
  
  RETURN 'REC-' || LPAD(next_num::TEXT, 4, '0') || '-' || date_str;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
