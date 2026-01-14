import type { SupabaseClient } from '@supabase/supabase-js';
import {
	SourceSchema,
	SourcePartialSchema,
	QuickAddSourceSchema,
	detectSourceType,
	extractYouTubeVideoId
} from './source.schema';
import { Source, type SourceRow, type SourceWithArchiveStatus } from './source.entity';
import { ServiceError } from '$lib/shared/service-errors';

// ============================================================================
// Types
// ============================================================================

export interface SourceListOptions {
	type?: SourceRow['type'];
	tags?: string[];
	search?: string;
	hasArchive?: boolean;
	hasLocalCopy?: boolean;
	limit?: number;
	offset?: number;
	orderBy?: 'created_at' | 'updated_at' | 'title' | 'source_date';
	orderDir?: 'asc' | 'desc';
}

// ============================================================================
// Service
// ============================================================================

export const SourceService = {
	/**
	 * Get a single source by ID
	 */
	async getById(supabase: SupabaseClient, id: string): Promise<SourceRow | null> {
		const { data, error } = await supabase.from('sources').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return null; // Not found
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Get a source by ID or throw NotFound error
	 */
	async getByIdOrThrow(supabase: SupabaseClient, id: string): Promise<SourceRow> {
		const source = await SourceService.getById(supabase, id);
		if (!source) {
			throw new ServiceError.NotFound(`Source not found: ${id}`);
		}
		return source;
	},

	/**
	 * Get source with archive status information
	 */
	async getByIdWithArchiveStatus(
		supabase: SupabaseClient,
		id: string
	): Promise<SourceWithArchiveStatus | null> {
		const { data, error } = await supabase
			.from('sources')
			.select(
				`
				*,
				archive_records!inner(
					id,
					archive_url,
					archive_timestamp,
					status
				),
				local_downloads(
					id,
					download_type,
					downloaded_at
				)
			`
			)
			.eq('id', id)
			.eq('archive_records.archivable_type', 'source')
			.eq('archive_records.archivable_id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		// Transform to SourceWithArchiveStatus
		const archiveRecords = (data.archive_records || []) as Array<{
			archive_url: string | null;
			archive_timestamp: string | null;
			status: string;
		}>;
		const completedArchive = archiveRecords.find((r) => r.status === 'completed');
		const localDownloads = (data.local_downloads || []) as Array<unknown>;

		return {
			...data,
			archive_status: {
				has_archive_org: !!completedArchive,
				archive_url: completedArchive?.archive_url ?? null,
				archived_at: completedArchive?.archive_timestamp ?? null,
				has_local_copy: localDownloads.length > 0,
				local_downloads_count: localDownloads.length
			}
		} as SourceWithArchiveStatus;
	},

	/**
	 * List sources with filtering and pagination
	 */
	async list(
		supabase: SupabaseClient,
		options: SourceListOptions = {}
	): Promise<{ data: SourceRow[]; count: number }> {
		const {
			type,
			tags,
			search,
			limit = 20,
			offset = 0,
			orderBy = 'created_at',
			orderDir = 'desc'
		} = options;

		let query = supabase.from('sources').select('*', { count: 'exact' });

		// Apply filters
		if (type) {
			query = query.eq('type', type);
		}

		if (tags && tags.length > 0) {
			query = query.contains('tags', tags);
		}

		if (search) {
			query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,url.ilike.%${search}%`);
		}

		// Apply ordering and pagination
		query = query.order(orderBy, { ascending: orderDir === 'asc' }).range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return {
			data: (data || []) as SourceRow[],
			count: count || 0
		};
	},

	/**
	 * Create a new source with full data
	 */
	async create(
		supabase: SupabaseClient,
		input: unknown,
		userId: string
	): Promise<SourceRow> {
		const result = SourceSchema.safeParse(input);
		if (!result.success) {
			throw new ServiceError.Validation(
				result.error.errors.map((e) => ({
					field: e.path.join('.'),
					message: e.message
				}))
			);
		}

		const { data, error } = await supabase
			.from('sources')
			.insert({
				...result.data,
				user_id: userId,
				metadata: {}
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Quick add a source - just URL, auto-detect type and fetch metadata
	 */
	async quickAdd(
		supabase: SupabaseClient,
		input: unknown,
		userId: string
	): Promise<SourceRow> {
		const result = QuickAddSourceSchema.safeParse(input);
		if (!result.success) {
			throw new ServiceError.Validation(
				result.error.errors.map((e) => ({
					field: e.path.join('.'),
					message: e.message
				}))
			);
		}

		const { url, tags = [] } = result.data;

		// Detect source type
		const type = detectSourceType(url);

		// Build metadata based on type
		const metadata: Record<string, unknown> = {};

		if (type === 'youtube') {
			const videoId = extractYouTubeVideoId(url);
			if (videoId) {
				metadata.video_id = videoId;
				metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
			}
		}

		// Extract domain for webpages
		if (type === 'webpage') {
			try {
				const domain = new URL(url).hostname.replace(/^www\./, '');
				metadata.domain = domain;
			} catch {
				// Invalid URL, will be caught by schema validation
			}
		}

		// Create with placeholder title (to be enriched later)
		const { data, error } = await supabase
			.from('sources')
			.insert({
				type,
				url,
				title: url, // Placeholder - should be enriched via metadata extraction
				tags,
				user_id: userId,
				metadata
			})
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Update a source
	 */
	async update(
		supabase: SupabaseClient,
		id: string,
		input: unknown,
		userId: string
	): Promise<SourceRow> {
		const result = SourcePartialSchema.safeParse(input);
		if (!result.success) {
			throw new ServiceError.Validation(
				result.error.errors.map((e) => ({
					field: e.path.join('.'),
					message: e.message
				}))
			);
		}

		// Check ownership
		const existing = await SourceService.getByIdOrThrow(supabase, id);
		if (!Source.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only edit your own sources');
		}

		const { data, error } = await supabase
			.from('sources')
			.update(result.data)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Update source metadata (e.g., after fetching from URL)
	 */
	async updateMetadata(
		supabase: SupabaseClient,
		id: string,
		metadata: Record<string, unknown>,
		userId: string
	): Promise<SourceRow> {
		const existing = await SourceService.getByIdOrThrow(supabase, id);
		if (!Source.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only edit your own sources');
		}

		// Merge with existing metadata
		const mergedMetadata = { ...existing.metadata, ...metadata };

		const { data, error } = await supabase
			.from('sources')
			.update({ metadata: mergedMetadata })
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Delete a source
	 */
	async delete(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
		const existing = await SourceService.getByIdOrThrow(supabase, id);
		if (!Source.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only delete your own sources');
		}

		const { error } = await supabase.from('sources').delete().eq('id', id);

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}
	},

	/**
	 * Check if a URL already exists for this user
	 */
	async findByUrl(supabase: SupabaseClient, url: string): Promise<SourceRow | null> {
		const { data, error } = await supabase.from('sources').select('*').eq('url', url).single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Get sources linked to an article
	 */
	async getByArticleId(supabase: SupabaseClient, articleId: string): Promise<SourceRow[]> {
		const { data, error } = await supabase
			.from('article_sources')
			.select(
				`
				source:sources(*)
			`
			)
			.eq('article_id', articleId);

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return (data || []).map((row) => row.source as unknown as SourceRow);
	},

	/**
	 * Add tags to a source
	 */
	async addTags(
		supabase: SupabaseClient,
		id: string,
		tags: string[],
		userId: string
	): Promise<SourceRow> {
		const existing = await SourceService.getByIdOrThrow(supabase, id);
		if (!Source.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only edit your own sources');
		}

		// Merge tags, dedupe
		const newTags = [...new Set([...existing.tags, ...tags])];

		const { data, error } = await supabase
			.from('sources')
			.update({ tags: newTags })
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	},

	/**
	 * Remove tags from a source
	 */
	async removeTags(
		supabase: SupabaseClient,
		id: string,
		tags: string[],
		userId: string
	): Promise<SourceRow> {
		const existing = await SourceService.getByIdOrThrow(supabase, id);
		if (!Source.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only edit your own sources');
		}

		const newTags = existing.tags.filter((t) => !tags.includes(t));

		const { data, error } = await supabase
			.from('sources')
			.update({ tags: newTags })
			.eq('id', id)
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as SourceRow;
	}
};
