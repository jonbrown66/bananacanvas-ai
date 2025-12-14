-- Secure credit_transactions
-- Revoke INSERT permission for authenticated users to prevent credit manipulation
REVOKE INSERT ON public.credit_transactions FROM authenticated;

-- Drop the policy that allowed users to insert their own transactions
DROP POLICY IF EXISTS "Users can insert their own credit transactions" ON public.credit_transactions;

-- Secure profiles
-- Only allow users to update specific columns (display_name, avatar_url)
-- This prevents them from updating 'credits', 'plan', etc.
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;

-- Ensure there is a policy allowing users to update their own rows (subject to column restrictions above)
-- We use DO block to check if policy exists to avoid error, or just CREATE OR REPLACE if supported (Postgres doesn't support CREATE OR REPLACE POLICY directly in standard SQL easily without dropping)
-- But for simplicity in this migration, we'll try to drop and recreate to be sure.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
