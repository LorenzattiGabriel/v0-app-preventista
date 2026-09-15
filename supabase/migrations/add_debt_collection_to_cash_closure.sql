-- ============================================================================
-- Cobro de deuda anterior en reparto + desglose del cierre de caja
-- ============================================================================
-- El repartidor ahora puede cobrar pedidos viejos (ya entregados, impagos) del
-- mismo cliente al que le está entregando. Esa plata vuelve con él, así que el
-- cierre de caja tiene que distinguirla de lo cobrado por los pedidos de la ruta.
--
-- Además se agregan los métodos de pago que faltaban: el desglose sólo tenía
-- efectivo / transferencia / tarjeta, así que lo cobrado con Cheque, Cuenta
-- Corriente u Otro se contaba en el total pero desaparecía del desglose.
-- ============================================================================

ALTER TABLE route_cash_closures
  -- Cobrado por los pedidos DE ESTA RUTA
  ADD COLUMN IF NOT EXISTS route_collected      DECIMAL(12,2) DEFAULT 0,
  -- Cobrado por deuda anterior (pedidos viejos o pagos a cuenta)
  ADD COLUMN IF NOT EXISTS debt_collected       DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debt_payments_count  INTEGER       DEFAULT 0,
  -- Baldes de métodos de pago que faltaban
  ADD COLUMN IF NOT EXISTS cheque_collected     DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS account_collected    DECIMAL(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_collected      DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN route_cash_closures.route_collected     IS 'Cobrado por los pedidos de esta ruta';
COMMENT ON COLUMN route_cash_closures.debt_collected      IS 'Cobrado por deuda anterior (pedidos viejos o pago a cuenta)';
COMMENT ON COLUMN route_cash_closures.total_collected     IS 'route_collected + debt_collected = total a rendir';
COMMENT ON COLUMN route_cash_closures.total_expected      IS 'Suma de totales de los pedidos ENTREGADOS de la ruta';
COMMENT ON COLUMN route_cash_closures.total_difference    IS 'total_expected - route_collected: lo que quedo fiado de ESTA ruta';

-- Backfill: los cierres viejos no tenian cobros de deuda anterior (no existia
-- la funcionalidad), asi que todo lo cobrado fue de los pedidos de la ruta.
UPDATE route_cash_closures
SET route_collected = total_collected
WHERE route_collected = 0 AND total_collected <> 0;
