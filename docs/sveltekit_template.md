# CLAUDE.md

Development instructions for Claude Code.

## Project Overview

SvelteKit + Supabase app using domain-driven "apps" pattern (similar to Django).
Each app in `src/lib/apps/` is a self-contained domain module.

**Reference implementation:** See `src/lib/apps/_example/` for a complete Bookmark + Tag
example demonstrating all patterns. Once you've built your first real app, update
the references in this file to point to that app instead, then delete `_example/`.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run check    # TypeScript checking
```

## Architecture

### Apps (`src/lib/apps/`)

Each app contains these files (see `src/lib/apps/_example/` for reference):

| File | Purpose | Key Rule |
|------|---------|----------|
| `*.schema.ts` | Zod validation | Export both full and partial schemas |
| `*.entity.ts` | Computed props, business logic | NO database calls - pure functions only |
| `*.service.ts` | Database operations | All DB queries go here |
| `components/` | Domain-specific UI | Svelte components for this domain |
| `index.ts` | Barrel export | Re-export everything for clean imports |

### Data Layer Hierarchy

```
src/lib/
├── db/                          # Database layer
│   ├── types.ts                 # Auto-generated Supabase types (never edit)
│   └── client.ts                # Supabase client setup
│
├── shared/                      # Cross-cutting concerns
│   ├── service-errors.ts        # ServiceError.NotFound, .NotAuthorized, .Validation
│   ├── components/              # Shared UI (see Frontend section)
│   └── utils/
│       ├── dates.ts
│       └── formatting.ts
│
└── apps/                        # Domain modules
    └── _example/                # One app = one domain
        ├── bookmark.schema.ts   # Zod validation (BookmarkSchema, BookmarkPartialSchema)
        ├── bookmark.entity.ts   # Pure functions (Bookmark.getDomain(), .canBeEditedBy())
        ├── bookmark.service.ts  # DB operations (BookmarkService.create(), .update())
        ├── tag.schema.ts        # Related entity follows same pattern
        ├── tag.entity.ts
        ├── tag.service.ts
        ├── index.ts             # Barrel export for clean imports
        └── components/          # Domain-specific UI
```

**Data flow:** Route → Service → Database, with Schema validation and Entity logic

### Import Patterns

From outside an app, always use barrel exports:
```typescript
import { Bookmark, BookmarkService, Tag } from '$lib/apps/_example';
```

Within an app, direct imports are fine:
```typescript
import { Bookmark } from './bookmark.entity';
import { BookmarkSchema } from './bookmark.schema';
```

Database types (in a real app with generated types):
```typescript
import type { BookmarkRow, TagRow } from '$lib/db/types';
```

Service errors:
```typescript
import { ServiceError } from '$lib/shared/service-errors';
throw new ServiceError.NotFound('Bookmark not found');
throw new ServiceError.NotAuthorized('Cannot edit this bookmark');
throw new ServiceError.Validation([{ field: 'url', message: 'Invalid URL' }]);
```

### Routes are Thin

Routes (`src/routes/`) should only:
- Call services to load/mutate data
- Pass data to components
- Handle redirects and errors

Routes should NOT contain business logic.

### Data Flow

**Reading data:**

```
Route (+page.server.ts)
  ↓ Service.getById() — query + authorization
  ↓ Supabase client — fetch from DB
  ↓ Entity helpers — compute display values
  ↓ Components — render with derived values
```

**Mutations:**

```
Form submission
  ↓ Route action (+page.server.ts)
  ↓ Service.create/update/delete()
      ├── Schema.safeParse() → validation errors
      ├── Entity.canBeEditedBy() → authorization
      └── Supabase mutation
  ↓ Route handles errors, redirects on success
```

### Error Handling in Routes

Services throw typed errors that routes catch and handle:

```typescript
// In route action (+page.server.ts)
import { fail, redirect, error } from '@sveltejs/kit';
import { ServiceError } from '$lib/shared/service-errors';
import { BookmarkService } from '$lib/apps/_example';

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const { user } = await locals.safeGetSession();

    try {
      const bookmark = await BookmarkService.create(
        locals.supabase,
        Object.fromEntries(formData),
        user.id
      );
      return redirect(303, `/bookmarks/${bookmark.id}`);
    } catch (e) {
      if (e instanceof ServiceError.Validation) {
        return fail(400, { errors: e.issues, values: Object.fromEntries(formData) });
      }
      if (e instanceof ServiceError.NotAuthorized) {
        return fail(403, { message: e.message });
      }
      if (e instanceof ServiceError.NotFound) {
        return error(404, 'Bookmark not found');
      }
      throw e; // Re-throw unexpected errors
    }
  },
};
```

## Frontend

### Stack

- **Svelte 5** - Uses runes (`$state`, `$derived`, `$props`, `$effect`)
- **Tailwind CSS** - Utility-first styling
- **shadcn-svelte** - Pre-built UI components (not a library - copy/paste into your project)
- **bits-ui** - Headless components that shadcn-svelte builds on
- **tailwind-variants** - Variant-based component styling

### Svelte 5 Runes

This project uses **Svelte 5 runes** — do NOT use legacy `$:` reactive statements.

| Rune | Purpose | Example |
|------|---------|---------|
| `$state` | Reactive variable | `let count = $state(0)` |
| `$derived` | Computed value | `const double = $derived(count * 2)` |
| `$props` | Component props | `let { name, onClick }: Props = $props()` |
| `$effect` | Side effects | `$effect(() => { console.log(count) })` |

**Common patterns:**

```svelte
<script lang="ts">
  import { Bookmark, type BookmarkRow } from '$lib/apps/_example';

  // Props
  interface Props {
    bookmark: BookmarkRow;
    onDelete?: () => void;
  }
  let { bookmark, onDelete }: Props = $props();

  // Local state
  let isExpanded = $state(false);

  // Derived values (recompute when dependencies change)
  const domain = $derived(Bookmark.getDomain(bookmark));
  const canDelete = $derived(onDelete !== undefined);

  // Side effects (runs when dependencies change)
  $effect(() => {
    console.log('Bookmark changed:', bookmark.id);
  });
</script>
```

**Do NOT use legacy syntax:**

```typescript
// BAD - Svelte 4 legacy syntax
$: domain = Bookmark.getDomain(bookmark);
$: doubled = count * 2;
export let bookmark;

// GOOD - Svelte 5 runes
const domain = $derived(Bookmark.getDomain(bookmark));
const doubled = $derived(count * 2);
let { bookmark } = $props();
```

### Component Hierarchy

```
src/lib/
├── components/ui/           # shadcn-svelte primitives (Button, Card, Dialog, etc.)
│   ├── button/
│   │   ├── button.svelte
│   │   └── index.ts
│   ├── card/
│   ├── dialog/
│   └── ...
│
├── shared/components/       # Custom shared components used across apps
│   ├── FormField.svelte
│   ├── LoadingSpinner.svelte
│   └── ErrorAlert.svelte
│
├── apps/*/components/       # App-specific components
│   └── BookmarkCard.svelte  # Uses ui/ and shared/ components
│
└── utils.ts                 # cn() helper for class merging
```

**Component layers (bottom to top):**

```
App-Specific Components (lib/apps/{app}/components/)
    ↑ Domain logic via entities, presentation via UI components

Shared Components (lib/shared/components/)
    ↑ Cross-domain utilities (FormField, ErrorAlert)

UI Components (lib/components/ui/)
    ↑ Generic, reusable, no domain knowledge
```

App-specific components:
- Use entity methods for computed values
- Delegate business logic to entities
- Focus purely on presentation

### Component Imports

shadcn-svelte UI primitives:
```typescript
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Dialog from '$lib/components/ui/dialog';
```

Shared components:
```typescript
import FormField from '$lib/shared/components/FormField.svelte';
import LoadingSpinner from '$lib/shared/components/LoadingSpinner.svelte';
```

App-specific components (within the app):
```typescript
import BookmarkCard from './components/BookmarkCard.svelte';
```

### Using `cn()` for Class Merging

Always use `cn()` when combining Tailwind classes, especially with conditional classes:

```typescript
import { cn } from '$lib/utils';

// Merging base + conditional + override classes
<div class={cn(
  "rounded-lg border p-4",           // base
  isActive && "border-blue-500",     // conditional
  className                          // prop override
)}>
```

### App Component Example

App components compose UI primitives and shared components:

```svelte
<!-- src/lib/apps/_example/components/BookmarkCard.svelte -->
<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Bookmark, type BookmarkRow } from '../';

  interface Props {
    bookmark: BookmarkRow;
    onDelete?: () => void;
  }

  let { bookmark, onDelete }: Props = $props();

  // Use entity functions for computed values
  const domain = $derived(Bookmark.getDomain(bookmark));
  const relativeTime = $derived(Bookmark.formatRelativeTime(bookmark));
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>{bookmark.title}</Card.Title>
    <Card.Description>{domain} · {relativeTime}</Card.Description>
  </Card.Header>
  <Card.Content>
    {#if bookmark.description}
      <p class="text-sm text-muted-foreground">{bookmark.description}</p>
    {/if}
  </Card.Content>
  <Card.Footer>
    <Button variant="ghost" size="sm" href={bookmark.url}>Visit</Button>
    {#if onDelete}
      <Button variant="destructive" size="sm" onclick={onDelete}>Delete</Button>
    {/if}
  </Card.Footer>
</Card.Root>
```

### Adding New shadcn-svelte Components

Use the CLI to add new UI primitives:
```bash
npx shadcn-svelte@latest add dropdown-menu
npx shadcn-svelte@latest add tooltip
```

Components are added to `src/lib/components/ui/` and can be customized.

## Adding a New Entity

Follow the pattern in `src/lib/apps/_example/`. Here's the bookmark example:

### 1. Create schema (`bookmark.schema.ts`)

```typescript
import { z } from 'zod';

export const BookmarkSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(500).nullable().optional(),
  is_favorite: z.boolean().default(false),
});

// Partial schema for updates
export const BookmarkPartialSchema = BookmarkSchema.partial();

export type BookmarkInput = z.infer<typeof BookmarkSchema>;
export type BookmarkPartialInput = z.infer<typeof BookmarkPartialSchema>;
```

### 2. Create entity (`bookmark.entity.ts`)

```typescript
export interface BookmarkRow {
  id: string;
  user_id: string;
  url: string;
  title: string;
  description: string | null;
  is_favorite: boolean;
  created_at: string;
}

export const Bookmark = {
  // Computed properties - pure functions, no DB calls
  getDomain(b: BookmarkRow): string {
    return new URL(b.url).hostname.replace(/^www\./, '');
  },

  hasDescription(b: BookmarkRow): boolean {
    return b.description !== null && b.description.trim().length > 0;
  },

  // Authorization checks
  canBeEditedBy(b: BookmarkRow, userId: string): boolean {
    return b.user_id === userId;
  },

  // Display helpers
  formatRelativeTime(b: BookmarkRow): string {
    const diffDays = Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  },
};
```

### 3. Create service (`bookmark.service.ts`)

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { BookmarkSchema, BookmarkPartialSchema } from './bookmark.schema';
import { Bookmark, type BookmarkRow } from './bookmark.entity';
import { ServiceError } from '$lib/shared/service-errors';

export const BookmarkService = {
  async getById(supabase: SupabaseClient, id: string): Promise<BookmarkRow | null> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Database error: ${error.message}`);
    }
    return data as BookmarkRow;
  },

  async getByIdOrThrow(supabase: SupabaseClient, id: string): Promise<BookmarkRow> {
    const bookmark = await BookmarkService.getById(supabase, id);
    if (!bookmark) {
      throw new ServiceError.NotFound(`Bookmark not found: ${id}`);
    }
    return bookmark;
  },

  async create(supabase: SupabaseClient, input: unknown, userId: string): Promise<BookmarkRow> {
    const result = BookmarkSchema.safeParse(input);
    if (!result.success) {
      throw new ServiceError.Validation(
        result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }))
      );
    }
    // ... insert logic
  },

  async update(supabase: SupabaseClient, id: string, input: unknown, userId: string): Promise<BookmarkRow> {
    const result = BookmarkPartialSchema.safeParse(input);
    if (!result.success) {
      throw new ServiceError.Validation(/* ... */);
    }

    const existing = await BookmarkService.getByIdOrThrow(supabase, id);
    if (!Bookmark.canBeEditedBy(existing, userId)) {
      throw new ServiceError.NotAuthorized('You can only edit your own bookmarks');
    }
    // ... update logic
  },
};
```

### 4. Add to barrel export (`index.ts`)

```typescript
// Bookmark exports
export { BookmarkSchema, BookmarkPartialSchema } from './bookmark.schema';
export type { BookmarkInput, BookmarkPartialInput } from './bookmark.schema';

export { Bookmark } from './bookmark.entity';
export type { BookmarkRow, BookmarkWithTags } from './bookmark.entity';

export { BookmarkService } from './bookmark.service';
export type { BookmarkListOptions } from './bookmark.service';
```

## Anti-patterns to Avoid

**Don't put database calls in entity files:**
```typescript
// BAD - entity.ts
export const Bookmark = {
  async getRelated(b: BookmarkRow, supabase: Client) {  // NO!
    return await supabase.from('bookmarks')...
  }
};

// GOOD - service.ts
export const BookmarkService = {
  async getRelated(supabase: Client, bookmarkId: string) {
    return await supabase.from('bookmarks')...
  }
};
```

**Don't import directly from other apps' internal files:**
```typescript
// BAD
import { Bookmark } from '$lib/apps/_example/bookmark.entity';

// GOOD
import { Bookmark } from '$lib/apps/_example';
```

**Don't add business logic to routes:**
```typescript
// BAD - +page.server.ts
const domain = new URL(bookmark.url).hostname;

// GOOD - use entity function
Bookmark.getDomain(bookmark);
```

**Don't create new error classes - use ServiceError:**
```typescript
// BAD
throw new Error('Not found');

// GOOD
throw new ServiceError.NotFound('Bookmark not found');
```
