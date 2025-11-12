-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.orders;
  -- Only consider order numbers that follow the 'PED-XXXX' format
  FROM public.orders WHERE order_number ~ '^PED-[0-9]{4}$';

  RETURN 'PED-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;