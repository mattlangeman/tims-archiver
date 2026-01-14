<script lang="ts">
	import { FileText, Archive, Quote, Plus, Globe } from '@lucide/svelte';

	let { data } = $props();
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
		<p class="mt-2 text-gray-600">Archive and preserve your sources for journalism.</p>
	</div>

	{#if !data.user}
		<!-- Not logged in state -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<Globe class="w-12 h-12 mx-auto text-gray-400 mb-4" />
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Welcome to Tim's Archiver</h2>
			<p class="text-gray-600 mb-6 max-w-md mx-auto">
				A tool for journalists to archive sources at Archive.org and keep local backups of web
				pages, PDFs, and YouTube videos.
			</p>
			<div class="flex justify-center gap-4">
				<a
					href="/auth/login"
					class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
				>
					Login
				</a>
				<a
					href="/auth/register"
					class="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
				>
					Create Account
				</a>
			</div>
		</div>
	{:else}
		<!-- Logged in state -->
		<div class="grid gap-6 md:grid-cols-3">
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-3 mb-2">
					<Archive class="w-5 h-5 text-purple-600" />
					<h3 class="font-semibold text-gray-900">Articles</h3>
				</div>
				<p class="text-3xl font-bold text-gray-900">{data.articlesCount ?? 0}</p>
				<p class="text-sm text-gray-500">Your published work</p>
			</div>

			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-3 mb-2">
					<Quote class="w-5 h-5 text-green-600" />
					<h3 class="font-semibold text-gray-900">Citations</h3>
				</div>
				<p class="text-3xl font-bold text-gray-900">{data.citationsCount ?? 0}</p>
				<p class="text-sm text-gray-500">Referenced in your work</p>
			</div>

			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-center gap-3 mb-2">
					<FileText class="w-5 h-5 text-blue-600" />
					<h3 class="font-semibold text-gray-900">Sources</h3>
				</div>
				<p class="text-3xl font-bold text-gray-900">{data.sourcesCount ?? 0}</p>
				<p class="text-sm text-gray-500">Web pages, PDFs, videos</p>
			</div>
		</div>

		<!-- Quick actions -->
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
			<h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
			<div class="flex flex-wrap gap-4">
				<a
					href="/sources/new"
					class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
				>
					<Plus class="w-4 h-4" />
					Add Source
				</a>
				<a
					href="/sources"
					class="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
				>
					<FileText class="w-4 h-4" />
					View All Sources
				</a>
			</div>
		</div>

		<!-- Top articles by citations -->
		{#if data.recentArticles && data.recentArticles.length > 0}
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Top Articles</h2>
				<div class="space-y-3">
					{#each data.recentArticles as article}
						{@const citationCount = article.citations?.[0]?.count ?? 0}
						<a
							href="/articles/{article.id}"
							class="block p-3 rounded-md hover:bg-gray-50 transition-colors"
						>
							<div class="flex items-start justify-between">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900 truncate">{article.title}</p>
									<p class="text-sm text-gray-500">{article.publication ?? 'Unknown publication'}</p>
								</div>
								<span
									class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 whitespace-nowrap ml-2"
								>
									{citationCount} {citationCount === 1 ? 'citation' : 'citations'}
								</span>
							</div>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
