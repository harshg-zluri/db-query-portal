-- Migration: Add warnings column to query_requests table
-- This allows storing security warnings for dangerous queries/scripts
-- Managers can see these warnings before approving requests

ALTER TABLE query_requests ADD COLUMN IF NOT EXISTS warnings TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN query_requests.warnings IS 'Array of security warnings (e.g., DROP TABLE, DELETE without WHERE)';
