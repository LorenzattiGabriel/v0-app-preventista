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

-- Iniciar transacción
BEGIN;

-- =====================================================
-- 1. ELIMINAR TABLAS DEPENDIENTES DE RUTAS
-- =====================================================

DELETE FROM route_cash_closures;
DELETE FROM route_orders;

-- =====================================================
-- 2. ELIMINAR RUTAS
-- =====================================================

DELETE FROM routes;

-- =====================================================
-- 3. ELIMINAR TABLAS DEPENDIENTES DE PEDIDOS
-- =====================================================

DELETE FROM order_history;
DELETE FROM order_payments;
DELETE FROM order_ratings;
DELETE FROM order_items;

-- =====================================================
-- 4. ELIMINAR MOVIMIENTOS DE CUENTA CORRIENTE
-- =====================================================

DELETE FROM customer_account_movements;

-- =====================================================
-- 5. ELIMINAR PEDIDOS
-- =====================================================

DELETE FROM orders;

-- =====================================================
-- 6. ELIMINAR HISTORIAL DE STOCK
-- =====================================================
-- Solo movimientos de armado de pedidos
DELETE FROM stock_movements WHERE movement_type = 'order_assembly';

-- Para borrar TODOS los movimientos de stock, usar:
-- DELETE FROM stock_movements;

-- =====================================================
-- 7. RESETEAR SALDOS DE CLIENTES
-- =====================================================

UPDATE customers SET current_balance = 0 WHERE current_balance != 0;

-- =====================================================
-- 8. VERIFICACIÓN FINAL
-- =====================================================

SELECT 
  '📋 DATOS TRANSACCIONALES' as categoria,
  'Pedidos' as tabla, 
  (SELECT COUNT(*) FROM orders) as cantidad
UNION ALL
SELECT '', 'Rutas', (SELECT COUNT(*) FROM routes)
UNION ALL
SELECT '', 'Items de pedido', (SELECT COUNT(*) FROM order_items)
UNION ALL
SELECT '', 'Pagos de pedidos', (SELECT COUNT(*) FROM order_payments)
UNION ALL
SELECT '', 'Movimientos cuenta', (SELECT COUNT(*) FROM customer_account_movements)
UNION ALL
SELECT '', 'Movimientos stock', (SELECT COUNT(*) FROM stock_movements)
UNION ALL
SELECT '', 'Clientes con deuda', (SELECT COUNT(*) FROM customers WHERE current_balance > 0)
UNION ALL
SELECT '✅ DATOS PRESERVADOS', 'Clientes', (SELECT COUNT(*) FROM customers)
UNION ALL
SELECT '', 'Productos', (SELECT COUNT(*) FROM products)
UNION ALL
SELECT '', 'Usuarios', (SELECT COUNT(*) FROM profiles)
UNION ALL
SELECT '', 'Zonas', (SELECT COUNT(*) FROM zones);

-- =====================================================
-- CONFIRMAR O CANCELAR
-- =====================================================
-- Si todo está correcto: cambia ROLLBACK por COMMIT

ROLLBACK;
-- COMMIT;
