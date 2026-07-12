-- Add update policy for senders to edit their own messages
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can edit their own sent messages.'
    ) THEN
        CREATE POLICY "Users can edit their own sent messages."
        ON public.messages
        FOR UPDATE
        USING (auth.uid() = sender_id);
    END IF;
END $$;
