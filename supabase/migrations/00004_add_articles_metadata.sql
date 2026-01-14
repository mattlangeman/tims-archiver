-- Add metadata column to articles table (matching sources table)
-- This allows storing flexible data like import origin, domain, etc.

ALTER TABLE articles ADD COLUMN metadata JSONB DEFAULT '{}';

-- Index for querying metadata
CREATE INDEX idx_articles_metadata ON articles USING GIN(metadata);
