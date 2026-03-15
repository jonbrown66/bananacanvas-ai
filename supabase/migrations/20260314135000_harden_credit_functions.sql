-- Harden credit RPC functions: only service_role can execute.
ALTER FUNCTION public.increment_credits(UUID, INTEGER) SET search_path = public;
REVOKE ALL ON FUNCTION public.increment_credits(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_credits(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.increment_credits(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_credits(UUID, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'p_amount must be positive';
  END IF;

  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) - p_amount
  WHERE id = p_user_id
    AND COALESCE(credits, 0) >= p_amount;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_credits(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_credits(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.consume_credits(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(UUID, INTEGER) TO service_role;
