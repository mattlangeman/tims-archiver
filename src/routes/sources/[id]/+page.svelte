<script lang="ts">
	import {
		ArrowLeft,
		ExternalLink,
		Archive,
		Download,
		Clock,
		CheckCircle,
		XCircle,
		Loader2,
		Globe,
		FileText,
		Youtube
	} from '@lucide/svelte';
	import { Source } from '$lib/apps/sources';
	import { enhance } from '$app/forms';

	let { data } = $props();

	const typeIcons: Record<string, typeof Globe> = {
		webpage: Globe,
		pdf: FileText,
		youtube: Youtube
	};

	const Icon = $derived(typeIcons[data.source?.type ?? 'webpage'] ?? Globe);

	function getArchiveStatusColor(status: string | undefined) {
		switch (status) {
			case 'completed':
				return 'text-green-600 bg-green-50';
			case 'pending':
			case 'processing':
				return 'text-blue-600 bg-blue-50';
			case 'failed':
				return 'text-red-600 bg-red-50';
			default:
				return 'text-gray-600 bg-gray-50';
		}
	}
</script>

<div class="max-w-4xl mx-auto">
	<a href="/sources" class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
		<ArrowLeft class="w-4 h-4" />
		Back to Sources
	</a>

	{#if !data.source}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
			<p class="text-gray-600">Source not found</p>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Header -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<div class="flex items-start gap-4">
					<div class="p-3 bg-gray-100 rounded-lg">
						<Icon class="w-6 h-6 text-gray-600" />
					</div>
					<div class="flex-1">
						<h1 class="text-2xl font-bold text-gray-900">{data.source.title}</h1>
						<a
							href={data.source.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
						>
							{data.source.url}
							<ExternalLink class="w-4 h-4" />
						</a>
						<div class="flex items-center gap-4 mt-3">
							<span class="text-sm px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">
								{data.source.type}
							</span>
							<span class="text-sm text-gray-500">
								Added {Source.formatRelativeTime(data.source)}
							</span>
						</div>
					</div>
				</div>

				{#if data.source.description}
					<div class="mt-4 pt-4 border-t border-gray-200">
						<h3 class="text-sm font-medium text-gray-700 mb-1">Notes</h3>
						<p class="text-gray-600">{data.source.description}</p>
					</div>
				{/if}

				{#if data.source.tags && data.source.tags.length > 0}
					<div class="mt-4 pt-4 border-t border-gray-200">
						<h3 class="text-sm font-medium text-gray-700 mb-2">Tags</h3>
						<div class="flex flex-wrap gap-2">
							{#each data.source.tags as tag}
								<span class="text-sm px-2 py-1 rounded-full bg-blue-50 text-blue-700">
									{tag}
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<!-- Archive Status -->
			<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-4">Archive Status</h2>

				<div class="space-y-4">
					<!-- Archive.org status -->
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
									<p class="text-sm text-red-600">Archive failed: {data.latestArchive.error_message}</p>
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
							{:else}
								<form method="POST" action="?/archive" use:enhance>
									<button
										type="submit"
										class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
									>
										Archive Now
									</button>
								</form>
							{/if}
						</div>
					</div>

					<!-- Local download status -->
					<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
						<div class="flex items-center gap-3">
							<Download class="w-5 h-5 text-gray-600" />
							<div>
								<p class="font-medium text-gray-900">Local Copy</p>
								{#if data.downloads && data.downloads.length > 0}
									<p class="text-sm text-gray-500">{data.downloads.length} local copies saved</p>
								{:else}
									<p class="text-sm text-gray-500">No local copy</p>
								{/if}
							</div>
						</div>
						<div>
							<button
								disabled
								class="px-3 py-1 text-sm bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
								title="Coming soon"
							>
								Download
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- YouTube preview -->
			{#if data.source.type === 'youtube' && data.source.metadata?.video_id}
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Preview</h2>
					<div class="aspect-video">
						<img
							src={`https://img.youtube.com/vi/${data.source.metadata.video_id}/hqdefault.jpg`}
							alt="Video thumbnail"
							class="w-full h-full object-cover rounded-lg"
						/>
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
							if (!confirm('Are you sure you want to delete this source?')) {
								e.preventDefault();
							}
						}}
					>
						Delete Source
					</button>
				</form>
			</div>
		</div>
	{/if}
</div>
