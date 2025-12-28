-- =====================================================
-- SCRIPT DE LIMPIEZA COMPLETA: Eliminar datos transaccionales
-- =====================================================
-- Este script elimina TODOS los datos transaccionales manteniendo:
-- ✓ Usuarios (profiles)
-- ✓ Productos (products) - con stock actual
-- ✓ Clientes (customers) - con saldo reseteado
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
RAISE NOTICE '✓ Eliminados: route_cash_closures';

-- Relación rutas-pedidos
DELETE FROM route_orders;
RAISE NOTICE '✓ Eliminados: route_orders';

-- =====================================================
-- 2. ELIMINAR RUTAS
-- =====================================================

DELETE FROM routes;
RAISE NOTICE '✓ Eliminadas: routes';

-- =====================================================
-- 3. ELIMINAR TABLAS DEPENDIENTES DE PEDIDOS
-- =====================================================

-- Historial de pedidos
DELETE FROM order_history;
RAISE NOTICE '✓ Eliminados: order_history';

-- Pagos de pedidos
DELETE FROM order_payments;
RAISE NOTICE '✓ Eliminados: order_payments';

-- Calificaciones de pedidos
DELETE FROM order_ratings;
RAISE NOTICE '✓ Eliminados: order_ratings';

-- Items de pedidos
DELETE FROM order_items;
RAISE NOTICE '✓ Eliminados: order_items';

-- =====================================================
-- 4. ELIMINAR MOVIMIENTOS DE CUENTA CORRIENTE
-- =====================================================

-- TODOS los movimientos de cuenta corriente
DELETE FROM customer_account_movements;
RAISE NOTICE '✓ Eliminados: customer_account_movements (todos)';

-- =====================================================
-- 5. ELIMINAR PEDIDOS
-- =====================================================

DELETE FROM orders;
RAISE NOTICE '✓ Eliminados: orders';

-- =====================================================
-- 6. ELIMINAR HISTORIAL DE STOCK (OPCIONAL)
-- =====================================================
-- Descomenta la siguiente línea si quieres borrar TODO el historial de stock
-- Si solo quieres borrar los relacionados a pedidos, deja comentada esta línea

-- OPCIÓN A: Borrar SOLO movimientos de armado de pedidos
DELETE FROM stock_movements WHERE movement_type = 'order_assembly';
RAISE NOTICE '✓ Eliminados: stock_movements (order_assembly)';

-- OPCIÓN B: Borrar TODOS los movimientos de stock (descomentar si es necesario)
-- DELETE FROM stock_movements;
-- RAISE NOTICE '✓ Eliminados: stock_movements (TODOS)';

-- =====================================================
-- 7. RESETEAR SALDOS DE CLIENTES
-- =====================================================

-- Poner el saldo de todos los clientes en 0
UPDATE customers 
SET current_balance = 0
WHERE current_balance != 0;
RAISE NOTICE '✓ Reseteados: saldos de clientes a 0';

-- =====================================================
-- 8. RESETEAR CAMPOS DE PEDIDOS EN PRODUCTOS (OPCIONAL)
-- =====================================================
-- Si quieres reiniciar contadores de pedidos, descomenta:
-- UPDATE products SET times_ordered = 0 WHERE times_ordered > 0;
-- RAISE NOTICE '✓ Reseteados: contadores de pedidos en productos';

-- =====================================================
-- 9. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    orders_count INTEGER;
    routes_count INTEGER;
    movements_count INTEGER;
    payments_count INTEGER;
    stock_movements_count INTEGER;
    customers_count INTEGER;
    products_count INTEGER;
    users_count INTEGER;
    zones_count INTEGER;
    customers_with_debt INTEGER;
BEGIN
    SELECT COUNT(*) INTO orders_count FROM orders;
    SELECT COUNT(*) INTO routes_count FROM routes;
    SELECT COUNT(*) INTO movements_count FROM customer_account_movements;
    SELECT COUNT(*) INTO payments_count FROM order_payments;
    SELECT COUNT(*) INTO stock_movements_count FROM stock_movements;
    SELECT COUNT(*) INTO customers_count FROM customers;
    SELECT COUNT(*) INTO products_count FROM products;
    SELECT COUNT(*) INTO users_count FROM profiles;
    SELECT COUNT(*) INTO zones_count FROM zones;
    SELECT COUNT(*) INTO customers_with_debt FROM customers WHERE current_balance > 0;
    
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '                   RESUMEN DE LIMPIEZA                  ';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 DATOS TRANSACCIONALES (deben estar en 0):';
    RAISE NOTICE '   • Pedidos: %', orders_count;
    RAISE NOTICE '   • Rutas: %', routes_count;
    RAISE NOTICE '   • Movimientos de cuenta: %', movements_count;
    RAISE NOTICE '   • Pagos de pedidos: %', payments_count;
    RAISE NOTICE '   • Movimientos de stock: %', stock_movements_count;
    RAISE NOTICE '   • Clientes con deuda: %', customers_with_debt;
    RAISE NOTICE '';
    RAISE NOTICE '✅ DATOS DE REFERENCIA (preservados):';
    RAISE NOTICE '   • Clientes: %', customers_count;
    RAISE NOTICE '   • Productos: %', products_count;
    RAISE NOTICE '   • Usuarios: %', users_count;
    RAISE NOTICE '   • Zonas: %', zones_count;
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════';
    
    -- Validar que todo esté limpio
    IF orders_count = 0 AND routes_count = 0 AND movements_count = 0 AND payments_count = 0 THEN
        RAISE NOTICE '✅ LIMPIEZA EXITOSA - Datos transaccionales eliminados';
    ELSE
        RAISE WARNING '⚠️ ATENCIÓN: Algunos datos transaccionales no fueron eliminados';
    END IF;
    
    RAISE NOTICE '════════════════════════════════════════════════════════';
END $$;

-- =====================================================
-- CONFIRMAR O CANCELAR
-- =====================================================
-- Si todo está correcto y quieres aplicar los cambios:
--   1. Cambia ROLLBACK por COMMIT en la línea de abajo
--   2. Ejecuta el script nuevamente

-- ⚠️ Por seguridad, el script usa ROLLBACK por defecto
-- Cambia a COMMIT cuando estés 100% seguro:

ROLLBACK;
-- COMMIT;

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Este script usa ROLLBACK por defecto como medida de seguridad
-- 2. Revisa el RESUMEN DE LIMPIEZA antes de hacer COMMIT
-- 3. Ejecuta primero sin COMMIT para verificar que funciona
-- 4. Luego cambia ROLLBACK por COMMIT y ejecuta de nuevo
-- 5. Los triggers de Supabase actualizarán automáticamente 
--    los saldos cuando se creen nuevos movimientos
-- =====================================================
