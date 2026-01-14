import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Backfill articles from existing citations.
 * Creates an Article for each unique citing_url and links citations to it.
 */
export const POST: RequestHandler = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get all unique citing_urls from citations that don't have an article_id
	const { data: citations, error: fetchError } = await locals.supabase
		.from('citations')
		.select('id, citing_url')
		.is('article_id', null);

	if (fetchError) {
		return json({ error: fetchError.message }, { status: 500 });
	}

	if (!citations || citations.length === 0) {
		return json({ message: 'No citations need backfilling', created: 0, linked: 0 });
	}

	// Group by citing_url
	const urlToCitations = new Map<string, string[]>();
	for (const citation of citations) {
		const existing = urlToCitations.get(citation.citing_url) || [];
		existing.push(citation.id);
		urlToCitations.set(citation.citing_url, existing);
	}

	let articlesCreated = 0;
	let citationsLinked = 0;
	const errors: string[] = [];

	for (const [citingUrl, citationIds] of urlToCitations) {
		try {
			// Check if article already exists for this URL
			const { data: existingArticle } = await locals.supabase
				.from('articles')
				.select('id')
				.eq('url', citingUrl)
				.eq('user_id', user.id)
				.single();

			let articleId: string;

			if (existingArticle) {
				articleId = existingArticle.id;
			} else {
				// Create new article
				let domain = 'unknown';
				try {
					domain = new URL(citingUrl).hostname.replace(/^www\./, '');
				} catch {
					// ignore
				}

				const { data: newArticle, error: insertError } = await locals.supabase
					.from('articles')
					.insert({
						user_id: user.id,
						url: citingUrl,
						title: domain,
						status: 'draft',
						metadata: { domain, imported_from: 'citeit' }
					})
					.select('id')
					.single();

				if (insertError || !newArticle) {
					errors.push(`Failed to create article for ${citingUrl}: ${insertError?.message}`);
					continue;
				}

				articleId = newArticle.id;
				articlesCreated++;
			}

			// Link all citations with this citing_url to the article
			const { error: updateError } = await locals.supabase
				.from('citations')
				.update({ article_id: articleId })
				.in('id', citationIds);

			if (updateError) {
				errors.push(`Failed to link citations: ${updateError.message}`);
			} else {
				citationsLinked += citationIds.length;
			}
		} catch (err) {
			errors.push(`Error processing ${citingUrl}: ${err}`);
		}
	}

	return json({
		created: articlesCreated,
		linked: citationsLinked,
		uniqueUrls: urlToCitations.size,
		errors: errors.slice(0, 10)
	});
};
