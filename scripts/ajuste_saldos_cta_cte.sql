-- ============================================================================
-- Ajuste de saldos de cuenta corriente — RAQUEL VARELA y SUSSI CABRAL
-- ============================================================================
-- NO es una migración: es una corrección puntual de datos. Correr una sola vez
-- en Supabase (SQL Editor) y después borrar/archivar este archivo.
--
-- Contexto: hasta el commit d62c796 el saldo del cliente se guardaba con un
-- read-modify-write (leer current_balance, sumar, escribir). Si dos movimientos
-- del mismo cliente se creaban casi a la vez, los dos leían el mismo saldo
-- previo y el segundo pisaba al primero. Resultado: el movimiento queda en la
-- lista pero su efecto se pierde del saldo.
--
-- ⚠️ Los dos casos son OPUESTOS y NO se arreglan igual:
--
--   SUSSI CABRAL  → el LEDGER está mal (PED-3293 tiene la deuda de $36.120
--                   duplicada por doble confirmación de armado) y el saldo
--                   mostrado ($0) está bien.
--                   ✅ Se arregla con un MOVIMIENTO de ajuste (crédito).
--
--   RAQUEL VARELA → el LEDGER está bien (suma -$376,35: tiene ese importe a
--                   favor por el sobrepago de PED-0313) y lo que está mal es
--                   el saldo cacheado ($30.403,65).
--                   ❌ NO lleva movimiento nuevo: agregar un crédito de
--                      $30.780 la dejaría con -$31.156,35 a favor, o sea el
--                      mismo error al revés. Sólo hay que resincronizar el
--                      saldo contra el ledger (paso 3).
--
--                   Su ledger ya tiene la transferencia duplicada (-$30.780)
--                   Y el ajuste manual del 7/7 que la compensa (+$30.780):
--                   se anulan entre sí, por eso la suma ya es correcta.
-- ============================================================================


-- ============================================================================
-- 1) DIAGNÓSTICO (solo lectura — correr primero y comparar con lo de abajo)
-- ============================================================================
-- Esperado ANTES del ajuste:
--   RAQUEL VARELA  saldo_mostrado  30403.65   ledger   -376.35   desfase  30780.00
--   SUSSI CABRAL   saldo_mostrado      0.00   ledger  36120.00   desfase -36120.00
--   MARTA HERNANDEZ saldo_mostrado 99527.44   ledger 99527.45    desfase     -0.01

SELECT
  c.commercial_name,
  c.current_balance                                              AS saldo_mostrado,
  COALESCE(SUM(m.debit_amount) - SUM(m.credit_amount), 0)        AS ledger,
  c.current_balance
    - COALESCE(SUM(m.debit_amount) - SUM(m.credit_amount), 0)    AS desfase
FROM customers c
LEFT JOIN customer_account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.commercial_name, c.current_balance
HAVING ABS(
  c.current_balance - COALESCE(SUM(m.debit_amount) - SUM(m.credit_amount), 0)
) > 0.005
ORDER BY c.commercial_name;


-- ============================================================================
-- 2) AJUSTE (transaccional — correr todo el bloque junto)
-- ============================================================================

BEGIN;

-- ── 2.1) SUSSI CABRAL: anular la DEUDA_PEDIDO duplicada de PED-3293 ─────────
-- Se agrega un movimiento de ajuste (no se borra la deuda duplicada) para que
-- quede la trazabilidad de por qué se corrigió.
-- El balance_after se recalcula en el paso 2.3, acá va provisorio en 0.
--
-- Si querés que el ajuste figure hecho por un usuario, reemplazá NULL en
-- created_by por el id del administrativo correspondiente.

INSERT INTO customer_account_movements (
  customer_id, movement_type, description,
  debit_amount, credit_amount, balance_after,
  order_id, route_id, created_by, notes
)
SELECT
  c.id,
  'AJUSTE_CREDITO'::account_movement_type,
  'Ajuste manual (crédito): Anula deuda duplicada de PED-3293 generada por doble confirmación de armado',
  0,
  36120.00,
  0,
  NULL,
  NULL,
  NULL,
  'Anula deuda duplicada de PED-3293 generada por doble confirmación de armado'
FROM customers c
WHERE c.id = '59ed99f6-cec6-483a-8f9d-1455ce14b9d6'  -- SUSSI CABRAL
  -- Idempotencia: no lo inserta dos veces si el script ya se corrió
  AND NOT EXISTS (
    SELECT 1 FROM customer_account_movements m
    WHERE m.customer_id = c.id
      AND m.movement_type = 'AJUSTE_CREDITO'
      AND m.credit_amount = 36120.00
      AND m.description LIKE '%PED-3293%'
  );

-- ── 2.2) Resincronizar current_balance contra el ledger ────────────────────
-- Esto es lo que corrige a RAQUEL VARELA (y de paso el centavo de MARTA
-- HERNANDEZ). También deja a SUSSI consistente después del ajuste de 2.1.

UPDATE customers c
SET current_balance = ROUND(COALESCE((
  SELECT SUM(m.debit_amount) - SUM(m.credit_amount)
  FROM customer_account_movements m
  WHERE m.customer_id = c.id
), 0), 2)
WHERE ROUND(COALESCE((
  SELECT SUM(m.debit_amount) - SUM(m.credit_amount)
  FROM customer_account_movements m
  WHERE m.customer_id = c.id
), 0), 2) IS DISTINCT FROM c.current_balance;

-- ── 2.3) Recalcular el saldo corrido (balance_after) de los afectados ──────
-- Sin esto, la lista de movimientos sigue mostrando "Saldo: $30.403,65" en
-- cada fila de Raquel aunque el encabezado ya diga -$376,35.

WITH running AS (
  SELECT
    id,
    ROUND(SUM(debit_amount - credit_amount) OVER (
      PARTITION BY customer_id
      ORDER BY created_at ASC, id ASC
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ), 2) AS new_balance
  FROM customer_account_movements
  WHERE customer_id IN (
    '4d87a197-6c71-42ae-bfea-11de0b8ef4ed',  -- RAQUEL VARELA
    '59ed99f6-cec6-483a-8f9d-1455ce14b9d6'   -- SUSSI CABRAL
  )
)
UPDATE customer_account_movements m
SET balance_after = r.new_balance
FROM running r
WHERE m.id = r.id
  AND m.balance_after IS DISTINCT FROM r.new_balance;

COMMIT;


-- ============================================================================
-- 3) VERIFICACIÓN
-- ============================================================================

-- 3.a) No debería devolver NINGUNA fila (ya no hay desfases)
SELECT
  c.commercial_name,
  c.current_balance                                              AS saldo_mostrado,
  COALESCE(SUM(m.debit_amount) - SUM(m.credit_amount), 0)        AS ledger
FROM customers c
LEFT JOIN customer_account_movements m ON m.customer_id = c.id
GROUP BY c.id, c.commercial_name, c.current_balance
HAVING ABS(
  c.current_balance - COALESCE(SUM(m.debit_amount) - SUM(m.credit_amount), 0)
) > 0.005
ORDER BY c.commercial_name;

-- 3.b) Saldos finales esperados:
--        RAQUEL VARELA  →  -376.35   (tiene $376,35 a favor)
--        SUSSI CABRAL   →     0.00
SELECT commercial_name, current_balance
FROM customers
WHERE id IN (
  '4d87a197-6c71-42ae-bfea-11de0b8ef4ed',
  '59ed99f6-cec6-483a-8f9d-1455ce14b9d6'
);
