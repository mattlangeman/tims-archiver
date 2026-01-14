import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const archiveStatuses = ['pending', 'processing', 'completed', 'failed'] as const;
export type ArchiveStatus = (typeof archiveStatuses)[number];

export const archivableTypes = ['article', 'source'] as const;
export type ArchivableType = (typeof archivableTypes)[number];

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Request to archive a URL at archive.org
 */
export const RequestArchiveSchema = z.object({
	archivable_type: z.enum(archivableTypes),
	archivable_id: z.string().uuid()
});

/**
 * Update archive record (internal use)
 */
export const UpdateArchiveRecordSchema = z.object({
	status: z.enum(archiveStatuses).optional(),
	archive_url: z.string().url().nullable().optional(),
	archive_timestamp: z.coerce.date().nullable().optional(),
	job_id: z.string().nullable().optional(),
	error_message: z.string().nullable().optional(),
	completed_at: z.coerce.date().nullable().optional()
});

// ============================================================================
// Type Exports
// ============================================================================

export type RequestArchiveInput = z.infer<typeof RequestArchiveSchema>;
export type UpdateArchiveRecordInput = z.infer<typeof UpdateArchiveRecordSchema>;
