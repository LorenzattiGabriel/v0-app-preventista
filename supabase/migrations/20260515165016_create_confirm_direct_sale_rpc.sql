-- =====================================================
-- RPC: confirm_direct_sale
-- =====================================================
-- Crea una venta directa en una sola transacción atómica:
--   - INSERT orders (status=ENTREGADO, order_type=local)
--   - INSERT order_items
--   - UPDATE products.current_stock (decremento con validación)
--   - INSERT stock_movements (auditoría)
--   - INSERT customer_account_movements + UPDATE customers.current_balance
--     (solo si algún payment_method = Cuenta Corriente)
--   - INSERT order_history (BORRADOR → ENTREGADO)
-- Si cualquier paso falla, ROLLBACK automático.
--
-- Entrada: jsonb con la siguiente estructura
-- {
--   "customer_id": "uuid",
--   "user_id": "uuid",
--   "subtotal": 12345.67,
--   "general_discount": 0,
--   "total": 12345.67,
--   "observations": "...",
--   "payment_method": "Efectivo",                -- método principal
--   "payment_methods_json": [{...}],             -- split, opcional
--   "account_movement_amount": 0,                -- monto a deuda si cta cte
--   "idempotency_key": "uuid",
--   "items": [
--     { "product_id": "uuid", "quantity": 2, "unit_price": 100,
--       "discount": 0, "subtotal": 200 }
--   ]
-- }

CREATE OR REPLACE FUNCTION confirm_direct_sale(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_order_id uuid;
  v_order_id uuid;
  v_order_number text;
  v_customer_id uuid := (p->>'customer_id')::uuid;
  v_user_id uuid := (p->>'user_id')::uuid;
  v_idempotency_key uuid := (p->>'idempotency_key')::uuid;
  v_account_amount numeric := COALESCE((p->>'account_movement_amount')::numeric, 0);
  v_item jsonb;
  v_product RECORD;
  v_quantity numeric;
  v_new_stock numeric;
  v_current_balance numeric;
  v_new_balance numeric;
BEGIN
  -- 1. Idempotencia: si ya existe orden con este key, la devolvemos
  SELECT id INTO v_existing_order_id
  FROM orders
  WHERE idempotency_key = v_idempotency_key;

  IF v_existing_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_existing_order_id,
      'duplicated', true
    );
  END IF;

  -- 2. Generar order_number usando RPC existente
  v_order_number := generate_order_number();

  -- 3. Insertar la orden (ENTREGADO de una)
  INSERT INTO orders (
    order_number,
    customer_id,
    order_date,
    delivery_date,
    priority,
    order_type,
    status,
    subtotal,
    general_discount,
    total,
    requires_invoice,
    has_shortages,
    created_by,
    assembled_by,
    delivered_by,
    assembly_started_at,
    assembly_completed_at,
    delivered_at,
    observations,
    payment_method,
    payment_methods_json,
    payment_status,
    amount_paid,
    was_collected_on_delivery,
    has_time_restriction,
    idempotency_key
  ) VALUES (
    v_order_number,
    v_customer_id,
    CURRENT_DATE,
    CURRENT_DATE,
    'normal',
    'local',
    'ENTREGADO',
    (p->>'subtotal')::numeric,
    COALESCE((p->>'general_discount')::numeric, 0),
    (p->>'total')::numeric,
    false,
    false,
    v_user_id,
    v_user_id,
    v_user_id,
    NOW(),
    NOW(),
    NOW(),
    p->>'observations',
    p->>'payment_method',
    CASE
      WHEN p ? 'payment_methods_json' AND jsonb_typeof(p->'payment_methods_json') = 'array'
      THEN p->'payment_methods_json'
      ELSE NULL
    END,
    CASE WHEN v_account_amount > 0 THEN 'PAGO_PARCIAL' ELSE 'PAGADO' END,
    GREATEST(0, (p->>'total')::numeric - v_account_amount),
    true,
    false,
    v_idempotency_key
  )
  RETURNING id INTO v_order_id;

  -- 4. Insertar items + decrementar stock atómicamente
  FOR v_item IN SELECT * FROM jsonb_array_elements(p->'items') LOOP
    v_quantity := (v_item->>'quantity')::numeric;

    -- Lock pesimista sobre el producto + decremento condicional
    UPDATE products
    SET current_stock = current_stock - v_quantity
    WHERE id = (v_item->>'product_id')::uuid
      AND current_stock >= v_quantity
    RETURNING id, code, name, current_stock + v_quantity AS previous_stock, current_stock AS new_stock
    INTO v_product;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock insuficiente o producto inexistente: %', v_item->>'product_id'
        USING ERRCODE = 'P0001';
    END IF;

    -- Insertar item
    INSERT INTO order_items (
      order_id,
      product_id,
      quantity_requested,
      quantity_assembled,
      quantity_delivered,
      unit_price,
      discount,
      subtotal,
      is_shortage
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_quantity,
      v_quantity,
      v_quantity,
      (v_item->>'unit_price')::numeric,
      COALESCE((v_item->>'discount')::numeric, 0),
      (v_item->>'subtotal')::numeric,
      false
    );

    -- Auditoría de stock
    INSERT INTO stock_movements (
      product_id,
      product_code,
      product_name,
      previous_stock,
      new_stock,
      quantity_changed,
      movement_type,
      created_by,
      notes,
      reference_id,
      reference_type
    ) VALUES (
      v_product.id,
      v_product.code,
      v_product.name,
      v_product.previous_stock,
      v_product.new_stock,
      -v_quantity,
      'order_assembly',
      v_user_id,
      'Venta directa ' || v_order_number,
      v_order_id,
      'order'
    );
  END LOOP;

  -- 5. Si hay monto a cuenta corriente: crear movimiento + actualizar balance
  IF v_account_amount > 0 THEN
    SELECT current_balance INTO v_current_balance
    FROM customers WHERE id = v_customer_id FOR UPDATE;

    v_new_balance := COALESCE(v_current_balance, 0) + v_account_amount;

    INSERT INTO customer_account_movements (
      customer_id,
      movement_type,
      description,
      debit_amount,
      credit_amount,
      balance_after,
      order_id,
      created_by,
      notes
    ) VALUES (
      v_customer_id,
      'DEUDA_PEDIDO',
      'Venta directa ' || v_order_number || ' - Saldo a cuenta corriente',
      v_account_amount,
      0,
      v_new_balance,
      v_order_id,
      v_user_id,
      NULL
    );

    UPDATE customers
    SET current_balance = v_new_balance
    WHERE id = v_customer_id;

    -- Registro en order_payments para que reportes existentes lo vean
    INSERT INTO order_payments (
      order_id,
      order_total,
      total_paid,
      balance_due,
      payment_status
    ) VALUES (
      v_order_id,
      (p->>'total')::numeric,
      (p->>'total')::numeric - v_account_amount,
      v_account_amount,
      'PAGO_PARCIAL'
    );
  ELSE
    -- Pago total al momento: registramos pago completo
    INSERT INTO order_payments (
      order_id,
      order_total,
      total_paid,
      balance_due,
      payment_status
    ) VALUES (
      v_order_id,
      (p->>'total')::numeric,
      (p->>'total')::numeric,
      0,
      'PAGADO'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'duplicated', false
  );

EXCEPTION WHEN OTHERS THEN
  -- ROLLBACK automático por la transacción de la función
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
END;
$$;

COMMENT ON FUNCTION confirm_direct_sale(jsonb) IS
  'Crea una venta directa atómica: orden ENTREGADA + items + stock + movimientos de cuenta + historial. Soporta idempotencia.';
