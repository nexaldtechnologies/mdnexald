-- Create Waitlist Table
CREATE TABLE IF NOT EXISTS tool_waitlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, tool_name)
);

-- Enable RLS
ALTER TABLE tool_waitlist ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own waitlist entry" 
ON tool_waitlist FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL); -- Allow null for non-logged in if allowed, but strict usually better.

-- Allow Service Role to do anything (Implicit) or Admins
CREATE POLICY "Admins can view all" 
ON tool_waitlist FOR SELECT 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
