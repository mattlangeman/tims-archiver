<script lang="ts">
	import { Globe, FileText, Youtube, Image, File, Plus, ExternalLink, Archive } from '@lucide/svelte';
	import { Source } from '$lib/apps/sources';

	let { data } = $props();

	const typeIcons: Record<string, typeof Globe> = {
		webpage: Globe,
		pdf: FileText,
		youtube: Youtube,
		image: Image,
		document: File
	};

	function getIcon(type: string) {
		return typeIcons[type] ?? Globe;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Sources</h1>
			<p class="text-gray-600">Web pages, PDFs, and videos you've saved</p>
		</div>
		<a
			href="/sources/new"
			class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
		>
			<Plus class="w-4 h-4" />
			Add Source
		</a>
	</div>

	{#if !data.user}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<p class="text-gray-600">Please <a href="/auth/login" class="text-blue-600 hover:underline">login</a> to view your sources.</p>
		</div>
	{:else if data.sources.length === 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<FileText class="w-12 h-12 mx-auto text-gray-400 mb-4" />
			<h2 class="text-lg font-semibold text-gray-900 mb-2">No sources yet</h2>
			<p class="text-gray-600 mb-4">Add your first source to start archiving.</p>
			<a
				href="/sources/new"
				class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				<Plus class="w-4 h-4" />
				Add Source
			</a>
		</div>
	{:else}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
			{#each data.sources as source}
				{@const Icon = getIcon(source.type)}
				<div class="p-4 hover:bg-gray-50 transition-colors">
					<div class="flex items-start gap-4">
						<div class="p-2 bg-gray-100 rounded-lg">
							<Icon class="w-5 h-5 text-gray-600" />
						</div>
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0">
									<a href="/sources/{source.id}" class="font-medium text-gray-900 hover:text-blue-600">
										{source.title}
									</a>
									<p class="text-sm text-gray-500 truncate">{source.url}</p>
									<div class="flex items-center gap-3 mt-2">
										<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
											{source.type}
										</span>
										<span class="text-xs text-gray-500">
											Added {Source.formatRelativeTime(source)}
										</span>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<a
										href={source.url}
										target="_blank"
										rel="noopener noreferrer"
										class="p-2 text-gray-400 hover:text-gray-600 transition-colors"
										title="Open original"
									>
										<ExternalLink class="w-4 h-4" />
									</a>
									<a
										href="/sources/{source.id}"
										class="p-2 text-gray-400 hover:text-blue-600 transition-colors"
										title="View details"
									>
										<Archive class="w-4 h-4" />
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
