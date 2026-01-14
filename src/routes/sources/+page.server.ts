import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return { sources: [] };
	}

	const { data: sources, error } = await locals.supabase
		.from('sources')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error loading sources:', error);
		return { sources: [] };
	}

	return { sources: sources ?? [] };
};
