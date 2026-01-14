import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { CitationService } from '$lib/apps/citations';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user } = await locals.safeGetSession();

	if (!user) {
		redirect(303, '/auth/login');
	}

	const batchId = url.searchParams.get('batch');
	const statusFilter = url.searchParams.get('status');

	// Get logs for specific batch or all recent logs
	const { data: logs, count } = await CitationService.getImportLogs(locals.supabase, {
		batchId: batchId || undefined,
		status: statusFilter || undefined,
		limit: 100
	});

	// Get batch summaries for navigation
	const batches = await CitationService.getImportBatchSummary(locals.supabase);

	return {
		logs,
		count,
		batches,
		currentBatchId: batchId,
		statusFilter
	};
};
