import { z } from 'zod';

// ============================================================================
// Source Type Detection
// ============================================================================

export const sourceTypes = ['webpage', 'pdf', 'youtube', 'document', 'image'] as const;
export type SourceType = (typeof sourceTypes)[number];

/**
 * Detect source type from URL
 */
export function detectSourceType(url: string): SourceType {
	const lowercaseUrl = url.toLowerCase();

	// YouTube
	if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
		return 'youtube';
	}

	// PDF
	if (lowercaseUrl.endsWith('.pdf')) {
		return 'pdf';
	}

	// Images
	if (lowercaseUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i)) {
		return 'image';
	}

	// Documents
	if (lowercaseUrl.match(/\.(doc|docx|xls|xlsx|ppt|pptx|odt|ods|odp)(\?.*)?$/i)) {
		return 'document';
	}

	// Default to webpage
	return 'webpage';
}

/**
 * Extract YouTube video ID from URL
 */
export function extractYouTubeVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}

	return null;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const SourceSchema = z.object({
	type: z.enum(sourceTypes),
	url: z.string().url('Must be a valid URL'),
	title: z.string().min(1, 'Title is required').max(500),
	description: z.string().max(2000).nullable().optional(),
	author: z.string().max(255).nullable().optional(),
	source_date: z.coerce.date().nullable().optional(),
	tags: z.array(z.string().max(50)).max(20).optional().default([])
});

export const SourcePartialSchema = SourceSchema.partial();

/**
 * Quick add schema - just URL, we detect type and fetch metadata
 */
export const QuickAddSourceSchema = z.object({
	url: z.string().url('Must be a valid URL'),
	tags: z.array(z.string().max(50)).max(20).optional()
});

// ============================================================================
// Type Exports
// ============================================================================

export type SourceInput = z.infer<typeof SourceSchema>;
export type SourcePartialInput = z.infer<typeof SourcePartialSchema>;
export type QuickAddSourceInput = z.infer<typeof QuickAddSourceSchema>;
