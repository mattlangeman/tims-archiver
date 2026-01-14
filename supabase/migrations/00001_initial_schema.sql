-- Tim's Archiver - Initial Schema
-- This migration creates all core tables for the archiving application

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE source_type AS ENUM (
  'webpage',
  'pdf',
  'youtube',
  'document',
  'image'
);

CREATE TYPE article_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE archive_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TYPE archivable_type AS ENUM (
  'article',
  'source'
);

CREATE TYPE download_type AS ENUM (
  'html',
  'mhtml',
  'pdf',
  'video',
  'screenshot',
  'original'
);

-- ============================================================================
-- Articles
-- ============================================================================

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  url TEXT,
  publication VARCHAR(255),
  published_at TIMESTAMPTZ,
  status article_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published_at ON articles(published_at);
CREATE INDEX idx_articles_tags ON articles USING GIN(tags);
CREATE INDEX idx_articles_title_trgm ON articles USING GIN(title gin_trgm_ops);

-- ============================================================================
-- Sources
-- ============================================================================

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type source_type NOT NULL,
  url TEXT NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  author VARCHAR(255),
  source_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sources_user_id ON sources(user_id);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_sources_url ON sources(url);
CREATE INDEX idx_sources_tags ON sources USING GIN(tags);
CREATE INDEX idx_sources_title_trgm ON sources USING GIN(title gin_trgm_ops);
CREATE INDEX idx_sources_metadata ON sources USING GIN(metadata);

-- ============================================================================
-- Article-Source Relationship
-- ============================================================================

CREATE TABLE article_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  context TEXT,
  citation_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(article_id, source_id)
);

CREATE INDEX idx_article_sources_article ON article_sources(article_id);
CREATE INDEX idx_article_sources_source ON article_sources(source_id);

-- ============================================================================
-- Archive Records
-- ============================================================================

CREATE TABLE archive_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archivable_type archivable_type NOT NULL,
  archivable_id UUID NOT NULL,
  archive_url TEXT,
  archive_timestamp TIMESTAMPTZ,
  status archive_status NOT NULL DEFAULT 'pending',
  job_id VARCHAR(255),
  error_message TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_archive_records_user ON archive_records(user_id);
CREATE INDEX idx_archive_records_archivable ON archive_records(archivable_type, archivable_id);
CREATE INDEX idx_archive_records_status ON archive_records(status);

-- ============================================================================
-- Local Downloads
-- ============================================================================

CREATE TABLE local_downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloadable_type archivable_type NOT NULL,
  downloadable_id UUID NOT NULL,
  storage_path TEXT NOT NULL,  -- Path in Supabase Storage
  file_size_bytes BIGINT,
  file_hash VARCHAR(64),
  mime_type VARCHAR(100),
  download_type download_type NOT NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_local_downloads_user ON local_downloads(user_id);
CREATE INDEX idx_local_downloads_downloadable ON local_downloads(downloadable_type, downloadable_id);

-- ============================================================================
-- Collections
-- ============================================================================

CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_collections_user_id ON collections(user_id);

-- ============================================================================
-- Collection Items
-- ============================================================================

CREATE TABLE collection_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  item_type archivable_type NOT NULL,
  item_id UUID NOT NULL,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, item_type, item_id)
);

CREATE INDEX idx_collection_items_collection ON collection_items(collection_id);
CREATE INDEX idx_collection_items_item ON collection_items(item_type, item_id);

-- ============================================================================
-- Updated At Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at
  BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Articles policies
CREATE POLICY "Users can view own articles"
  ON articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own articles"
  ON articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
  ON articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own articles"
  ON articles FOR DELETE
  USING (auth.uid() = user_id);

-- Sources policies
CREATE POLICY "Users can view own sources"
  ON sources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sources"
  ON sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sources"
  ON sources FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sources"
  ON sources FOR DELETE
  USING (auth.uid() = user_id);

-- Article-Sources policies (user must own the article)
CREATE POLICY "Users can view own article_sources"
  ON article_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_sources.article_id
      AND articles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own article_sources"
  ON article_sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_sources.article_id
      AND articles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own article_sources"
  ON article_sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM articles
      WHERE articles.id = article_sources.article_id
      AND articles.user_id = auth.uid()
    )
  );

-- Archive records policies
CREATE POLICY "Users can view own archive_records"
  ON archive_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archive_records"
  ON archive_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own archive_records"
  ON archive_records FOR UPDATE
  USING (auth.uid() = user_id);

-- Local downloads policies
CREATE POLICY "Users can view own local_downloads"
  ON local_downloads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own local_downloads"
  ON local_downloads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own local_downloads"
  ON local_downloads FOR DELETE
  USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Users can view own collections"
  ON collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections FOR DELETE
  USING (auth.uid() = user_id);

-- Collection items policies
CREATE POLICY "Users can view own collection_items"
  ON collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own collection_items"
  ON collection_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collection_items"
  ON collection_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Storage Bucket Setup (run via Supabase dashboard or API)
-- ============================================================================

-- Note: Execute this in the Supabase SQL editor or via the dashboard
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('downloads', 'downloads', false);

-- Storage policies would be:
-- CREATE POLICY "Users can upload own files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'downloads'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can view own files"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'downloads'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete own files"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'downloads'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
