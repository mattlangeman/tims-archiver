import type { SupabaseClient } from '@supabase/supabase-js';
import { CiteItJsonSchema, type CiteItJson } from './citation.schema';
import { Citation, type CitationRow, type CitationWithRelations } from './citation.entity';
import { ServiceError } from '$lib/shared/service-errors';
import { detectSourceType } from '$lib/apps/sources';

// ============================================================================
// Types
// ============================================================================

export interface CitationListOptions {
	citing_url?: string;
	cited_url?: string;
	search?: string;
	hasLinkedSource?: boolean;
	limit?: number;
	offset?: number;
	orderBy?: 'created_at' | 'citing_url' | 'cited_url';
	orderDir?: 'asc' | 'desc';
}

export interface ImportResult {
	success: boolean;
	citation?: CitationRow;
	article?: { id: string; title: string };
	source?: { id: string; title: string };
	error?: string;
	skipped?: boolean;
	skipReason?: string;
}

export interface BulkImportProgress {
	total: number;
	processed: number;
	succeeded: number;
	failed: number;
	skipped: number;
}

// ============================================================================
// Service
// ============================================================================

export const CitationService = {
	/**
	 * Get a citation by ID
	 */
	async getById(supabase: SupabaseClient, id: string): Promise<CitationRow | null> {
		const { data, error } = await supabase.from('citations').select('*').eq('id', id).single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		return data as CitationRow;
	},

	/**
	 * Get citation with related article and source
	 */
	async getByIdWithRelations(
		supabase: SupabaseClient,
		id: string
	): Promise<CitationWithRelations | null> {
		const { data, error } = await supabase
			.from('citations')
			.select(
				`
				*,
				article:articles(id, title, url),
				source:sources(id, title, url, type)
			`
			)
			.eq('id', id)
			.single();

		if (error) {
			if (error.code === 'PGRST116') return null;
			throw new Error(`Database error: ${error.message}`);
		}

		return data as CitationWithRelations;
	},

	/**
	 * List citations with filtering
	 */
	async list(
		supabase: SupabaseClient,
		options: CitationListOptions = {}
	): Promise<{ data: CitationRow[]; count: number }> {
		const {
			citing_url,
			cited_url,
			search,
			hasLinkedSource,
			limit = 20,
			offset = 0,
			orderBy = 'created_at',
			orderDir = 'desc'
		} = options;

		let query = supabase.from('citations').select('*', { count: 'exact' });

		if (citing_url) {
			query = query.eq('citing_url', citing_url);
		}

		if (cited_url) {
			query = query.eq('cited_url', cited_url);
		}

		if (search) {
			query = query.or(
				`citing_quote.ilike.%${search}%,cited_quote.ilike.%${search}%,citing_url.ilike.%${search}%,cited_url.ilike.%${search}%`
			);
		}

		if (hasLinkedSource !== undefined) {
			if (hasLinkedSource) {
				query = query.not('source_id', 'is', null);
			} else {
				query = query.is('source_id', null);
			}
		}

		query = query.order(orderBy, { ascending: orderDir === 'asc' }).range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return {
			data: (data || []) as CitationRow[],
			count: count || 0
		};
	},

	/**
	 * Get unique citing URLs (articles)
	 */
	async getUniqueCitingUrls(supabase: SupabaseClient): Promise<{ url: string; count: number }[]> {
		const { data, error } = await supabase.from('citations').select('citing_url');

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		// Count occurrences
		const counts = new Map<string, number>();
		for (const row of data || []) {
			const url = row.citing_url;
			counts.set(url, (counts.get(url) || 0) + 1);
		}

		return Array.from(counts.entries())
			.map(([url, count]) => ({ url, count }))
			.sort((a, b) => b.count - a.count);
	},

	/**
	 * Fetch and parse CiteIt JSON from URL
	 */
	async fetchCiteItJson(jsonUrl: string): Promise<CiteItJson> {
		const response = await fetch(jsonUrl, {
			headers: {
				'User-Agent': 'TimsArchiver/1.0'
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
		}

		const json = await response.json();
		const result = CiteItJsonSchema.safeParse(json);

		if (!result.success) {
			throw new Error(`Invalid CiteIt JSON: ${result.error.message}`);
		}

		return result.data;
	},

	/**
	 * Import a single citation from CiteIt JSON URL
	 */
	async importFromUrl(
		supabase: SupabaseClient,
		jsonUrl: string,
		userId: string,
		options: { createSource?: boolean; createArticle?: boolean; batchId?: string } = {
			createSource: true,
			createArticle: true
		}
	): Promise<ImportResult> {
		const { createSource = true, createArticle = true, batchId } = options;

		try {
			// Fetch the JSON
			const citeItData = await CitationService.fetchCiteItJson(jsonUrl);

			// Check if already imported (by sha256)
			const { data: existing } = await supabase
				.from('citations')
				.select('id')
				.eq('sha256', citeItData.sha256)
				.eq('user_id', userId)
				.single();

			if (existing) {
				// Log skipped
				if (batchId) {
					await CitationService.logImport(supabase, {
						userId,
						batchId,
						jsonUrl,
						status: 'skipped',
						skipReason: 'Citation already imported'
					});
				}
				return {
					success: true,
					skipped: true,
					skipReason: 'Citation already imported'
				};
			}

			let sourceId: string | null = null;
			let sourceInfo: { id: string; title: string } | undefined;
			let articleId: string | null = null;
			let articleInfo: { id: string; title: string } | undefined;

			// Create or find article for citing_url
			if (createArticle) {
				const { data: existingArticle } = await supabase
					.from('articles')
					.select('id, title')
					.eq('url', citeItData.citing_url)
					.eq('user_id', userId)
					.single();

				if (existingArticle) {
					articleId = existingArticle.id;
					articleInfo = { id: existingArticle.id, title: existingArticle.title };
				} else {
					// Create new article
					let domain = 'unknown';
					try {
						domain = new URL(citeItData.citing_url).hostname.replace(/^www\./, '');
					} catch {
						// ignore
					}

					const { data: newArticle, error: articleError } = await supabase
						.from('articles')
						.insert({
							user_id: userId,
							url: citeItData.citing_url,
							title: domain, // Will be updated later with actual title
							status: 'draft',
							metadata: { domain, imported_from: 'citeit' }
						})
						.select('id, title')
						.single();

					if (!articleError && newArticle) {
						articleId = newArticle.id;
						articleInfo = { id: newArticle.id, title: newArticle.title };
					}
				}
			}

			// Create or find source for cited_url
			if (createSource) {
				const { data: existingSource } = await supabase
					.from('sources')
					.select('id, title')
					.eq('url', citeItData.cited_url)
					.eq('user_id', userId)
					.single();

				if (existingSource) {
					sourceId = existingSource.id;
					sourceInfo = { id: existingSource.id, title: existingSource.title };
				} else {
					// Create new source
					const sourceType = detectSourceType(citeItData.cited_url);
					let domain = 'unknown';
					try {
						domain = new URL(citeItData.cited_url).hostname.replace(/^www\./, '');
					} catch {
						// ignore
					}

					const { data: newSource, error: sourceError } = await supabase
						.from('sources')
						.insert({
							user_id: userId,
							type: sourceType,
							url: citeItData.cited_url,
							title: domain, // Will be updated later with actual title
							metadata: { domain, imported_from: 'citeit' }
						})
						.select('id, title')
						.single();

					if (!sourceError && newSource) {
						sourceId = newSource.id;
						sourceInfo = { id: newSource.id, title: newSource.title };
					}
				}
			}

			// Create citation
			const { data: citation, error } = await supabase
				.from('citations')
				.insert({
					user_id: userId,
					sha256: citeItData.sha256,
					hashkey: citeItData.hashkey || null,
					citing_url: citeItData.citing_url,
					cited_url: citeItData.cited_url,
					citing_quote: citeItData.citing_quote || null,
					cited_quote: citeItData.cited_quote || null,
					citing_context_before: citeItData.citing_context_before || null,
					citing_context_after: citeItData.citing_context_after || null,
					cited_context_before: citeItData.cited_context_before || null,
					cited_context_after: citeItData.cited_context_after || null,
					article_id: articleId,
					source_id: sourceId,
					citation_json_url: jsonUrl,
					metadata: {}
				})
				.select()
				.single();

			if (error) {
				throw new Error(`Database error: ${error.message}`);
			}

			// Log success
			if (batchId) {
				await CitationService.logImport(supabase, {
					userId,
					batchId,
					jsonUrl,
					status: 'success',
					citationId: citation.id,
					articleId: articleId || undefined,
					sourceId: sourceId || undefined
				});
			}

			return {
				success: true,
				citation: citation as CitationRow,
				article: articleInfo,
				source: sourceInfo
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			// Log failure
			if (batchId) {
				await CitationService.logImport(supabase, {
					userId,
					batchId,
					jsonUrl,
					status: 'failed',
					errorMessage
				});
			}

			return {
				success: false,
				error: errorMessage
			};
		}
	},

	/**
	 * Log an import attempt to the database
	 */
	async logImport(
		supabase: SupabaseClient,
		data: {
			userId: string;
			batchId: string;
			jsonUrl: string;
			status: 'success' | 'failed' | 'skipped';
			errorMessage?: string;
			skipReason?: string;
			citationId?: string;
			articleId?: string;
			sourceId?: string;
		}
	): Promise<void> {
		await supabase.from('citation_import_logs').insert({
			user_id: data.userId,
			import_batch_id: data.batchId,
			json_url: data.jsonUrl,
			status: data.status,
			error_message: data.errorMessage || null,
			skip_reason: data.skipReason || null,
			citation_id: data.citationId || null,
			article_id: data.articleId || null,
			source_id: data.sourceId || null
		});
	},

	/**
	 * Get import logs for a batch
	 */
	async getImportLogs(
		supabase: SupabaseClient,
		options: { batchId?: string; status?: string; limit?: number; offset?: number } = {}
	): Promise<{ data: any[]; count: number }> {
		const { batchId, status, limit = 50, offset = 0 } = options;

		let query = supabase
			.from('citation_import_logs')
			.select('*', { count: 'exact' })
			.order('created_at', { ascending: false });

		if (batchId) {
			query = query.eq('import_batch_id', batchId);
		}
		if (status) {
			query = query.eq('status', status);
		}

		query = query.range(offset, offset + limit - 1);

		const { data, error, count } = await query;

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return { data: data || [], count: count || 0 };
	},

	/**
	 * Get summary of import batches
	 */
	async getImportBatchSummary(supabase: SupabaseClient): Promise<
		{
			batchId: string;
			createdAt: string;
			total: number;
			succeeded: number;
			failed: number;
			skipped: number;
		}[]
	> {
		const { data, error } = await supabase.from('citation_import_logs').select('*');

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		// Group by batch
		const batches = new Map<
			string,
			{ createdAt: string; total: number; succeeded: number; failed: number; skipped: number }
		>();

		for (const log of data || []) {
			const batch = batches.get(log.import_batch_id) || {
				createdAt: log.created_at,
				total: 0,
				succeeded: 0,
				failed: 0,
				skipped: 0
			};

			batch.total++;
			if (log.status === 'success') batch.succeeded++;
			else if (log.status === 'failed') batch.failed++;
			else if (log.status === 'skipped') batch.skipped++;

			batches.set(log.import_batch_id, batch);
		}

		return Array.from(batches.entries())
			.map(([batchId, stats]) => ({ batchId, ...stats }))
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
	},

	/**
	 * Import multiple citations (generator for streaming progress)
	 */
	async *importBulk(
		supabase: SupabaseClient,
		jsonUrls: string[],
		userId: string,
		options: { createSource?: boolean; batchSize?: number } = {}
	): AsyncGenerator<{ result: ImportResult; progress: BulkImportProgress }> {
		const { createSource = true, batchSize = 1 } = options;

		const progress: BulkImportProgress = {
			total: jsonUrls.length,
			processed: 0,
			succeeded: 0,
			failed: 0,
			skipped: 0
		};

		for (const jsonUrl of jsonUrls) {
			const result = await CitationService.importFromUrl(supabase, jsonUrl, userId, {
				createSource
			});

			progress.processed++;
			if (result.success) {
				if (result.skipped) {
					progress.skipped++;
				} else {
					progress.succeeded++;
				}
			} else {
				progress.failed++;
			}

			yield { result, progress };
		}
	},

	/**
	 * Delete a citation
	 */
	async delete(supabase: SupabaseClient, id: string, userId: string): Promise<void> {
		const existing = await CitationService.getById(supabase, id);

		if (!existing) {
			throw new ServiceError.NotFound('Citation not found');
		}

		if (!Citation.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only delete your own citations');
		}

		const { error } = await supabase.from('citations').delete().eq('id', id);

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}
	},

	/**
	 * Link citation to an existing source
	 */
	async linkToSource(
		supabase: SupabaseClient,
		citationId: string,
		sourceId: string,
		userId: string
	): Promise<CitationRow> {
		const existing = await CitationService.getById(supabase, citationId);

		if (!existing) {
			throw new ServiceError.NotFound('Citation not found');
		}

		if (!Citation.canBeEditedBy(existing, userId)) {
			throw new ServiceError.NotAuthorized('You can only edit your own citations');
		}

		const { data, error } = await supabase
			.from('citations')
			.update({ source_id: sourceId })
			.eq('id', citationId)
			.select()
			.single();

		if (error) {
			throw new Error(`Database error: ${error.message}`);
		}

		return data as CitationRow;
	},

	/**
	 * Get stats for citations
	 */
	async getStats(
		supabase: SupabaseClient
	): Promise<{
		total: number;
		withLinkedSource: number;
		uniqueCitingUrls: number;
		uniqueCitedUrls: number;
	}> {
		const [totalResult, linkedResult, citingResult, citedResult] = await Promise.all([
			supabase.from('citations').select('id', { count: 'exact', head: true }),
			supabase
				.from('citations')
				.select('id', { count: 'exact', head: true })
				.not('source_id', 'is', null),
			supabase.from('citations').select('citing_url'),
			supabase.from('citations').select('cited_url')
		]);

		const uniqueCiting = new Set((citingResult.data || []).map((r) => r.citing_url)).size;
		const uniqueCited = new Set((citedResult.data || []).map((r) => r.cited_url)).size;

		return {
			total: totalResult.count || 0,
			withLinkedSource: linkedResult.count || 0,
			uniqueCitingUrls: uniqueCiting,
			uniqueCitedUrls: uniqueCited
		};
	}
};
