ALTER TABLE public.topups 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS proof_url text;
