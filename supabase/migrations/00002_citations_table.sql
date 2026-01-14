-- Citations table for storing rich citation data from CiteIt
-- Links articles to sources with full quote context

CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- CiteIt identifiers
  sha256 VARCHAR(64) NOT NULL,
  hashkey TEXT,

  -- URLs (always stored, even if we have article/source records)
  citing_url TEXT NOT NULL,
  cited_url TEXT NOT NULL,

  -- Quote text
  citing_quote TEXT,
  cited_quote TEXT,

  -- Context around quotes
  citing_context_before TEXT,
  citing_context_after TEXT,
  cited_context_before TEXT,
  cited_context_after TEXT,

  -- Optional links to our article/source records
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,

  -- Extra metadata from CiteIt JSON
  metadata JSONB DEFAULT '{}',

  -- Source URL for the citation JSON
  citation_json_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate citations
  UNIQUE(user_id, sha256)
);

-- Indexes
CREATE INDEX idx_citations_user_id ON citations(user_id);
CREATE INDEX idx_citations_sha256 ON citations(sha256);
CREATE INDEX idx_citations_citing_url ON citations(citing_url);
CREATE INDEX idx_citations_cited_url ON citations(cited_url);
CREATE INDEX idx_citations_article_id ON citations(article_id);
CREATE INDEX idx_citations_source_id ON citations(source_id);

-- Full-text search on quotes
CREATE INDEX idx_citations_citing_quote_trgm ON citations USING GIN(citing_quote gin_trgm_ops);
CREATE INDEX idx_citations_cited_quote_trgm ON citations USING GIN(cited_quote gin_trgm_ops);

-- Updated at trigger
CREATE TRIGGER update_citations_updated_at
  BEFORE UPDATE ON citations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own citations"
  ON citations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own citations"
  ON citations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own citations"
  ON citations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own citations"
  ON citations FOR DELETE
  USING (auth.uid() = user_id);
