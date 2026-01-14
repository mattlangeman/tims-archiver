import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, '/auth/login');
	}

	// Get article
	const { data: article, error: articleError } = await locals.supabase
		.from('articles')
		.select('*')
		.eq('id', params.id)
		.single();

	if (articleError || !article) {
		error(404, 'Article not found');
	}

	// Get citations for this article
	const { data: citations } = await locals.supabase
		.from('citations')
		.select(`
			*,
			source:sources(id, title, url, type)
		`)
		.eq('article_id', params.id)
		.order('created_at', { ascending: false });

	// Get archive records
	const { data: archives } = await locals.supabase
		.from('archive_records')
		.select('*')
		.eq('archivable_type', 'article')
		.eq('archivable_id', params.id)
		.order('created_at', { ascending: false });

	const latestArchive = archives?.[0] ?? null;

	return {
		article,
		citations: citations ?? [],
		archives: archives ?? [],
		latestArchive
	};
};

export const actions: Actions = {
	archive: async ({ params, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { error: 'You must be logged in' });
		}

		// Check if there's already a pending archive
		const { data: existing } = await locals.supabase
			.from('archive_records')
			.select('id')
			.eq('archivable_type', 'article')
			.eq('archivable_id', params.id)
			.in('status', ['pending', 'processing'])
			.single();

		if (existing) {
			return fail(400, { error: 'Archive already in progress' });
		}

		// Create pending archive record
		const { error } = await locals.supabase.from('archive_records').insert({
			user_id: user.id,
			archivable_type: 'article',
			archivable_id: params.id,
			status: 'pending'
		});

		if (error) {
			return fail(500, { error: 'Failed to request archive' });
		}

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { error: 'You must be logged in' });
		}

		const { error } = await locals.supabase.from('articles').delete().eq('id', params.id);

		if (error) {
			return fail(500, { error: 'Failed to delete article' });
		}

		redirect(303, '/articles');
	}
};
