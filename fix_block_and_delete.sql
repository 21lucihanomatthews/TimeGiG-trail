-- Run this in your Supabase SQL Editor to set up blocking and deletion
-- 1. Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  blocked_id uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, blocked_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON public.blocked_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON public.blocked_users(blocked_id);

-- 2. Add cleared_all_at column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'profiles' 
        AND COLUMN_NAME = 'cleared_all_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN cleared_all_at timestamp with time zone;
    END IF;
END $$;

-- 3. Set up RLS for blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'blocked_users' 
        AND policyname = 'Users can view their own blocked list.'
    ) THEN
        CREATE POLICY "Users can view their own blocked list."
        ON public.blocked_users FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'blocked_users' 
        AND policyname = 'Users can block people.'
    ) THEN
        CREATE POLICY "Users can block people."
        ON public.blocked_users FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'blocked_users' 
        AND policyname = 'Users can unblock people.'
    ) THEN
        CREATE POLICY "Users can unblock people."
        ON public.blocked_users FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Add DELETE policy for messages (if missing)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can delete messages in their conversations.'
    ) THEN
        CREATE POLICY "Users can delete messages in their conversations."
        ON public.messages FOR DELETE
        USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    END IF;
END $$;
