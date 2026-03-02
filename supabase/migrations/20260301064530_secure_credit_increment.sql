-- Create a secure RPC for atomic increment/decrement of user credits
CREATE OR REPLACE FUNCTION increment_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + p_amount
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
