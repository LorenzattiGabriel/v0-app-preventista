-- Mejorar la función generate_customer_code para manejar códigos no numéricos
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Obtener el siguiente número solo de códigos que sigan el formato CLI-XXXX
  -- donde XXXX es un número
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^CLI-[0-9]+$' 
      THEN CAST(SUBSTRING(code FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_num
  FROM public.customers;
  
  RETURN 'CLI-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

