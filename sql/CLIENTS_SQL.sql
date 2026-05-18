-- ============================================
-- CLIENT REGISTRATION SYSTEM - SQL SETUP
-- ============================================
-- Run this in your Supabase SQL Editor AFTER running INBOX_COMPLETE_SQL.sql
-- ============================================

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  mail_handle TEXT UNIQUE NOT NULL,
  password TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Older DBs: table existed without password (register/login APIs require this column).
ALTER TABLE clients ADD COLUMN IF NOT EXISTS password TEXT;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_clients_username ON clients (username);
CREATE INDEX IF NOT EXISTS idx_clients_mail_handle ON clients (mail_handle);

-- ============================================
-- DONE! Clients can now register usernames.
-- ============================================


