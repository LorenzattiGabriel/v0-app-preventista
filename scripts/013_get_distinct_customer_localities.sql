CREATE OR REPLACE FUNCTION get_distinct_localities_for_user(user_id_param uuid)
RETURNS SETOF text AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT locality
    FROM customers
    WHERE (user_id_param IS NULL OR created_by = user_id_param)
      AND locality IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;
