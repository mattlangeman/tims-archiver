import type { SupabaseClient } from '@supabase/supabase-js';
import { RequestArchiveSchema, type ArchivableType, type ArchiveStatus } from './archive.schema';
import { ArchiveRecord, type ArchiveRecordRow } from './archive.entity';
import { createWaybackClient, parseWaybackTimestamp, type WaybackConfig } from './wayback';
import { ServiceError } from '$lib/shared/service-errors';

// ============================================================================
// Types
// ============================================================================

export interface ArchiveListOptions {
	archivable_type?: ArchivableType;
	archivable_id?: string;
	status?: ArchiveStatus;
	limit?: number;
	offset?: number;
}

// ============================================================================
// Wayback Client Instance
// ============================================================================

let waybackConfig: WaybackConfig = {};

/**
 * Configure the Wayback client with API credentials (optional)
 * Call this from hooks.server.ts with env variables
 */
export function configureWayback(config: WaybackConfig) {
	waybackConfig = config;
}

function getWaybackClient() {
	return createWaybackClient(waybackConfig);
}

// ============================================================================
// Service
// ============================================================================

export const ArchiveService = {
	/**
	 * Get an archive record by ID
	 */
	async getById(supabase: SupabaseClient, id: string): Promise<ArchiveRecordRow | null> {
		const { data, error } = await supabase.from('archive_records').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		return data as ArchiveRecordRow;
	},

	/**
	 * Get archive records for a specific item
	 */
	async getForItem(
		supabase: SupabaseClient,
		type: ArchivableType,
		id: string
	): Promise<ArchiveRecordRow[]> {
		const { data, error } = await supabase
			.from('archive_records')
			.select('*')
			.eq('archivable_type', type)
			.eq('archivable_id', id)
			.order('created_at', { ascending: false });

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return (data || []) as ArchiveRecordRow[];
	},

	/**
	 * Get the latest successful archive for an item
	 */
	async getLatestSuccessful(
		supabase: SupabaseClient,
		type: ArchivableType,
		id: string
	): Promise<ArchiveRecordRow | null> {
		const { data, error } = await supabase
			.from('archive_records')
			.select('*')
			.eq('archivable_type', type)
			.eq('archivable_id', id)
			.eq('status', 'completed')
			.order('completed_at', { ascending: false })
			.limit(1)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		return data as ArchiveRecordRow;
	},

	/**
	 * List archive records with filtering
	 */
	async list(
		supabase: SupabaseClient,
		options: ArchiveListOptions = {}
	): Promise<{ data: ArchiveRecordRow[]; count: number }> {
		const { archivable_type, archivable_id, status, limit = 20, offset = 0 } = options;

		let query = supabase.from('archive_records').select('*', { count: 'exact' });

		if (archivable_type) query = query.eq('archivable_type', archivable_type);
		if (archivable_id) query = query.eq('archivable_id', archivable_id);
		if (status) query = query.eq('status', status);

		query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return {
			data: (data || []) as ArchiveRecordRow[],
			count: count || 0
		};
	},

	/**
	 * Check if a URL is already archived at archive.org
	 */
	async checkExistingArchive(url: string): Promise<{
		exists: boolean;
		archiveUrl?: string;
		timestamp?: string;
	}> {
		const wayback = getWaybackClient();
		const result = await wayback.checkAvailability(url);

		if (result.available && result.url) {
			return {
				exists: true,
				archiveUrl: result.url,
				timestamp: result.timestamp
			};
		}

		return { exists: false };
	},

	/**
	 * Request archiving of an article or source
	 *
	 * This creates a pending archive record and optionally triggers
	 * the actual archiving (which should be done via background job in production)
	 */
	async requestArchive(
		supabase: SupabaseClient,
		input: unknown,
		userId: string,
		url: string,
		options: { triggerNow?: boolean } = {}
	): Promise<ArchiveRecordRow> {
		const result = RequestArchiveSchema.safeParse(input);
		if (!result.success) {
			throw new ServiceError.Validation(
				result.error.errors.map((e) => ({
					field: e.path.join('.'),
					message: e.message
				}))
			);
		}

		const { archivable_type, archivable_id } = result.data;

		// Check if there's already a pending archive request
		const existingPending = await supabase
			.from('archive_records')
			.select('id')
			.eq('archivable_type', archivable_type)
			.eq('archivable_id', archivable_id)
			.in('status', ['pending', 'processing'])
			.single();

		if (existingPending.data) {
			throw new ServiceError.Conflict('An archive request is already in progress');
		}

		// Create the archive record
		const { data: record, error } = await supabase
			.from('archive_records')
			.insert({
				user_id: userId,
				archivable_type,
				archivable_id,
				status: 'pending'
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		// Optionally trigger archiving immediately (for dev/testing)
		// In production, this would be handled by a background job
		if (options.triggerNow) {
			// Don't await - fire and forget
			ArchiveService.processArchive(supabase, record.id, url).catch(console.error);
		}

		return record as ArchiveRecordRow;
	},

	/**
	 * Process an archive request (call archive.org)
	 *
	 * This should typically be called by a background job, not directly
	 */
	async processArchive(
		supabase: SupabaseClient,
		recordId: string,
		url: string
	): Promise<ArchiveRecordRow> {
		// Update status to processing
		await supabase.from('archive_records').update({ status: 'processing' }).eq('id', recordId);

		const wayback = getWaybackClient();

		try {
			// First check if already archived
			const existing = await wayback.checkAvailability(url);

			if (existing.available && existing.url && existing.timestamp) {
				// Already archived, just record it
				const archiveDate = parseWaybackTimestamp(existing.timestamp);

				const { data, error } = await supabase
					.from('archive_records')
					.update({
						status: 'completed',
						archive_url: existing.url,
						archive_timestamp: archiveDate?.toISOString() ?? existing.timestamp,
						completed_at: new Date().toISOString()
					})
					.eq('id', recordId)
					.select()
					.single();

				if (error) throw error;
				return data as ArchiveRecordRow;
			}

			// Request new archive
			const saveResult = await wayback.savePage(url);

			if (saveResult.success && saveResult.archiveUrl) {
				const archiveDate = saveResult.timestamp
					? parseWaybackTimestamp(saveResult.timestamp)
					: new Date();

				const { data, error } = await supabase
					.from('archive_records')
					.update({
						status: 'completed',
						archive_url: saveResult.archiveUrl,
						archive_timestamp: archiveDate?.toISOString(),
						job_id: saveResult.jobId ?? null,
						completed_at: new Date().toISOString()
					})
					.eq('id', recordId)
					.select()
					.single();

				if (error) throw error;
				return data as ArchiveRecordRow;
			}

			// If we got a job ID, we need to poll for completion
			if (saveResult.jobId) {
				const { data, error } = await supabase
					.from('archive_records')
					.update({
						status: 'processing',
						job_id: saveResult.jobId
					})
					.eq('id', recordId)
					.select()
					.single();

				if (error) throw error;
				return data as ArchiveRecordRow;
			}

			// Archive failed
			const { data, error } = await supabase
				.from('archive_records')
				.update({
					status: 'failed',
					error_message: saveResult.error ?? 'Unknown error',
					completed_at: new Date().toISOString()
				})
				.eq('id', recordId)
				.select()
				.single();

			if (error) throw error;
			return data as ArchiveRecordRow;
		} catch (error) {
			// Update with error
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			const { data } = await supabase
				.from('archive_records')
				.update({
					status: 'failed',
					error_message: errorMessage,
					completed_at: new Date().toISOString()
				})
				.eq('id', recordId)
				.select()
				.single();

			return data as ArchiveRecordRow;
		}
	},

	/**
	 * Retry a failed archive request
	 */
	async retryArchive(
		supabase: SupabaseClient,
		recordId: string,
		userId: string,
		url: string
	): Promise<ArchiveRecordRow> {
		const existing = await ArchiveService.getById(supabase, recordId);

		if (!existing) {
			throw new ServiceError.NotFound('Archive record not found');
		}

		if (!ArchiveRecord.canBeViewedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only retry your own archive requests');
		}

		if (!ArchiveRecord.canRetry(existing)) {
			throw new ServiceError.Conflict('This archive request cannot be retried');
		}

		// Reset status to pending
		await supabase
			.from('archive_records')
			.update({
				status: 'pending',
				error_message: null,
				completed_at: null
			})
			.eq('id', recordId);

		// Trigger processing
		return ArchiveService.processArchive(supabase, recordId, url);
	},

	/**
	 * Get archive status summary for an item
	 */
	async getStatusSummary(
		supabase: SupabaseClient,
		type: ArchivableType,
		id: string
	): Promise<{
		hasArchive: boolean;
		latestArchiveUrl: string | null;
		latestArchiveDate: string | null;
		pendingRequest: boolean;
		totalArchives: number;
	}> {
		const records = await ArchiveService.getForItem(supabase, type, id);

		const completed = records.filter((r) => r.status === 'completed');
		const pending = records.some((r) => r.status === 'pending' || r.status === 'processing');
		const latest = completed[0];

		return {
			hasArchive: completed.length > 0,
			latestArchiveUrl: latest?.archive_url ?? null,
			latestArchiveDate: latest ? ArchiveRecord.formatArchiveDate(latest) : null,
			pendingRequest: pending,
			totalArchives: completed.length
		};
	}
};
