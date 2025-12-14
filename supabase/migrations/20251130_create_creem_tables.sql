-- Create creem_orders table
CREATE TABLE IF NOT EXISTS creem_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    customer_id TEXT,
    status TEXT,
    amount INTEGER,
    currency TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create creem_subscriptions table
CREATE TABLE IF NOT EXISTS creem_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    status TEXT,
    plan_id TEXT,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add columns to profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'creem_customer_id') THEN
        ALTER TABLE profiles ADD COLUMN creem_customer_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'creem_subscription_id') THEN
        ALTER TABLE profiles ADD COLUMN creem_subscription_id TEXT;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE creem_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE creem_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own orders" ON creem_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own subscriptions" ON creem_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Service role policies (implicit, but good to be aware of)
-- Service role can do everything
