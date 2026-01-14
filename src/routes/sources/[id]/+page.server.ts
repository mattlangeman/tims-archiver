import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, '/auth/login');
	}

	const { data: source, error: sourceError } = await locals.supabase
		.from('sources')
		.select('*')
		.eq('id', params.id)
		.single();

	if (sourceError || !source) {
		error(404, 'Source not found');
	}

	// Get archive records
	const { data: archives } = await locals.supabase
		.from('archive_records')
		.select('*')
		.eq('archivable_type', 'source')
		.eq('archivable_id', params.id)
		.order('created_at', { ascending: false });

	// Get local downloads
	const { data: downloads } = await locals.supabase
		.from('local_downloads')
		.select('*')
		.eq('downloadable_type', 'source')
		.eq('downloadable_id', params.id)
		.order('created_at', { ascending: false });

	const latestArchive = archives?.[0] ?? null;

	return {
		source,
		archives: archives ?? [],
		latestArchive,
		downloads: downloads ?? []
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
			.eq('archivable_type', 'source')
			.eq('archivable_id', params.id)
			.in('status', ['pending', 'processing'])
			.single();

		if (existing) {
			return fail(400, { error: 'Archive already in progress' });
		}

		// Create pending archive record
		const { error } = await locals.supabase.from('archive_records').insert({
			user_id: user.id,
			archivable_type: 'source',
			archivable_id: params.id,
			status: 'pending'
		});

		if (error) {
			return fail(500, { error: 'Failed to request archive' });
		}

		// TODO: Trigger actual archiving via background job

		return { success: true };
	},

	delete: async ({ params, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { error: 'You must be logged in' });
		}

		const { error } = await locals.supabase.from('sources').delete().eq('id', params.id);

		if (error) {
			return fail(500, { error: 'Failed to delete source' });
		}

		redirect(303, '/sources');
	}
};
