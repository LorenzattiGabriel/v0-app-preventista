-- Create the payment_method enum based on the application values
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_enum') THEN
        CREATE TYPE payment_method_enum AS ENUM (
            'Efectivo', 
            'Transferencia', 
            'Tarjeta de Débito', 
            'Tarjeta de Crédito', 
            'Cuenta Corriente', 
            'Cheque',
            'Otro'
        );
    END IF;
END$$;

-- ORDERS TABLE
-- 1. Drop existing default to avoid casting errors during type conversion
ALTER TABLE public.orders ALTER COLUMN payment_method DROP DEFAULT;

-- 2. Convert column from TEXT to ENUM with USING clause
ALTER TABLE public.orders 
ALTER COLUMN payment_method TYPE payment_method_enum 
USING CASE
    WHEN payment_method::text = 'Efectivo' THEN 'Efectivo'::payment_method_enum
    WHEN payment_method::text = 'Transferencia' THEN 'Transferencia'::payment_method_enum
    WHEN payment_method::text = 'Tarjeta de Débito' THEN 'Tarjeta de Débito'::payment_method_enum
    WHEN payment_method::text = 'Tarjeta de Crédito' THEN 'Tarjeta de Crédito'::payment_method_enum
    WHEN payment_method::text = 'Cuenta Corriente' THEN 'Cuenta Corriente'::payment_method_enum
    WHEN payment_method::text = 'Cheque' THEN 'Cheque'::payment_method_enum
    ELSE 'Otro'::payment_method_enum 
END;

-- 3. Re-add default value properly casted
ALTER TABLE public.orders 
ALTER COLUMN payment_method SET DEFAULT 'Efectivo'::payment_method_enum;


-- ROUTE_ORDERS TABLE
DO $$
BEGIN
    -- Check if column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_orders' AND column_name = 'payment_method') THEN
        -- If it exists, drop default if any
        ALTER TABLE public.route_orders ALTER COLUMN payment_method DROP DEFAULT;
        
        -- Alter type
        ALTER TABLE public.route_orders 
        ALTER COLUMN payment_method TYPE payment_method_enum 
        USING CASE
            WHEN payment_method::text = 'Efectivo' THEN 'Efectivo'::payment_method_enum
            WHEN payment_method::text = 'Transferencia' THEN 'Transferencia'::payment_method_enum
            WHEN payment_method::text = 'Tarjeta de Débito' THEN 'Tarjeta de Débito'::payment_method_enum
            WHEN payment_method::text = 'Tarjeta de Crédito' THEN 'Tarjeta de Crédito'::payment_method_enum
            WHEN payment_method::text = 'Cuenta Corriente' THEN 'Cuenta Corriente'::payment_method_enum
            WHEN payment_method::text = 'Cheque' THEN 'Cheque'::payment_method_enum
            ELSE 'Otro'::payment_method_enum
        END;
    ELSE
        -- If it doesn't exist, simply add it
        ALTER TABLE public.route_orders 
        ADD COLUMN payment_method payment_method_enum;
    END IF;
END$$;
