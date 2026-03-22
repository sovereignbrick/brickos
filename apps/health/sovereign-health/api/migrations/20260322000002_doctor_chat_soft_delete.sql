-- Add soft-delete columns to doctor_chat_conversations
ALTER TABLE doctor_chat_conversations ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE doctor_chat_conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
