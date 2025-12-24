-- User Management System & Role Sync
-- Run this in Supabase SQL Editor

-- 1. Ensure PROFILES table has 'role', 'email', and 'full_name'
DO $$
BEGIN
    -- Add 'role' if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user_unverified_unpaid';
    END IF;

    -- Add 'email' if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email text;
    END IF;

    -- Add 'full_name' if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name text;
    END IF;
END $$;

-- 2. Ensure SUBSCRIPTIONS table exists
CREATE TABLE IF NOT EXISTS public.subscriptions (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text DEFAULT 'inactive', -- active, inactive, past_due, canceled
    plan_id text,
    current_period_end timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- CRITICAL FIX: Ensure user_id has a UNIQUE constraint/index
-- This is required for "ON CONFLICT (user_id)" to work.
-- Using an INDEX is safer than changing Primary Key if one already exists.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions (user_id);

-- 3. Enable RLS on Subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Create/Update Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    initial_role text;
BEGIN
    -- Determine initial role based on verification
    IF new.email_confirmed_at IS NOT NULL THEN
        initial_role := 'user_verified_unpaid';
    ELSE
        initial_role := 'user_unverified_unpaid';
    END IF;

    -- Insert into PROFILES
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        initial_role
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        role = CASE 
            -- Protect existing Privileged Roles
            WHEN public.profiles.role IN ('admin', 'team', 'friend', 'family', 'ambassador') THEN public.profiles.role
            ELSE EXCLUDED.role 
        END;

    -- Insert into SUBSCRIPTIONS (Now supported by idx_subscriptions_user_id)
    INSERT INTO public.subscriptions (user_id, status)
    VALUES (new.id, 'inactive')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Trigger for email verification updates
CREATE OR REPLACE FUNCTION public.handle_user_verification()
RETURNS TRIGGER AS $$
BEGIN
    -- Update role if email is confirmed and user is currently unverified
    IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
        UPDATE public.profiles
        SET role = REPLACE(role, 'unverified', 'verified')
        WHERE id = new.id AND role LIKE '%unverified%';
    END IF;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_verified ON auth.users;
CREATE TRIGGER on_auth_user_verified
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_verification();

-- 7. BACKFILL EXISTING USERS
DO $$
DECLARE
    user_record RECORD;
    initial_role text;
BEGIN
    FOR user_record IN SELECT * FROM auth.users LOOP
        -- Determine Role
        IF user_record.email_confirmed_at IS NOT NULL THEN
            initial_role := 'user_verified_unpaid';
        ELSE
            initial_role := 'user_unverified_unpaid';
        END IF;

        -- Fix Profile
        INSERT INTO public.profiles (id, email, role)
        VALUES (user_record.id, user_record.email, initial_role)
        ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email; 

        -- Fix Subscription
        INSERT INTO public.subscriptions (user_id, status)
        VALUES (user_record.id, 'inactive')
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
END $$;
