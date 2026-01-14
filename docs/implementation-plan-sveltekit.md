# Tim's Archiver - Implementation Plan (SvelteKit + Supabase)

## Revised Architecture

Using the domain-driven "apps" pattern from your SvelteKit template, adapted for the archiver use case.

## Project Structure

```
tims-archiver/
├── src/
│   ├── lib/
│   │   ├── db/
│   │   │   ├── types.ts              # Auto-generated Supabase types
│   │   │   └── client.ts             # Supabase client setup
│   │   │
│   │   ├── shared/
│   │   │   ├── service-errors.ts     # ServiceError.NotFound, etc.
│   │   │   ├── components/
│   │   │   │   ├── FormField.svelte
│   │   │   │   ├── ArchiveStatus.svelte
│   │   │   │   └── SourceTypeIcon.svelte
│   │   │   └── utils/
│   │   │       ├── dates.ts
│   │   │       ├── urls.ts           # URL parsing, domain extraction
│   │   │       └── archive.ts        # Archive.org helpers
│   │   │
│   │   ├── apps/
│   │   │   ├── articles/             # Journalist's own articles
│   │   │   │   ├── article.schema.ts
│   │   │   │   ├── article.entity.ts
│   │   │   │   ├── article.service.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── ArticleCard.svelte
│   │   │   │   │   ├── ArticleForm.svelte
│   │   │   │   │   └── ArticleList.svelte
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── sources/              # Reference sources
│   │   │   │   ├── source.schema.ts
│   │   │   │   ├── source.entity.ts
│   │   │   │   ├── source.service.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── SourceCard.svelte
│   │   │   │   │   ├── SourceForm.svelte
│   │   │   │   │   ├── QuickAddSource.svelte
│   │   │   │   │   └── SourceTypeSelector.svelte
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── archives/             # Archive.org integration
│   │   │   │   ├── archive.schema.ts
│   │   │   │   ├── archive.entity.ts
│   │   │   │   ├── archive.service.ts
│   │   │   │   ├── wayback.ts        # Wayback Machine API client
│   │   │   │   ├── components/
│   │   │   │   │   ├── ArchiveButton.svelte
│   │   │   │   │   ├── ArchiveHistory.svelte
│   │   │   │   │   └── ArchiveStatusBadge.svelte
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── downloads/            # Local downloads
│   │   │   │   ├── download.schema.ts
│   │   │   │   ├── download.entity.ts
│   │   │   │   ├── download.service.ts
│   │   │   │   ├── components/
│   │   │   │   │   ├── DownloadButton.svelte
│   │   │   │   │   └── DownloadList.svelte
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   └── collections/          # Organizational groups
│   │   │       ├── collection.schema.ts
│   │   │       ├── collection.entity.ts
│   │   │       ├── collection.service.ts
│   │   │       ├── components/
│   │   │       │   ├── CollectionCard.svelte
│   │   │       │   └── CollectionPicker.svelte
│   │   │       └── index.ts
│   │   │
│   │   ├── components/ui/            # shadcn-svelte primitives
│   │   │   ├── button/
│   │   │   ├── card/
│   │   │   ├── dialog/
│   │   │   └── ...
│   │   │
│   │   └── utils.ts                  # cn() helper
│   │
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.server.ts
│   │   ├── +page.svelte              # Dashboard
│   │   ├── articles/
│   │   │   ├── +page.svelte          # Article list
│   │   │   ├── +page.server.ts
│   │   │   ├── new/
│   │   │   │   ├── +page.svelte
│   │   │   │   └── +page.server.ts
│   │   │   └── [id]/
│   │   │       ├── +page.svelte
│   │   │       ├── +page.server.ts
│   │   │       └── edit/
│   │   ├── sources/
│   │   │   ├── +page.svelte
│   │   │   ├── +page.server.ts
│   │   │   └── [id]/
│   │   ├── collections/
│   │   │   └── ...
│   │   └── api/
│   │       ├── archive/+server.ts    # Archive.org webhook handler
│   │       └── metadata/+server.ts   # URL metadata extraction
│   │
│   └── app.html
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   │   ├── 00001_initial_schema.sql
│   │   └── ...
│   ├── functions/                    # Edge Functions
│   │   ├── archive-url/              # Background archiving
│   │   └── extract-metadata/         # URL metadata extraction
│   └── config.toml
│
├── src-tauri/                        # Tauri desktop config
│   ├── src/
│   │   └── main.rs
│   ├── tauri.conf.json
│   └── Cargo.toml
│
├── capacitor.config.ts               # Mobile config
├── android/                          # Android project (generated)
├── ios/                              # iOS project (generated)
│
├── static/
├── package.json
├── svelte.config.js
├── tailwind.config.js
└── vite.config.ts
```

---

## Tech Stack Summary

| Component | Technology | Notes |
|-----------|------------|-------|
| **Framework** | SvelteKit | SSR + SPA hybrid |
| **UI** | Svelte 5, shadcn-svelte, Tailwind | Runes syntax |
| **Database** | Supabase (PostgreSQL) | + RLS for security |
| **Auth** | Supabase Auth | Email, OAuth |
| **Storage** | Supabase Storage | For downloaded files |
| **Realtime** | Supabase Realtime | Live archive status updates |
| **Background Jobs** | Supabase Edge Functions + pg_cron | Archive processing |
| **Desktop** | Tauri 2.0 | Wraps SvelteKit |
| **Mobile** | Capacitor | Wraps SvelteKit |
| **Validation** | Zod | Shared schemas |

---

## Database Schema (Supabase SQL)

```sql
-- See supabase/migrations/00001_initial_schema.sql for full schema
-- Key tables: articles, sources, article_sources, archive_records, local_downloads, collections
```

---

## Phase 1: Foundation

### 1.1 Project Setup
- [ ] Initialize SvelteKit project
- [ ] Configure Tailwind + shadcn-svelte
- [ ] Set up Supabase project
- [ ] Configure Supabase client
- [ ] Add Zod for validation

### 1.2 Database Setup
- [ ] Create initial migration with all tables
- [ ] Set up Row Level Security policies
- [ ] Generate TypeScript types from schema
- [ ] Create seed data for development

### 1.3 Auth Setup
- [ ] Configure Supabase Auth
- [ ] Create login/register pages
- [ ] Add auth guards to protected routes
- [ ] Set up session management

### 1.4 Core Apps Structure
- [ ] Create `articles` app (schema, entity, service)
- [ ] Create `sources` app (schema, entity, service)
- [ ] Create `archives` app (schema, entity, service)
- [ ] Create `downloads` app (schema, entity, service)
- [ ] Create `collections` app (schema, entity, service)

**Deliverable**: Working SvelteKit app with auth and CRUD for articles/sources

---

## Phase 2: Core Features

### 2.1 Article Management
- [ ] Article list page with filters
- [ ] Article detail page
- [ ] Create/edit article forms
- [ ] Link sources to articles

### 2.2 Source Management
- [ ] Source list page with type filters
- [ ] Source detail page
- [ ] Quick add via URL (auto-detect type)
- [ ] Metadata extraction (title, favicon, etc.)
- [ ] YouTube-specific metadata

### 2.3 UI Components
- [ ] ArticleCard, SourceCard components
- [ ] ArchiveStatusBadge component
- [ ] Type-specific icons (webpage, PDF, YouTube)
- [ ] Tag management UI

**Deliverable**: Full article and source management

---

## Phase 3: Archiving Features

### 3.1 Archive.org Integration
- [ ] Wayback Machine API client
- [ ] Check existing archives
- [ ] Request new archives
- [ ] Store archive records

### 3.2 Background Processing
- [ ] Supabase Edge Function for archiving
- [ ] pg_cron for retry scheduling
- [ ] Status updates via Realtime

### 3.3 Local Downloads
- [ ] Supabase Storage setup
- [ ] Download webpage (HTML)
- [ ] Download PDF
- [ ] Download YouTube metadata/thumbnail
- [ ] Track download records

### 3.4 Archive UI
- [ ] ArchiveButton component
- [ ] Archive status indicators
- [ ] Archive history view
- [ ] Download buttons per type

**Deliverable**: Full archiving functionality

---

## Phase 4: Desktop App (Tauri)

### 4.1 Tauri Setup
- [ ] Initialize Tauri in project
- [ ] Configure for macOS, Windows, Linux
- [ ] Set up auto-updater

### 4.2 Desktop Features
- [ ] System tray icon
- [ ] Keyboard shortcuts
- [ ] Native file dialogs
- [ ] Menu bar integration

### 4.3 Offline Support (Optional)
- [ ] Local SQLite cache
- [ ] Sync with Supabase when online

**Deliverable**: Desktop app for macOS/Windows/Linux

---

## Phase 5: Mobile App (Capacitor)

### 5.1 Capacitor Setup
- [ ] Add Capacitor to project
- [ ] Configure iOS and Android
- [ ] Build scripts for mobile

### 5.2 Mobile Optimizations
- [ ] Responsive layouts
- [ ] Touch-friendly interactions
- [ ] Share sheet integration (iOS/Android)
- [ ] Push notifications for archive completion

### 5.3 Platform-Specific
- [ ] iOS: Add to app via share extension
- [ ] Android: Share intent handling

**Deliverable**: Mobile apps for iOS and Android

---

## Phase 6: Advanced Features

### 6.1 Collections
- [ ] Create/manage collections
- [ ] Add items to collections
- [ ] Collection sharing (future)

### 6.2 Search
- [ ] Full-text search (Supabase pg_trgm)
- [ ] Advanced filters
- [ ] Saved searches

### 6.3 Import/Export
- [ ] Import from browser bookmarks
- [ ] Export to JSON/CSV
- [ ] Bulk archive operations

---

## Supabase Row Level Security

```sql
-- Users can only see their own data
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

-- Same pattern for sources, collections, etc.
```

---

## Cross-Platform Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    SvelteKit App                        │
│              (Single Codebase for All)                  │
└─────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌──────────┐         ┌──────────┐
   │   Web   │         │  Tauri   │         │Capacitor │
   │ (SSR)   │         │(Desktop) │         │ (Mobile) │
   └─────────┘         └──────────┘         └──────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   Browser              macOS/Win/Linux       iOS/Android
```

**Key benefit**: One codebase, three platforms. Changes automatically propagate.

---

## Environment Variables

```env
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Archive.org (optional)
ARCHIVE_ORG_ACCESS_KEY=
ARCHIVE_ORG_SECRET_KEY=

# App
PUBLIC_APP_URL=http://localhost:5173
```

---

## Getting Started

```bash
# Create SvelteKit project
npx sv create tims-archiver
cd tims-archiver

# Add dependencies
npm install @supabase/supabase-js zod
npx shadcn-svelte@latest init

# Start Supabase locally
supabase start

# Run migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/lib/db/types.ts

# Start dev server
npm run dev
```
