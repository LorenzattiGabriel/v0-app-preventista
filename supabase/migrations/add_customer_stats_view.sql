-- =====================================================
-- VISTA DE ESTADÍSTICAS POR CLIENTE (BI / seguimiento)
-- =====================================================
-- Agrega, por cada cliente activo:
--   - actividad de pedidos (último/primer pedido, cantidad, entregados)
--   - facturación entregada y ticket promedio
--   - días sin pedir (para alertas de clientes inactivos / dormidos)
--   - saldo de cuenta corriente y deuda vencida
-- Alimenta /admin/customers/estadisticas y los carteles del dashboard.
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_customer_status
  ON orders(customer_id, status);

DROP VIEW IF EXISTS customer_stats;

CREATE VIEW customer_stats AS
SELECT
  c.id,
  c.code,
  c.commercial_name,
  c.contact_name,
  c.phone,
  c.customer_type,
  c.locality,
  c.zone_id,
  c.priority,
  c.current_balance,
  c.credit_limit,
  c.created_at,
  oa.last_order_date,
  oa.first_order_date,
  COALESCE(oa.orders_count, 0)                                   AS orders_count,
  COALESCE(oa.delivered_count, 0)                                AS delivered_count,
  COALESCE(oa.total_spent, 0)                                    AS total_spent,
  CASE
    WHEN COALESCE(oa.delivered_count, 0) > 0
    THEN oa.total_spent / oa.delivered_count
    ELSE 0
  END                                                            AS avg_ticket,
  CASE
    WHEN oa.last_order_date IS NOT NULL
    THEN (CURRENT_DATE - oa.last_order_date::date)
    ELSE NULL
  END                                                            AS days_since_last_order,
  COALESCE(ov.overdue_amount, 0)                                 AS overdue_amount,
  COALESCE(ov.overdue_count, 0)                                  AS overdue_count
FROM customers c
-- Agregados de pedidos por cliente (excluye borradores y cancelados de la actividad)
LEFT JOIN (
  SELECT
    customer_id,
    MAX(created_at) FILTER (WHERE status NOT IN ('BORRADOR', 'CANCELADO')) AS last_order_date,
    MIN(created_at) FILTER (WHERE status NOT IN ('BORRADOR', 'CANCELADO')) AS first_order_date,
    COUNT(*)        FILTER (WHERE status NOT IN ('BORRADOR', 'CANCELADO')) AS orders_count,
    COUNT(*)        FILTER (WHERE status = 'ENTREGADO')                    AS delivered_count,
    SUM(total)      FILTER (WHERE status = 'ENTREGADO')                    AS total_spent
  FROM orders
  GROUP BY customer_id
) oa ON oa.customer_id = c.id
-- Deuda vencida por cliente (pagos con vencimiento pasado y saldo pendiente)
LEFT JOIN (
  SELECT
    o.customer_id,
    SUM(op.balance_due) AS overdue_amount,
    COUNT(*)            AS overdue_count
  FROM order_payments op
  JOIN orders o ON o.id = op.order_id
  WHERE op.balance_due > 0
    AND op.due_date < CURRENT_DATE
  GROUP BY o.customer_id
) ov ON ov.customer_id = c.id
WHERE c.is_active = true;
