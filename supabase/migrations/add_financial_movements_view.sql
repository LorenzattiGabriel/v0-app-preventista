-- =====================================================
-- VISTA UNIFICADA DE MOVIMIENTOS FINANCIEROS (BI)
-- =====================================================
-- Une en una sola fuente:
--   1. customer_account_movements (cuentas corrientes de clientes)
--   2. expenses (egresos / pagos a proveedores)
-- Normaliza ambos a columnas comunes para filtrar, paginar y agregar
-- desde un único SELECT (ver app/admin/cuentas-corrientes/movimientos).
--
-- Convención de negocio (decidida con el usuario):
--   direction = 'ingreso'  -> entra plata / cobro          (credit_amount)
--   direction = 'egreso'   -> cargo a cliente o pago a prov (debit_amount / expense)
--   channel   = 'ruta'        -> movimiento de cuenta con route_id
--             = 'fuera_ruta'   -> movimiento de cuenta sin route_id
--             = 'proveedor'    -> egreso a proveedor
-- =====================================================

-- Índices para acelerar el filtrado de la vista
CREATE INDEX IF NOT EXISTS idx_movements_route
  ON customer_account_movements(route_id);
CREATE INDEX IF NOT EXISTS idx_movements_customer_date
  ON customer_account_movements(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_supplier
  ON expenses(supplier_id);

DROP VIEW IF EXISTS financial_movements;

CREATE VIEW financial_movements AS
-- ---------- Movimientos de cuenta corriente ----------
SELECT
  m.id,
  m.created_at                                            AS date,
  'cuenta_cliente'::text                                  AS source,
  'cliente'::text                                         AS party_type,
  m.customer_id                                           AS party_id,
  c.commercial_name                                       AS party_name,
  c.code                                                  AS party_code,
  CASE
    WHEN COALESCE(m.credit_amount, 0) > 0 THEN 'ingreso'
    ELSE 'egreso'
  END                                                     AS direction,
  CASE
    WHEN m.route_id IS NOT NULL THEN 'ruta'
    ELSE 'fuera_ruta'
  END                                                     AS channel,
  (COALESCE(m.credit_amount, 0) + COALESCE(m.debit_amount, 0)) AS amount,
  m.movement_type::text                                   AS concept,
  m.description                                           AS description,
  CASE m.movement_type
    WHEN 'PAGO_EFECTIVO'         THEN 'Efectivo'
    WHEN 'PAGO_TRANSFERENCIA'    THEN 'Transferencia'
    WHEN 'PAGO_TARJETA'          THEN 'Tarjeta'
    WHEN 'PAGO_CHEQUE'           THEN 'Cheque'
    WHEN 'PAGO_CUENTA_CORRIENTE' THEN 'Cuenta Corriente'
    WHEN 'PAGO_OTRO'             THEN 'Otro'
    ELSE NULL
  END                                                     AS payment_method,
  m.order_id                                              AS order_id,
  o.order_number                                          AS order_number,
  m.route_id                                              AS route_id,
  m.notes                                                 AS notes,
  m.created_by                                            AS created_by
FROM customer_account_movements m
LEFT JOIN customers c ON c.id = m.customer_id
LEFT JOIN orders o    ON o.id = m.order_id

UNION ALL

-- ---------- Egresos a proveedores ----------
SELECT
  e.id,
  e.expense_date::timestamptz                             AS date,
  'egreso_proveedor'::text                                AS source,
  'proveedor'::text                                       AS party_type,
  e.supplier_id                                           AS party_id,
  COALESCE(s.name, 'Sin proveedor')                       AS party_name,
  NULL::text                                              AS party_code,
  'egreso'::text                                          AS direction,
  'proveedor'::text                                       AS channel,
  COALESCE(e.amount, 0)                                   AS amount,
  COALESCE(cat.name, 'Egreso')                            AS concept,
  e.description                                           AS description,
  e.payment_method::text                                  AS payment_method,
  NULL::uuid                                              AS order_id,
  NULL::text                                              AS order_number,
  NULL::uuid                                              AS route_id,
  e.notes                                                 AS notes,
  e.created_by                                            AS created_by
FROM expenses e
LEFT JOIN suppliers s          ON s.id = e.supplier_id
LEFT JOIN expense_categories cat ON cat.id = e.category_id;
