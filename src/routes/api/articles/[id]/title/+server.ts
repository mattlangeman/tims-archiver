import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const title = body.title?.trim();

	if (!title) {
		return json({ error: 'Title is required' }, { status: 400 });
	}

	const { error } = await locals.supabase
		.from('articles')
		.update({ title })
		.eq('id', params.id)
		.eq('user_id', user.id);

	if (error) {
		return json({ error: error.message }, { status: 500 });
	}

	return json({ success: true, title });
};
