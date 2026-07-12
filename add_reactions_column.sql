-- Migration to add reactions column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;

-- Ensure indices for performance if needed (JSONB operations)
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING gin (reactions);

-- Update RLS policies to ensure users can update their own reactions
-- (Assuming an existing policy exists for updating messages, we might need to refine it)
-- Since reactions are stored as a map {userId: emoji}, we want users to be able to update
-- the reactions column.
