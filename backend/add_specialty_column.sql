-- Add specialty column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specialty text;

-- Update trigger to handle specialty if needed (optional, as the JS code handles upsert)
-- The existing handle_new_user trigger might need updates if we want to extract specialty from metadata automatically.
-- For now, just adding the column prevents the API error.
