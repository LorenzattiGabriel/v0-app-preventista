-- Agregar PAGO_CUENTA_CORRIENTE y PAGO_OTRO al enum account_movement_type
-- Antes, los cobros con método "Cuenta Corriente" y "Otro" se guardaban como PAGO_TARJETA
-- (fallback del mapeo en accountMovementsService), lo que inflaba el total de tarjeta en
-- reportes/cierre de caja. Con estos tipos propios cada método queda bien categorizado.
ALTER TYPE account_movement_type ADD VALUE IF NOT EXISTS 'PAGO_CUENTA_CORRIENTE';
ALTER TYPE account_movement_type ADD VALUE IF NOT EXISTS 'PAGO_OTRO';
