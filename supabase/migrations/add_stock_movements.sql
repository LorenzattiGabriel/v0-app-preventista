-- =====================================================
-- TABLA: stock_movements (Auditoría de movimientos de stock)
-- =====================================================
-- Registra todos los cambios de stock para trazabilidad completa

-- Crear enum para tipos de movimiento
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type') THEN
        CREATE TYPE stock_movement_type AS ENUM (
            'manual_edit',           -- Edición manual individual
            'csv_import',            -- Importación masiva por CSV
            'order_assembly',        -- Descuento por armado de pedido
            'inventory_adjustment',  -- Ajuste por inventario físico
            'purchase_receipt',      -- Recepción de compra (futuro)
            'return',                -- Devolución de producto
            'damage',                -- Baja por daño
            'expiration'             -- Baja por vencimiento
        );
    END IF;
END $$;

-- Crear tabla de movimientos de stock
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Producto afectado
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    
    -- Cambio de stock
    previous_stock DECIMAL(12,2) NOT NULL,
    new_stock DECIMAL(12,2) NOT NULL,
    quantity_changed DECIMAL(12,2) NOT NULL,
    
    -- Tipo y contexto
    movement_type stock_movement_type NOT NULL,
    
    -- Auditoría
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contexto adicional
    notes TEXT,
    batch_id UUID,                    -- Agrupa cambios de una misma importación
    reference_id UUID,                -- ID de pedido, orden de compra, etc.
    reference_type VARCHAR(50)        -- 'order', 'purchase_order', etc.
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON stock_movements(created_by);

-- Comentarios de documentación
COMMENT ON TABLE stock_movements IS 'Auditoría de todos los movimientos de stock';
COMMENT ON COLUMN stock_movements.batch_id IS 'UUID para agrupar movimientos de una misma importación CSV';
COMMENT ON COLUMN stock_movements.reference_id IS 'ID de referencia (pedido, orden de compra, etc.)';
COMMENT ON COLUMN stock_movements.reference_type IS 'Tipo de referencia (order, purchase_order, etc.)';

-- =====================================================
-- Vista: stock_movements_with_user
-- =====================================================
-- Vista que incluye nombre del usuario para consultas

CREATE OR REPLACE VIEW stock_movements_with_user AS
SELECT 
    sm.*,
    p.full_name AS user_name,
    p.email AS user_email
FROM stock_movements sm
LEFT JOIN profiles p ON sm.created_by = p.id;

-- =====================================================
-- Función: get_product_stock_history
-- =====================================================
-- Obtiene el historial de stock de un producto

CREATE OR REPLACE FUNCTION get_product_stock_history(
    p_product_id UUID,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    previous_stock DECIMAL(12,2),
    new_stock DECIMAL(12,2),
    quantity_changed DECIMAL(12,2),
    movement_type stock_movement_type,
    notes TEXT,
    created_at TIMESTAMPTZ,
    user_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.previous_stock,
        sm.new_stock,
        sm.quantity_changed,
        sm.movement_type,
        sm.notes,
        sm.created_at,
        p.full_name
    FROM stock_movements sm
    LEFT JOIN profiles p ON sm.created_by = p.id
    WHERE sm.product_id = p_product_id
    ORDER BY sm.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

