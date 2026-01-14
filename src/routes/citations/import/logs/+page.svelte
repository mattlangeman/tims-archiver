<script lang="ts">
	import { ArrowLeft, CheckCircle, XCircle, SkipForward, ExternalLink } from '@lucide/svelte';

	let { data } = $props();

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleString();
	}

	function truncateUrl(url: string, maxLength = 60) {
		if (url.length <= maxLength) return url;
		return url.slice(0, maxLength - 3) + '...';
	}
</script>

<div class="max-w-4xl mx-auto">
	<a
		href="/citations/import"
		class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Import
	</a>

	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Import Logs</h1>
		<p class="text-gray-600">
			View detailed logs of your citation imports, including any errors.
		</p>
	</div>

	<!-- Batch selector -->
	{#if data.batches.length > 0}
		<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
			<h2 class="text-sm font-medium text-gray-700 mb-3">Import Batches</h2>
			<div class="flex flex-wrap gap-2">
				<a
					href="/citations/import/logs"
					class="px-3 py-1.5 text-sm rounded-md transition-colors {!data.currentBatchId
						? 'bg-blue-100 text-blue-800'
						: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
				>
					All
				</a>
				{#each data.batches.slice(0, 10) as batch}
					<a
						href="/citations/import/logs?batch={batch.batchId}"
						class="px-3 py-1.5 text-sm rounded-md transition-colors {data.currentBatchId ===
						batch.batchId
							? 'bg-blue-100 text-blue-800'
							: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
					>
						{new Date(batch.createdAt).toLocaleDateString()}
						<span class="text-xs ml-1">
							({batch.succeeded}/{batch.total})
						</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Status filter -->
	<div class="flex gap-2 mb-4">
		<a
			href="/citations/import/logs{data.currentBatchId ? `?batch=${data.currentBatchId}` : ''}"
			class="px-3 py-1.5 text-sm rounded-md transition-colors {!data.statusFilter
				? 'bg-gray-800 text-white'
				: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
		>
			All
		</a>
		<a
			href="/citations/import/logs?status=failed{data.currentBatchId
				? `&batch=${data.currentBatchId}`
				: ''}"
			class="px-3 py-1.5 text-sm rounded-md transition-colors {data.statusFilter === 'failed'
				? 'bg-red-600 text-white'
				: 'bg-red-50 text-red-700 hover:bg-red-100'}"
		>
			Failed
		</a>
		<a
			href="/citations/import/logs?status=success{data.currentBatchId
				? `&batch=${data.currentBatchId}`
				: ''}"
			class="px-3 py-1.5 text-sm rounded-md transition-colors {data.statusFilter === 'success'
				? 'bg-green-600 text-white'
				: 'bg-green-50 text-green-700 hover:bg-green-100'}"
		>
			Succeeded
		</a>
		<a
			href="/citations/import/logs?status=skipped{data.currentBatchId
				? `&batch=${data.currentBatchId}`
				: ''}"
			class="px-3 py-1.5 text-sm rounded-md transition-colors {data.statusFilter === 'skipped'
				? 'bg-yellow-600 text-white'
				: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}"
		>
			Skipped
		</a>
	</div>

	<!-- Logs table -->
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
		{#if data.logs.length === 0}
			<div class="p-8 text-center text-gray-500">
				<p>No import logs found.</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Status
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								JSON URL
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Details
							</th>
							<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
								Time
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each data.logs as log}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									{#if log.status === 'success'}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
										>
											<CheckCircle class="w-3 h-3" />
											Success
										</span>
									{:else if log.status === 'failed'}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800"
										>
											<XCircle class="w-3 h-3" />
											Failed
										</span>
									{:else}
										<span
											class="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800"
										>
											<SkipForward class="w-3 h-3" />
											Skipped
										</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									<a
										href={log.json_url}
										target="_blank"
										rel="noopener noreferrer"
										class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
									>
										<span class="font-mono">{truncateUrl(log.json_url)}</span>
										<ExternalLink class="w-3 h-3 flex-shrink-0" />
									</a>
								</td>
								<td class="px-4 py-3">
									{#if log.error_message}
										<span class="text-sm text-red-600">{log.error_message}</span>
									{:else if log.skip_reason}
										<span class="text-sm text-yellow-600">{log.skip_reason}</span>
									{:else if log.citation_id}
										<a
											href="/citations/{log.citation_id}"
											class="text-sm text-blue-600 hover:text-blue-800"
										>
											View citation
										</a>
									{:else}
										<span class="text-sm text-gray-400">-</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-sm text-gray-500">
									{formatDate(log.created_at)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500">
				Showing {data.logs.length} of {data.count} logs
			</div>
		{/if}
	</div>
</div>
