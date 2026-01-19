-- Add is_compressed column for tracking compressed execution results
ALTER TABLE query_requests ADD COLUMN IF NOT EXISTS is_compressed BOOLEAN DEFAULT FALSE;

-- Add index for filtering compressed results (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_query_requests_is_compressed ON query_requests(is_compressed) WHERE is_compressed = TRUE;
