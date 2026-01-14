<script lang="ts">
	import {
		Archive,
		ExternalLink,
		Plus,
		ChevronUp,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Sparkles,
		Loader2,
		CheckCircle
	} from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let enriching = $state(false);
	let enrichProgress = $state({ total: 0, done: 0 });
	let enrichResult = $state<{ succeeded: number; failed: number } | null>(null);

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	function getDomain(url: string | null) {
		if (!url) return 'No URL';
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	function getRealDomain(article: any): string {
		// Check metadata for real_domain first (set by enrichment)
		const realDomain = article.metadata?.real_domain;
		if (realDomain) return realDomain;

		// Check if it's a mirror URL and extract real domain
		if (article.url) {
			try {
				const parsed = new URL(article.url);
				const host = parsed.hostname.toLowerCase();
				if (host === 'demo-sites.citeit.net' || host === 'pages.citeit.net') {
					const pathParts = parsed.pathname.split('/').filter(Boolean);
					if (pathParts.length > 0) {
						return pathParts[0].replace(/^www\./, '');
					}
				}
			} catch {
				// ignore
			}
		}

		// Fall back to parsing the URL
		return getDomain(article.url);
	}

	function getCitationCount(article: any): number {
		return article.citations?.[0]?.count ?? 0;
	}

	function getSortUrl(column: string) {
		const params = new URLSearchParams($page.url.searchParams);
		const currentSort = params.get('sort') || 'created_at';
		const currentDir = params.get('dir') || 'desc';

		if (currentSort === column) {
			// Toggle direction
			params.set('dir', currentDir === 'desc' ? 'asc' : 'desc');
		} else {
			params.set('sort', column);
			params.set('dir', 'desc');
		}
		params.set('page', '1'); // Reset to first page on sort change
		return `?${params.toString()}`;
	}

	function getPageUrl(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		return `?${params.toString()}`;
	}

	const totalPages = $derived(Math.ceil(data.count / data.perPage));
	const showingFrom = $derived((data.page - 1) * data.perPage + 1);
	const showingTo = $derived(Math.min(data.page * data.perPage, data.count));

	// Find articles that need enriching (title is just a domain)
	const needsEnriching = $derived(
		data.articles.filter((a: any) => {
			// Check if title looks like a domain (no spaces, contains dots)
			const title = a.title || '';
			return !title.includes(' ') && title.includes('.') && !a.publication;
		})
	);

	async function enrichCurrentPage() {
		if (enriching) return;

		const articlesToEnrich = needsEnriching;
		if (articlesToEnrich.length === 0) return;

		enriching = true;
		enrichResult = null;
		enrichProgress = { total: articlesToEnrich.length, done: 0 };

		let totalSucceeded = 0;
		let totalFailed = 0;

		// Process in batches of 5
		const batchSize = 5;
		for (let i = 0; i < articlesToEnrich.length; i += batchSize) {
			const batch = articlesToEnrich.slice(i, i + batchSize);
			const ids = batch.map((a: any) => a.id);

			try {
				const response = await fetch('/api/articles/enrich', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ articleIds: ids, fetchTitles: true })
				});

				const result = await response.json();
				totalSucceeded += result.succeeded || 0;
				totalFailed += result.failed || 0;
			} catch {
				totalFailed += batch.length;
			}

			enrichProgress.done = Math.min(i + batchSize, articlesToEnrich.length);
		}

		enrichResult = { succeeded: totalSucceeded, failed: totalFailed };
		enriching = false;

		// Refresh data
		await invalidateAll();
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Articles</h1>
			<p class="text-gray-600">Your articles and their citations</p>
		</div>
	</div>

	{#if !data.user}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<p class="text-gray-600">
				Please <a href="/auth/login" class="text-blue-600 hover:underline">login</a> to view your articles.
			</p>
		</div>
	{:else if data.articles.length === 0 && data.page === 1}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<Archive class="w-12 h-12 mx-auto text-gray-400 mb-4" />
			<h2 class="text-lg font-semibold text-gray-900 mb-2">No articles yet</h2>
			<p class="text-gray-600 mb-4">
				Articles are created when you import citations or add them manually.
			</p>
			<a
				href="/citations/import"
				class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				<Plus class="w-4 h-4" />
				Import Citations
			</a>
		</div>
	{:else}
		<!-- Enrich Banner -->
		{#if needsEnriching.length > 0 || enriching || enrichResult}
			<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<Sparkles class="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
					<div class="flex-1">
						{#if enrichResult}
							<p class="font-medium text-purple-800">
								Enriched {enrichResult.succeeded} articles
								{#if enrichResult.failed > 0}
									<span class="text-purple-600">({enrichResult.failed} failed)</span>
								{/if}
							</p>
							<p class="text-sm text-purple-700 mt-1">
								Titles and publication names have been updated.
							</p>
						{:else if enriching}
							<p class="font-medium text-purple-800">
								Enriching articles... ({enrichProgress.done}/{enrichProgress.total})
							</p>
							<div class="mt-2 w-full bg-purple-200 rounded-full h-2">
								<div
									class="bg-purple-600 h-2 rounded-full transition-all"
									style="width: {(enrichProgress.done / enrichProgress.total) * 100}%"
								></div>
							</div>
						{:else}
							<p class="font-medium text-purple-800">
								{needsEnriching.length} articles on this page need enriching
							</p>
							<p class="text-sm text-purple-700 mt-1">
								Fetch real titles and extract publication names from mirror URLs.
							</p>
							<button
								onclick={enrichCurrentPage}
								class="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors cursor-pointer"
								title="Fetch real titles and publication names for articles that need it"
							>
								<Sparkles class="w-4 h-4" />
								Enrich Articles
							</button>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Stats -->
		<div class="grid gap-4 md:grid-cols-2">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">Total Articles</p>
				<p class="text-2xl font-bold text-gray-900">{data.count}</p>
			</div>
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
				<p class="text-sm text-gray-500">With Publication</p>
				<p class="text-2xl font-bold text-gray-900">
					{data.articles.filter((a: any) => a.publication).length}
				</p>
			</div>
		</div>

		<!-- Table -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								<a
									href={getSortUrl('title')}
									class="flex items-center gap-1 hover:text-gray-900"
								>
									Title
									{#if data.sortBy === 'title'}
										{#if data.sortDir === 'desc'}
											<ChevronDown class="w-4 h-4" />
										{:else}
											<ChevronUp class="w-4 h-4" />
										{/if}
									{/if}
								</a>
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								<a
									href={getSortUrl('publication')}
									class="flex items-center gap-1 hover:text-gray-900"
								>
									Publication
									{#if data.sortBy === 'publication'}
										{#if data.sortDir === 'desc'}
											<ChevronDown class="w-4 h-4" />
										{:else}
											<ChevronUp class="w-4 h-4" />
										{/if}
									{/if}
								</a>
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								<a
									href={getSortUrl('citations')}
									class="flex items-center gap-1 hover:text-gray-900"
								>
									Citations
									{#if data.sortBy === 'citations'}
										{#if data.sortDir === 'desc'}
											<ChevronDown class="w-4 h-4" />
										{:else}
											<ChevronUp class="w-4 h-4" />
										{/if}
									{/if}
								</a>
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								<a
									href={getSortUrl('created_at')}
									class="flex items-center gap-1 hover:text-gray-900"
								>
									Added
									{#if data.sortBy === 'created_at'}
										{#if data.sortDir === 'desc'}
											<ChevronDown class="w-4 h-4" />
										{:else}
											<ChevronUp class="w-4 h-4" />
										{/if}
									{/if}
								</a>
							</th>
							<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each data.articles as article}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<a
										href="/articles/{article.id}"
										class="font-medium text-gray-900 hover:text-blue-600"
									>
										{article.title}
									</a>
								</td>
								<td class="px-4 py-3 text-sm">
									{#if article.publication}
										<span class="text-gray-900">{article.publication}</span>
									{:else if article.url}
										<span class="text-gray-400">{getRealDomain(article)}</span>
									{:else}
										<span class="text-gray-400">-</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-900">
									{getCitationCount(article)}
								</td>
								<td class="px-4 py-3 text-sm text-gray-500">
									{formatDate(article.created_at)}
								</td>
								<td class="px-4 py-3 text-right">
									<a
										href="/articles/{article.id}"
										class="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
									>
										View
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination -->
			<div
				class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between"
			>
				<div class="text-sm text-gray-500">
					Showing {showingFrom} to {showingTo} of {data.count} articles
				</div>
				<div class="flex items-center gap-2">
					{#if data.page > 1}
						<a
							href={getPageUrl(data.page - 1)}
							class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
						>
							<ChevronLeft class="w-5 h-5" />
						</a>
					{:else}
						<span class="p-2 text-gray-300">
							<ChevronLeft class="w-5 h-5" />
						</span>
					{/if}

					<span class="text-sm text-gray-600">
						Page {data.page} of {totalPages}
					</span>

					{#if data.page < totalPages}
						<a
							href={getPageUrl(data.page + 1)}
							class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors"
						>
							<ChevronRight class="w-5 h-5" />
						</a>
					{:else}
						<span class="p-2 text-gray-300">
							<ChevronRight class="w-5 h-5" />
						</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
