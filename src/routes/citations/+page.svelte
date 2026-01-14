<script lang="ts">
	import { Quote, ExternalLink, Link2, Upload, FileText, AlertTriangle, Loader2 } from '@lucide/svelte';
	import { Citation } from '$lib/apps/citations';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let backfilling = $state(false);
	let backfillResult = $state<{ created: number; linked: number } | null>(null);
	let backfillError = $state<string | null>(null);

	async function runBackfill() {
		backfilling = true;
		backfillResult = null;
		backfillError = null;

		try {
			const response = await fetch('/api/citations/backfill-articles', {
				method: 'POST'
			});

			const result = await response.json();

			if (!response.ok) {
				backfillError = result.error || 'Backfill failed';
			} else {
				backfillResult = result;
				// Refresh the page data
				await invalidateAll();
			}
		} catch (err) {
			backfillError = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			backfilling = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Citations</h1>
			<p class="text-gray-600">Quotes and references linking articles to sources</p>
		</div>
		<a
			href="/citations/import"
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
		>
			<Upload class="w-4 h-4" />
			Import Citations
		</a>
	</div>

	{#if !data.user}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<p class="text-gray-600">
				Please <a href="/auth/login" class="text-blue-600 hover:underline">login</a> to view citations.
			</p>
		</div>
	{:else}
		<!-- Stats -->
		<div class="grid gap-4 md:grid-cols-4">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Total Citations</p>
				<p class="text-2xl font-bold text-gray-900">{data.stats?.total ?? 0}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Linked to Sources</p>
				<p class="text-2xl font-bold text-gray-900">{data.stats?.withLinkedSource ?? 0}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Unique Articles</p>
				<p class="text-2xl font-bold text-gray-900">{data.stats?.uniqueCitingUrls ?? 0}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Unique Sources</p>
				<p class="text-2xl font-bold text-gray-900">{data.stats?.uniqueCitedUrls ?? 0}</p>
			</div>
		</div>

		<!-- Backfill Articles Notice -->
		{#if data.citationsWithoutArticles > 0}
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<AlertTriangle class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						<p class="font-medium text-yellow-800">
							{data.citationsWithoutArticles} citations without linked articles
						</p>
						<p class="text-sm text-yellow-700 mt-1">
							Create Article records for each unique citing URL and link them to citations.
						</p>

						{#if backfillResult}
							<div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
								<p class="text-sm text-green-800">
									Created {backfillResult.created} articles and linked {backfillResult.linked} citations.
								</p>
							</div>
						{/if}

						{#if backfillError}
							<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
								<p class="text-sm text-red-800">{backfillError}</p>
							</div>
						{/if}

						<button
							onclick={runBackfill}
							disabled={backfilling}
							class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white font-medium rounded-md transition-colors"
						>
							{#if backfilling}
								<Loader2 class="w-4 h-4 animate-spin" />
								Backfilling...
							{:else}
								<FileText class="w-4 h-4" />
								Backfill Articles
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/if}

		{#if data.citations.length === 0}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
				<Quote class="w-12 h-12 mx-auto text-gray-400 mb-4" />
				<h2 class="text-lg font-semibold text-gray-900 mb-2">No citations yet</h2>
				<p class="text-gray-600 mb-4">Import citations from your CiteIt data.</p>
				<a
					href="/citations/import"
					class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
				>
					<Upload class="w-4 h-4" />
					Import Citations
				</a>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
				{#each data.citations as citation}
					<div class="p-4 hover:bg-gray-50 transition-colors">
						<div class="flex items-start gap-4">
							<div class="p-2 bg-blue-50 rounded-lg flex-shrink-0">
								<Quote class="w-5 h-5 text-blue-600" />
							</div>
							<div class="flex-1 min-w-0">
								<!-- Quote preview -->
								{#if Citation.hasQuote(citation)}
									<p class="text-gray-900 italic mb-2">
										"{Citation.getQuotePreview(citation, 200)}"
									</p>
								{/if}

								<!-- URLs -->
								<div class="flex flex-col gap-1 text-sm">
									<div class="flex items-center gap-2">
										<span class="text-gray-500 w-16">From:</span>
										<a
											href={citation.citing_url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-blue-600 hover:underline truncate flex items-center gap-1"
										>
											{Citation.getCitingDomain(citation)}
											<ExternalLink class="w-3 h-3 flex-shrink-0" />
										</a>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-gray-500 w-16">To:</span>
										<a
											href={citation.cited_url}
											target="_blank"
											rel="noopener noreferrer"
											class="text-blue-600 hover:underline truncate flex items-center gap-1"
										>
											{Citation.getCitedDomain(citation)}
											<ExternalLink class="w-3 h-3 flex-shrink-0" />
										</a>
										{#if citation.source_id}
											<Link2 class="w-4 h-4 text-green-600" title="Linked to source" />
										{/if}
									</div>
								</div>

								<!-- Meta -->
								<div class="flex items-center gap-4 mt-2 text-xs text-gray-500">
									<span>Hash: {Citation.getShortHash(citation)}</span>
									<span>{Citation.formatRelativeTime(citation)}</span>
								</div>
							</div>
							<a
								href="/citations/{citation.id}"
								class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
							>
								View
							</a>
						</div>
					</div>
				{/each}
			</div>

			<!-- Pagination placeholder -->
			{#if data.count > data.citations.length}
				<p class="text-center text-sm text-gray-500">
					Showing {data.citations.length} of {data.count} citations
				</p>
			{/if}
		{/if}
	{/if}
</div>
