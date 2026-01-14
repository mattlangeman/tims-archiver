import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	parseArticleUrl,
	fetchPageTitle,
	domainToPublicationName
} from '$lib/apps/articles';

export interface EnrichResult {
	id: string;
	success: boolean;
	title?: string;
	publication?: string;
	realDomain?: string;
	error?: string;
}

/**
 * Enrich a single article or batch of articles with:
 * - Real domain extraction from mirror URLs
 * - Page title fetching
 * - Publication name derivation
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const articleIds: string[] = body.articleIds || [];
	const fetchTitles: boolean = body.fetchTitles ?? true;

	if (articleIds.length === 0) {
		return json({ error: 'No article IDs provided' }, { status: 400 });
	}

	// Limit batch size
	if (articleIds.length > 20) {
		return json({ error: 'Maximum 20 articles per request' }, { status: 400 });
	}

	// Fetch articles
	const { data: articles, error: fetchError } = await locals.supabase
		.from('articles')
		.select('id, url, title, publication, metadata')
		.in('id', articleIds)
		.eq('user_id', user.id);

	if (fetchError) {
		return json({ error: fetchError.message }, { status: 500 });
	}

	const results: EnrichResult[] = [];

	for (const article of articles || []) {
		if (!article.url) {
			results.push({
				id: article.id,
				success: false,
				error: 'No URL'
			});
			continue;
		}

		try {
			// Parse the URL to get real domain
			const parsed = parseArticleUrl(article.url);
			const publication = domainToPublicationName(parsed.realDomain);

			let newTitle = article.title;

			// Fetch title if requested and current title is just a domain
			if (fetchTitles) {
				// Always fetch from the stored URL (which may be a mirror)
				// Mirrors are more reliable as they cache the content
				const fetchedTitle = await fetchPageTitle(article.url);

				if (fetchedTitle && fetchedTitle.length > 0) {
					newTitle = fetchedTitle;
				}
			}

			// Update the article
			const updateData: Record<string, any> = {
				publication,
				metadata: {
					...((article.metadata as object) || {}),
					real_domain: parsed.realDomain,
					is_mirror: parsed.isMirror,
					real_url: parsed.realUrl,
					enriched_at: new Date().toISOString()
				}
			};

			// Only update title if we got a better one
			if (newTitle !== article.title) {
				updateData.title = newTitle;
			}

			const { error: updateError } = await locals.supabase
				.from('articles')
				.update(updateData)
				.eq('id', article.id);

			if (updateError) {
				results.push({
					id: article.id,
					success: false,
					error: updateError.message
				});
			} else {
				results.push({
					id: article.id,
					success: true,
					title: newTitle,
					publication,
					realDomain: parsed.realDomain
				});
			}
		} catch (err) {
			results.push({
				id: article.id,
				success: false,
				error: err instanceof Error ? err.message : 'Unknown error'
			});
		}
	}

	const succeeded = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	return json({
		succeeded,
		failed,
		results
	});
};
