import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { detectSourceType, extractYouTubeVideoId } from '$lib/apps/sources';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, '/auth/login');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();

		if (!user) {
			return fail(401, { error: 'You must be logged in' });
		}

		const formData = await request.formData();
		const url = formData.get('url') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const tagsRaw = formData.get('tags') as string;
		const archiveNow = formData.get('archive_now') === 'true';

		// Validate URL
		if (!url) {
			return fail(400, {
				error: 'URL is required',
				values: { url, title, description, tags: tagsRaw }
			});
		}

		try {
			new URL(url);
		} catch {
			return fail(400, {
				error: 'Invalid URL',
				values: { url, title, description, tags: tagsRaw }
			});
		}

		// Detect source type
		const type = detectSourceType(url);

		// Parse tags
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		// Build metadata
		const metadata: Record<string, unknown> = {};

		if (type === 'youtube') {
			const videoId = extractYouTubeVideoId(url);
			if (videoId) {
				metadata.video_id = videoId;
				metadata.thumbnail_url = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
			}
		}

		if (type === 'webpage') {
			try {
				const domain = new URL(url).hostname.replace(/^www\./, '');
				metadata.domain = domain;
			} catch {
				// ignore
			}
		}

		// Create source
		const { data: source, error } = await locals.supabase
			.from('sources')
			.insert({
				user_id: user.id,
				type,
				url,
				title: title || url,
				description: description || null,
				tags,
				metadata
			})
			.select()
			.single();

		if (error) {
			console.error('Error creating source:', error);
			return fail(500, {
				error: 'Failed to create source',
				values: { url, title, description, tags: tagsRaw }
			});
		}

		// Request archive if checkbox was checked
		if (archiveNow && source) {
			// Create pending archive record
			await locals.supabase.from('archive_records').insert({
				user_id: user.id,
				archivable_type: 'source',
				archivable_id: source.id,
				status: 'pending'
			});

			// TODO: Trigger actual archiving via background job or edge function
		}

		redirect(303, `/sources/${source.id}`);
	}
};
