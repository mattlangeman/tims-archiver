-- Citation import logs for persistent failure tracking
-- Records each import attempt with success/failure status

CREATE TABLE citation_import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Import batch tracking
  import_batch_id UUID NOT NULL, -- Groups URLs from same import session

  -- The URL being imported
  json_url TEXT NOT NULL,

  -- Result
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  error_message TEXT,
  skip_reason TEXT,

  -- References to created records (if successful)
  citation_id UUID REFERENCES citations(id) ON DELETE SET NULL,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_citation_import_logs_user_id ON citation_import_logs(user_id);
CREATE INDEX idx_citation_import_logs_batch_id ON citation_import_logs(import_batch_id);
CREATE INDEX idx_citation_import_logs_status ON citation_import_logs(status);
CREATE INDEX idx_citation_import_logs_created_at ON citation_import_logs(created_at DESC);

-- Row Level Security
ALTER TABLE citation_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own import logs"
  ON citation_import_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own import logs"
  ON citation_import_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own import logs"
  ON citation_import_logs FOR DELETE
  USING (auth.uid() = user_id);
