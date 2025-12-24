-- Chat History Storage
-- Run this in Supabase SQL Editor

-- 1. Create Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  region text,
  country text,
  is_favorite boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 2. Create Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'user' or 'model'
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Enable Security (RLS)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create Access Policies (Drop old ones first to avoid errors)

-- Sessions Policies
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can view their own sessions" ON public.chat_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert their own sessions" ON public.chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update their own sessions" ON public.chat_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete their own sessions" ON public.chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Messages Policies
DROP POLICY IF EXISTS "Users can view messages from their sessions" ON public.chat_messages;
CREATE POLICY "Users can view messages from their sessions" ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert messages to their sessions" ON public.chat_messages;
CREATE POLICY "Users can insert messages to their sessions" ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.chat_messages(session_id);
