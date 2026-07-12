-- Add update policy for messages to allow marking as read
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND policyname = 'Users can update their received messages to mark as read.'
    ) THEN
        CREATE POLICY "Users can update their received messages to mark as read."
        ON public.messages
        FOR UPDATE
        USING (auth.uid() = receiver_id);
    END IF;
END $$;
