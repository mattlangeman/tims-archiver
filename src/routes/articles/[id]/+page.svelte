<script lang="ts">
	import {
		ArrowLeft,
		ExternalLink,
		Archive,
		CheckCircle,
		XCircle,
		Loader2,
		Quote,
		Link2,
		Globe,
		Sparkles,
		Pencil
	} from '@lucide/svelte';
	import { Citation } from '$lib/apps/citations';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();

	let enriching = $state(false);
	let enrichError = $state<string | null>(null);
	let editing = $state(false);
	let editTitle = $state('');

	async function enrichArticle() {
		if (!data.article) return;
		enriching = true;
		enrichError = null;

		try {
			const response = await fetch('/api/articles/enrich', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ articleIds: [data.article.id], fetchTitles: true })
			});

			const result = await response.json();

			if (result.results?.[0]?.error) {
				enrichError = result.results[0].error;
			} else {
				await invalidateAll();
			}
		} catch (err) {
			enrichError = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			enriching = false;
		}
	}

	async function saveTitle() {
		if (!data.article || !editTitle.trim()) return;

		const response = await fetch(`/api/articles/${data.article.id}/title`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: editTitle.trim() })
		});

		if (response.ok) {
			editing = false;
			await invalidateAll();
		}
	}

	function startEditing() {
		editTitle = data.article?.title || '';
		editing = true;
	}

	function getDomain(url: string | null) {
		if (!url) return 'No URL';
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString();
	}

	// Get the real URL from metadata or parse it from mirror URLs
	function parseRealUrl(url: string | null): { realUrl: string | null; isMirror: boolean } {
		if (!url) return { realUrl: null, isMirror: false };
		try {
			const parsed = new URL(url);
			const host = parsed.hostname.toLowerCase();
			if (host === 'demo-sites.citeit.net' || host === 'pages.citeit.net') {
				const pathParts = parsed.pathname.split('/').filter(Boolean);
				if (pathParts.length > 0) {
					const embeddedDomain = pathParts[0];
					const remainingPath = '/' + pathParts.slice(1).join('/');
					return {
						realUrl: `https://${embeddedDomain}${remainingPath}`,
						isMirror: true
					};
				}
			}
		} catch {
			// ignore
		}
		return { realUrl: null, isMirror: false };
	}

	const metadataRealUrl = $derived((data.article?.metadata as any)?.real_url || null);
	const metadataIsMirror = $derived((data.article?.metadata as any)?.is_mirror || false);

	// Use metadata if available, otherwise parse on the fly
	const parsed = $derived(parseRealUrl(data.article?.url));
	const displayUrl = $derived(metadataRealUrl || parsed.realUrl || data.article?.url);
	const isMirror = $derived(metadataIsMirror || parsed.isMirror);
</script>

<div class="max-w-4xl mx-auto">
	<a href="/articles" class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
		<ArrowLeft class="w-4 h-4" />
		Back to Articles
	</a>

	{#if !data.article}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<p class="text-gray-600">Article not found</p>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Header -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="p-3 bg-blue-50 rounded-lg">
						<Archive class="w-6 h-6 text-blue-600" />
					</div>
					<div class="flex-1">
						{#if editing}
							<div class="flex items-center gap-2">
								<input
									type="text"
									bind:value={editTitle}
									class="flex-1 text-2xl font-bold text-gray-900 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
									onkeydown={(e) => e.key === 'Enter' && saveTitle()}
								/>
								<button
									onclick={saveTitle}
									class="p-2 text-green-600 hover:bg-green-50 rounded"
									title="Save"
								>
									<CheckCircle class="w-5 h-5" />
								</button>
								<button
									onclick={() => (editing = false)}
									class="p-2 text-gray-600 hover:bg-gray-50 rounded"
									title="Cancel"
								>
									<XCircle class="w-5 h-5" />
								</button>
							</div>
						{:else}
							<div class="flex items-center gap-2">
								<h1 class="text-2xl font-bold text-gray-900">{data.article.title}</h1>
								<button
									onclick={startEditing}
									class="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded cursor-pointer"
									title="Edit title"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									onclick={enrichArticle}
									disabled={enriching}
									class="p-1 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded disabled:opacity-50 cursor-pointer"
									title="Auto-fetch title from the article URL"
								>
									{#if enriching}
										<Loader2 class="w-4 h-4 animate-spin" />
									{:else}
										<Sparkles class="w-4 h-4" />
									{/if}
								</button>
							</div>
							{#if enrichError}
								<p class="text-sm text-red-600 mt-1">{enrichError}</p>
							{/if}
						{/if}
						{#if data.article.url}
							<a
								href={data.article.url}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
							>
								{#if isMirror}
									{getDomain(displayUrl)}
									<span class="text-xs text-gray-400 ml-1">(via mirror)</span>
								{:else}
									{getDomain(data.article.url)}
								{/if}
								<ExternalLink class="w-4 h-4" />
							</a>
						{/if}
						<div class="flex items-center gap-4 mt-3">
							{#if data.article.publication}
								<span class="text-sm px-2 py-1 rounded-full bg-blue-100 text-blue-700">
									{data.article.publication}
								</span>
							{/if}
							<span class="text-sm text-gray-500">
								Added {formatDate(data.article.created_at)}
							</span>
							{#if data.citations.length > 0}
								<span class="text-sm text-gray-500 flex items-center gap-1">
									<Quote class="w-4 h-4" />
									{data.citations.length} citations
								</span>
							{/if}
						</div>
					</div>
				</div>

				{#if data.article.notes}
					<div class="mt-4 pt-4 border-t border-gray-200">
						<h3 class="text-sm font-medium text-gray-700 mb-1">Notes</h3>
						<p class="text-gray-600">{data.article.notes}</p>
					</div>
				{/if}

			</div>

			<!-- Archive Status -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Archive Status</h2>

				<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
					<div class="flex items-center gap-3">
						<Archive class="w-5 h-5 text-gray-600" />
						<div>
							<p class="font-medium text-gray-900">Archive.org</p>
							{#if data.latestArchive?.status === 'completed'}
								<a
									href={data.latestArchive.archive_url}
									target="_blank"
									rel="noopener noreferrer"
									class="text-sm text-blue-600 hover:underline"
								>
									View archived version
								</a>
							{:else if data.latestArchive?.status === 'pending' || data.latestArchive?.status === 'processing'}
								<p class="text-sm text-gray-500">Archiving in progress...</p>
							{:else if data.latestArchive?.status === 'failed'}
								<p class="text-sm text-red-600">
									Archive failed: {data.latestArchive.error_message}
								</p>
							{:else}
								<p class="text-sm text-gray-500">Not yet archived</p>
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-2">
						{#if data.latestArchive?.status === 'completed'}
							<CheckCircle class="w-5 h-5 text-green-600" />
						{:else if data.latestArchive?.status === 'pending' || data.latestArchive?.status === 'processing'}
							<Loader2 class="w-5 h-5 text-blue-600 animate-spin" />
						{:else if data.latestArchive?.status === 'failed'}
							<XCircle class="w-5 h-5 text-red-600" />
						{:else if data.article.url}
							<form method="POST" action="?/archive" use:enhance>
								<button
									type="submit"
									class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
								>
									Archive Now
								</button>
							</form>
						{:else}
							<span class="text-sm text-gray-400">No URL to archive</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Citations -->
			{#if data.citations.length > 0}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">
						Citations ({data.citations.length})
					</h2>

					<div class="space-y-4">
						{#each data.citations as citation}
							<div class="p-4 bg-gray-50 rounded-lg">
								{#if Citation.hasQuote(citation)}
									<p class="text-gray-900 italic mb-3">
										"{Citation.getQuotePreview(citation, 200)}"
									</p>
								{/if}

								<div class="flex items-center gap-2 text-sm">
									<Globe class="w-4 h-4 text-gray-400" />
									<span class="text-gray-500">Cites:</span>
									<a
										href={citation.cited_url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-blue-600 hover:underline flex items-center gap-1"
									>
										{Citation.getCitedDomain(citation)}
										<ExternalLink class="w-3 h-3" />
									</a>
									{#if citation.source}
										<Link2 class="w-4 h-4 text-green-600 ml-2" title="Linked to source" />
										<a href="/sources/{citation.source.id}" class="text-green-600 hover:underline">
											View source
										</a>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Danger zone -->
			<div class="bg-white rounded-lg shadow-sm border border-red-200 p-6">
				<h2 class="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
				<form method="POST" action="?/delete" use:enhance>
					<button
						type="submit"
						class="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
						onclick={(e) => {
							if (!confirm('Are you sure you want to delete this article?')) {
								e.preventDefault();
							}
						}}
					>
						Delete Article
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
