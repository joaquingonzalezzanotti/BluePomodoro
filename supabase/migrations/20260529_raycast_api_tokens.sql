-- Migration to add api_token to profiles for Raycast and API integrations
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS api_token uuid UNIQUE DEFAULT gen_random_uuid();

-- Backfill existing profiles with a random API token if they don't have one
UPDATE public.profiles SET api_token = gen_random_uuid() WHERE api_token IS NULL;
