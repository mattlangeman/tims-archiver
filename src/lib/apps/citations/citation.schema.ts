import { z } from 'zod';

// ============================================================================
// CiteIt JSON Schema (from external API)
// ============================================================================

export const CiteItJsonSchema = z.object({
	sha256: z.string(),
	hashkey: z.string().optional(),
	citing_url: z.string().url(),
	cited_url: z.string().url(),
	citing_quote: z.string().optional(),
	cited_quote: z.string().optional(),
	citing_context_before: z.string().optional(),
	citing_context_after: z.string().optional(),
	cited_context_before: z.string().optional(),
	cited_context_after: z.string().optional()
});

export type CiteItJson = z.infer<typeof CiteItJsonSchema>;

// ============================================================================
// Citation Schemas
// ============================================================================

export const CitationSchema = z.object({
	sha256: z.string().max(64),
	hashkey: z.string().nullable().optional(),
	citing_url: z.string().url(),
	cited_url: z.string().url(),
	citing_quote: z.string().nullable().optional(),
	cited_quote: z.string().nullable().optional(),
	citing_context_before: z.string().nullable().optional(),
	citing_context_after: z.string().nullable().optional(),
	cited_context_before: z.string().nullable().optional(),
	cited_context_after: z.string().nullable().optional(),
	article_id: z.string().uuid().nullable().optional(),
	source_id: z.string().uuid().nullable().optional(),
	citation_json_url: z.string().url().nullable().optional(),
	metadata: z.record(z.unknown()).optional()
});

export const CitationPartialSchema = CitationSchema.partial();

// ============================================================================
// Import Schemas
// ============================================================================

export const ImportCitationSchema = z.object({
	json_url: z.string().url()
});

export const BulkImportSchema = z.object({
	json_urls: z.array(z.string().url())
});

// ============================================================================
// Type Exports
// ============================================================================

export type CitationInput = z.infer<typeof CitationSchema>;
export type CitationPartialInput = z.infer<typeof CitationPartialSchema>;
export type ImportCitationInput = z.infer<typeof ImportCitationSchema>;
export type BulkImportInput = z.infer<typeof BulkImportSchema>;
