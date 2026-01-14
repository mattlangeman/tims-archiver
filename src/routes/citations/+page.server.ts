import type { PageServerLoad } from './$types';
import { CitationService } from '$lib/apps/citations';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return {
			citations: [],
			count: 0,
			stats: null,
			citationsWithoutArticles: 0
		};
	}

	const [listResult, stats, withoutArticlesResult] = await Promise.all([
		CitationService.list(locals.supabase, { limit: 50 }),
		CitationService.getStats(locals.supabase),
		locals.supabase
			.from('citations')
			.select('id', { count: 'exact', head: true })
			.is('article_id', null)
	]);

	return {
		citations: listResult.data,
		count: listResult.count,
		stats,
		citationsWithoutArticles: withoutArticlesResult.count || 0
	};
};
