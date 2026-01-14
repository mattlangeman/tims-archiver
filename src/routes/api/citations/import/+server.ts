import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CitationService } from '$lib/apps/citations';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const urls: string[] = body.urls || [];
	const batchId: string = body.batchId || crypto.randomUUID();

	if (urls.length === 0) {
		return json({ error: 'No URLs provided' }, { status: 400 });
	}

	let succeeded = 0;
	let failed = 0;
	let skipped = 0;
	const errors: string[] = [];

	for (const url of urls) {
		try {
			const result = await CitationService.importFromUrl(locals.supabase, url, user.id, {
				createSource: true,
				createArticle: true,
				batchId
			});

			if (result.success) {
				if (result.skipped) {
					skipped++;
				} else {
					succeeded++;
				}
			} else {
				failed++;
				if (result.error) {
					errors.push(`${url.slice(-20)}: ${result.error}`);
				}
			}
		} catch (err) {
			failed++;
			errors.push(`${url.slice(-20)}: ${err instanceof Error ? err.message : 'Unknown error'}`);
		}
	}

	return json({
		batchId,
		succeeded,
		failed,
		skipped,
		errors: errors.slice(0, 10) // Return first 10 errors
	});
};
