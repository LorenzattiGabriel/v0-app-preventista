-- =====================================================
-- SCRIPT DE LIMPIEZA: Eliminar pedidos y rutas
-- =====================================================
-- Este script elimina todos los pedidos y rutas manteniendo:
-- ✓ Usuarios (profiles)
-- ✓ Productos (products)
-- ✓ Clientes (customers)
-- ✓ Zonas (zones)
-- ✓ Configuración de depósito (depot_configuration)
--
-- IMPORTANTE: Ejecutar con precaución. Esta acción es IRREVERSIBLE.
-- =====================================================

-- Iniciar transacción para poder hacer rollback si algo falla
BEGIN;

-- =====================================================
-- 1. ELIMINAR TABLAS DEPENDIENTES DE RUTAS
-- =====================================================

-- Cierres de caja de rutas
DELETE FROM route_cash_closures;
RAISE NOTICE 'Eliminados: route_cash_closures';

-- Relación rutas-pedidos
DELETE FROM route_orders;
RAISE NOTICE 'Eliminados: route_orders';

-- =====================================================
-- 2. ELIMINAR RUTAS
-- =====================================================

DELETE FROM routes;
RAISE NOTICE 'Eliminadas: routes';

-- =====================================================
-- 3. ELIMINAR TABLAS DEPENDIENTES DE PEDIDOS
-- =====================================================

-- Historial de pedidos
DELETE FROM order_history;
RAISE NOTICE 'Eliminados: order_history';

-- Pagos de pedidos
DELETE FROM order_payments;
RAISE NOTICE 'Eliminados: order_payments';

-- Calificaciones de pedidos
DELETE FROM order_ratings;
RAISE NOTICE 'Eliminados: order_ratings';

-- Items de pedidos
DELETE FROM order_items;
RAISE NOTICE 'Eliminados: order_items';

-- =====================================================
-- 4. ELIMINAR MOVIMIENTOS DE CUENTA CORRIENTE
-- =====================================================

-- Movimientos de cuenta corriente (relacionados a pedidos)
DELETE FROM customer_account_movements;
RAISE NOTICE 'Eliminados: customer_account_movements';

-- =====================================================
-- 5. ELIMINAR PEDIDOS
-- =====================================================

DELETE FROM orders;
RAISE NOTICE 'Eliminados: orders';

-- =====================================================
-- 6. RESETEAR SALDOS DE CLIENTES
-- =====================================================

-- Poner el saldo de todos los clientes en 0
UPDATE customers 
SET current_balance = 0
WHERE current_balance != 0;
RAISE NOTICE 'Reseteados: saldos de clientes a 0';

-- =====================================================
-- 7. LIMPIAR MOVIMIENTOS DE STOCK RELACIONADOS A PEDIDOS
-- =====================================================

-- Eliminar movimientos de stock de tipo order_assembly
DELETE FROM stock_movements 
WHERE movement_type = 'order_assembly';
RAISE NOTICE 'Eliminados: stock_movements (order_assembly)';

-- =====================================================
-- 8. VERIFICACIÓN
-- =====================================================

-- Mostrar conteos finales
DO $$
DECLARE
    orders_count INTEGER;
    routes_count INTEGER;
    customers_count INTEGER;
    products_count INTEGER;
    users_count INTEGER;
    zones_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orders_count FROM orders;
    SELECT COUNT(*) INTO routes_count FROM routes;
    SELECT COUNT(*) INTO customers_count FROM customers;
    SELECT COUNT(*) INTO products_count FROM products;
    SELECT COUNT(*) INTO users_count FROM profiles;
    SELECT COUNT(*) INTO zones_count FROM zones;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE LIMPIEZA:';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Pedidos restantes: %', orders_count;
    RAISE NOTICE 'Rutas restantes: %', routes_count;
    RAISE NOTICE '----------------------------------------';
    RAISE NOTICE 'DATOS PRESERVADOS:';
    RAISE NOTICE 'Clientes: %', customers_count;
    RAISE NOTICE 'Productos: %', products_count;
    RAISE NOTICE 'Usuarios: %', users_count;
    RAISE NOTICE 'Zonas: %', zones_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- CONFIRMAR O CANCELAR
-- =====================================================
-- Si todo está correcto, ejecutar: COMMIT;
-- Si hay algún problema, ejecutar: ROLLBACK;

-- Descomenta la siguiente línea para confirmar los cambios:
-- COMMIT;

-- Por seguridad, el script termina con ROLLBACK por defecto
-- Cambia a COMMIT cuando estés seguro de ejecutar
ROLLBACK;

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Este script usa ROLLBACK por defecto como medida de seguridad
-- 2. Revisa el RESUMEN DE LIMPIEZA antes de hacer COMMIT
-- 3. Ejecuta primero sin COMMIT para verificar que funciona
-- 4. Luego cambia ROLLBACK por COMMIT y ejecuta de nuevo
-- =====================================================

