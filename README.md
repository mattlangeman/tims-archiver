# Tim's Archiver

A personal web archiving application designed for journalists to preserve their articles and sources. Save webpages, PDFs, YouTube videos, and other content with automatic Archive.org integration and local backups.

## Features

- **Archive to Archive.org** - Create permanent snapshots via the Wayback Machine
- **Local Downloads** - Keep local copies of web pages, PDFs, and videos
- **Source Management** - Track sources with metadata (webpages, PDFs, YouTube, documents, images)
- **Article Tracking** - Organize articles with citations linked to archived sources
- **Collections** - Group related sources and articles together
- **Full-text Search** - Find content across your entire archive

## Tech Stack

- [SvelteKit](https://kit.svelte.dev/) with Svelte 5
- [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn-svelte](https://shadcn-svelte.com/) UI components
- [Zod](https://zod.dev/) validation

## Installation

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repository-url>
   cd tims-archiver
   npm install
   ```

2. Create your environment file:

   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:

   ```env
   # Required - Supabase Configuration
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Optional - Archive.org API (for higher rate limits)
   ARCHIVE_ORG_ACCESS_KEY=
   ARCHIVE_ORG_SECRET_KEY=
   ```

   **Finding your Supabase credentials:**
   - Go to your [Supabase dashboard](https://app.supabase.com/)
   - Select your project
   - Navigate to **Settings** > **API**
   - Copy the **Project URL** for `PUBLIC_SUPABASE_URL`
   - Copy the **anon public** key for `PUBLIC_SUPABASE_ANON_KEY`

   **Archive.org API keys (optional):**
   - Sign up at https://archive.org/account/s3.php
   - These keys enable higher rate limits when archiving content

4. Set up the database:

   Run all migrations in your Supabase project. Migrations must be run **in order**:

   | Migration | Purpose |
   |-----------|---------|
   | `00001_initial_schema.sql` | Core tables (users, articles, sources, collections) |
   | `00002_citations_table.sql` | Citations with quote context |
   | `00003_citation_import_logs.sql` | Import batch tracking |
   | `00004_add_articles_metadata.sql` | Article metadata fields |

   ```bash
   # Option A: Using Supabase CLI (recommended)
   supabase db push

   # Option B: Manual via SQL Editor
   # 1. Go to Supabase Dashboard > SQL Editor
   # 2. Copy and run each file in supabase/migrations/ in order
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   Open http://localhost:5173

6. **(Optional) Import citation data:**

   The repository includes `citations.txt` with 6,434 citation URLs from CiteIt. To import:

   1. Register an account and log in at http://localhost:5173
   2. Navigate to **Citations → Import** (or go to `/citations/import`)
   3. Drag and drop `citations.txt` onto the upload area
   4. Click **Start Import**

   The importer will:
   - Process citations in batches of 10
   - Show real-time progress (imported/skipped/failed)
   - Create Article records for citing URLs
   - Create Source records for cited URLs
   - Skip duplicates automatically

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | TypeScript type checking |

## Project Structure

```
src/
├── lib/
│   ├── apps/              # Domain modules
│   │   ├── sources/       # Source management
│   │   ├── archives/      # Archive.org integration
│   │   ├── articles/      # Article management
│   │   └── citations/     # Citation tracking
│   ├── components/ui/     # shadcn-svelte components
│   ├── db/                # Database client and types
│   └── shared/            # Cross-cutting concerns
├── routes/                # SvelteKit routes
└── hooks.server.ts        # Server hooks (auth)
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Architecture and development guide
- [Implementation Plan](./docs/implementation-plan-sveltekit.md)
