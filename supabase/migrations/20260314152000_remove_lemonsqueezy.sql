-- Remove LemonSqueezy integration artifacts; Creem is the only payment provider.
DROP POLICY IF EXISTS orders_select_owner ON public.lemon_squeezy_orders;
DROP POLICY IF EXISTS subscriptions_select_owner ON public.lemon_squeezy_subscriptions;

DROP TABLE IF EXISTS public.lemon_squeezy_orders;
DROP TABLE IF EXISTS public.lemon_squeezy_subscriptions;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS lemon_squeezy_customer_id,
  DROP COLUMN IF EXISTS lemon_squeezy_subscription_id;
