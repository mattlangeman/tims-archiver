import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return {
			articlesCount: 0,
			citationsCount: 0,
			sourcesCount: 0,
			recentArticles: []
		};
	}

	// Get counts and top articles by citation count
	const [articlesResult, citationsResult, sourcesResult, topArticlesResult] = await Promise.all([
		locals.supabase.from('articles').select('id', { count: 'exact', head: true }),
		locals.supabase.from('citations').select('id', { count: 'exact', head: true }),
		locals.supabase.from('sources').select('id', { count: 'exact', head: true }),
		locals.supabase
			.from('articles')
			.select('id, title, url, publication, created_at, citations:citations(count)')
	]);

	// Sort by citation count descending, then take top 5
	const recentArticles = (topArticlesResult.data ?? [])
		.sort((a, b) => {
			const countA = (a.citations as { count: number }[])?.[0]?.count ?? 0;
			const countB = (b.citations as { count: number }[])?.[0]?.count ?? 0;
			return countB - countA;
		})
		.slice(0, 5);

	return {
		articlesCount: articlesResult.count ?? 0,
		citationsCount: citationsResult.count ?? 0,
		sourcesCount: sourcesResult.count ?? 0,
		recentArticles
	};
};
