-- Add missing columns
ALTER TABLE public.topups 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS proof_url text;

-- Add insert policy for topups
DROP POLICY IF EXISTS "Users can insert topups" ON public.topups;
CREATE POLICY "Users can insert topups" 
ON public.topups FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add update policy for topups (admin can update status)
DROP POLICY IF EXISTS "Users can update topups" ON public.topups;
CREATE POLICY "Users can update topups" 
ON public.topups FOR UPDATE 
USING (true);
