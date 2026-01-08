-- =====================================================
-- SCRIPT DE LIMPIEZA PARA SUPABASE SQL EDITOR
-- =====================================================
-- Elimina todos los pedidos y rutas manteniendo:
-- ✓ Usuarios, Productos, Clientes, Zonas
--
-- IMPORTANTE: Esta acción es IRREVERSIBLE
-- =====================================================

-- 1. Eliminar tablas dependientes de rutas
DELETE FROM route_cash_closures;
DELETE FROM route_orders;

-- 2. Eliminar rutas
DELETE FROM routes;

-- 3. Eliminar tablas dependientes de pedidos
DELETE FROM order_history;
DELETE FROM order_payments;
DELETE FROM order_ratings;
DELETE FROM order_items;

-- 4. Eliminar movimientos de cuenta corriente
DELETE FROM customer_account_movements;

-- 5. Eliminar pedidos
DELETE FROM orders;

-- 6. Resetear saldos de clientes a 0
UPDATE customers SET current_balance = 0 WHERE current_balance != 0;

-- 7. Limpiar movimientos de stock de pedidos
DELETE FROM stock_movements WHERE movement_type = 'order_assembly';

-- Verificar limpieza
SELECT 'orders' as tabla, COUNT(*) as cantidad FROM orders
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'customers (preservados)', COUNT(*) FROM customers
UNION ALL
SELECT 'products (preservados)', COUNT(*) FROM products
UNION ALL
SELECT 'profiles (preservados)', COUNT(*) FROM profiles
UNION ALL
SELECT 'zones (preservados)', COUNT(*) FROM zones;



