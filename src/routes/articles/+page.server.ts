import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return { articles: [], count: 0, page: 1, perPage: 25, sortBy: 'created_at', sortDir: 'desc' };
	}

	// Parse query params
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const perPage = Math.min(100, Math.max(10, parseInt(url.searchParams.get('perPage') || '25')));
	const sortBy = url.searchParams.get('sort') || 'created_at';
	const sortDir = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';

	const offset = (page - 1) * perPage;

	// For citation count sorting, we need a different approach
	// First get all articles with citation counts, then sort in JS if sorting by citations
	if (sortBy === 'citations') {
		// Get all articles with citation counts
		const { data: allArticles, error, count } = await locals.supabase
			.from('articles')
			.select('*, citations:citations(count)', { count: 'exact' });

		if (error) {
			console.error('Error loading articles:', error);
			return { articles: [], count: 0, page, perPage, sortBy, sortDir };
		}

		// Sort by citation count
		const sorted = (allArticles ?? []).sort((a, b) => {
			const countA = a.citations?.[0]?.count ?? 0;
			const countB = b.citations?.[0]?.count ?? 0;
			return sortDir === 'asc' ? countA - countB : countB - countA;
		});

		// Paginate
		const paginated = sorted.slice(offset, offset + perPage);

		return {
			articles: paginated,
			count: count ?? 0,
			page,
			perPage,
			sortBy,
			sortDir
		};
	}

	// Standard sorting by database column
	const { data: articles, error, count } = await locals.supabase
		.from('articles')
		.select('*, citations:citations(count)', { count: 'exact' })
		.order(sortBy, { ascending: sortDir === 'asc' })
		.range(offset, offset + perPage - 1);

	if (error) {
		console.error('Error loading articles:', error);
		return { articles: [], count: 0, page, perPage, sortBy, sortDir };
	}

	return {
		articles: articles ?? [],
		count: count ?? 0,
		page,
		perPage,
		sortBy,
		sortDir
	};
};
