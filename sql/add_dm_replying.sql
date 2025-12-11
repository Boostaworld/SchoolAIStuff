-- Migration: Add reply_to_id to messages table for threading
-- Description: Adds a self-referencing foreign key to support replying/quoting.

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Create an index to improve performance when fetching replies
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON public.messages(reply_to_id);

-- Explicitly allow access (though RLS likely covers it via 'messages' policies)
-- Just ensuring no new policies are needed specific to this column as it's just a column add.
