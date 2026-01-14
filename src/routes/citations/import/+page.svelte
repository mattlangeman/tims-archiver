<script lang="ts">
	import {
		ArrowLeft,
		Upload,
		CheckCircle,
		XCircle,
		Loader2,
		AlertCircle,
		FileText
	} from '@lucide/svelte';

	let { data } = $props();

	let fileInput: HTMLInputElement;
	let urls = $state<string[]>([]);
	let importing = $state(false);
	let progress = $state({ total: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0 });
	let errors = $state<string[]>([]);
	let done = $state(false);
	let currentBatchId = $state<string | null>(null);
	let dragging = $state(false);

	function processFile(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const content = e.target?.result as string;
			const lines = content
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.startsWith('http'));
			urls = lines;
		};
		reader.readAsText(file);
	}

	function handleFileSelect(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) processFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (file) processFile(file);
	}

	async function startImport() {
		if (urls.length === 0) return;

		importing = true;
		done = false;
		errors = [];
		progress = { total: urls.length, processed: 0, succeeded: 0, failed: 0, skipped: 0 };

		// Generate a single batch ID for the entire import session
		const batchId = crypto.randomUUID();
		currentBatchId = batchId;

		// Process in batches to avoid overwhelming the server
		const batchSize = 10;

		for (let i = 0; i < urls.length; i += batchSize) {
			const batch = urls.slice(i, i + batchSize);

			try {
				const response = await fetch('/api/citations/import', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ urls: batch, batchId })
				});

				const result = await response.json();

				progress.processed += batch.length;
				progress.succeeded += result.succeeded || 0;
				progress.failed += result.failed || 0;
				progress.skipped += result.skipped || 0;

				if (result.errors) {
					errors = [...errors, ...result.errors.slice(0, 5)]; // Keep first 5 errors per batch
				}
			} catch (err) {
				progress.processed += batch.length;
				progress.failed += batch.length;
				errors = [...errors, `Batch failed: ${err}`];
			}

			// Small delay between batches
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		importing = false;
		done = true;
	}

	const progressPercent = $derived(
		progress.total > 0 ? Math.round((progress.processed / progress.total) * 100) : 0
	);
</script>

<div class="max-w-2xl mx-auto">
	<a
		href="/citations"
		class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Citations
	</a>

	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-2">Import Citations</h1>
		<p class="text-gray-600 mb-6">
			Upload a text file with CiteIt JSON URLs (one per line) to import citations.
		</p>

		{#if !data.user}
			<div class="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
				<p class="text-yellow-800">Please login to import citations.</p>
			</div>
		{:else if done}
			<!-- Import complete -->
			<div class="space-y-4">
				<div class="p-4 bg-green-50 border border-green-200 rounded-md">
					<div class="flex items-center gap-2">
						<CheckCircle class="w-5 h-5 text-green-600" />
						<p class="font-medium text-green-800">Import Complete</p>
					</div>
					<p class="mt-2 text-green-700">
						Processed {progress.processed} citations: {progress.succeeded} imported, {progress.skipped}
						skipped, {progress.failed} failed.
					</p>
				</div>

				{#if progress.failed > 0 && currentBatchId}
					<a
						href="/citations/import/logs?batch={currentBatchId}"
						class="flex items-center gap-2 p-4 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 transition-colors"
					>
						<FileText class="w-5 h-5 text-gray-600" />
						<div>
							<p class="font-medium text-gray-900">View Import Logs</p>
							<p class="text-sm text-gray-600">
								See detailed error messages for {progress.failed} failed imports
							</p>
						</div>
					</a>
				{/if}

				{#if errors.length > 0}
					<div class="p-4 bg-red-50 border border-red-200 rounded-md">
						<p class="font-medium text-red-800 mb-2">Some errors occurred:</p>
						<ul class="text-sm text-red-700 list-disc list-inside">
							{#each errors.slice(0, 10) as error}
								<li class="truncate">{error}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<div class="flex gap-4">
					<a
						href="/citations"
						class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors text-center"
					>
						View Citations
					</a>
					<button
						onclick={() => {
							done = false;
							urls = [];
							currentBatchId = null;
							progress = { total: 0, processed: 0, succeeded: 0, failed: 0, skipped: 0 };
						}}
						class="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
					>
						Import More
					</button>
				</div>
			</div>
		{:else if importing}
			<!-- Progress -->
			<div class="space-y-4">
				<div class="flex items-center gap-3">
					<Loader2 class="w-5 h-5 text-blue-600 animate-spin" />
					<span class="font-medium text-gray-900">Importing citations...</span>
				</div>

				<div class="w-full bg-gray-200 rounded-full h-3">
					<div
						class="bg-blue-600 h-3 rounded-full transition-all duration-300"
						style="width: {progressPercent}%"
					></div>
				</div>

				<div class="grid grid-cols-4 gap-4 text-center text-sm">
					<div>
						<p class="text-2xl font-bold text-gray-900">{progress.processed}</p>
						<p class="text-gray-500">Processed</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-green-600">{progress.succeeded}</p>
						<p class="text-gray-500">Imported</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-yellow-600">{progress.skipped}</p>
						<p class="text-gray-500">Skipped</p>
					</div>
					<div>
						<p class="text-2xl font-bold text-red-600">{progress.failed}</p>
						<p class="text-gray-500">Failed</p>
					</div>
				</div>

				<p class="text-sm text-gray-500 text-center">
					{progressPercent}% complete ({progress.processed} / {progress.total})
				</p>
			</div>
		{:else}
			<!-- File upload -->
			<div class="space-y-6">
				<div
					role="button"
					tabindex="0"
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					ondrop={handleDrop}
					onclick={() => fileInput.click()}
					onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
					class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors {dragging
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-300 hover:bg-gray-50'}"
				>
					<div class="flex flex-col items-center justify-center pt-5 pb-6 pointer-events-none">
						<Upload class="w-8 h-8 mb-2 {dragging ? 'text-blue-500' : 'text-gray-400'}" />
						<p class="text-sm text-gray-500">
							{#if dragging}
								<span class="font-medium text-blue-600">Drop file here</span>
							{:else}
								<span class="font-medium text-blue-600">Click to upload</span> or drag and drop
							{/if}
						</p>
						<p class="text-xs text-gray-400">Text file with JSON URLs (one per line)</p>
					</div>
				</div>
				<input
					bind:this={fileInput}
					type="file"
					accept=".txt,.csv"
					class="hidden"
					onchange={handleFileSelect}
				/>

				{#if urls.length > 0}
					<div class="p-4 bg-blue-50 border border-blue-200 rounded-md">
						<div class="flex items-center gap-2">
							<AlertCircle class="w-5 h-5 text-blue-600" />
							<p class="font-medium text-blue-800">Ready to import {urls.length} citations</p>
						</div>
						<p class="mt-1 text-sm text-blue-700">
							This will create Article records for each citing URL and Source records for each cited
							URL.
						</p>
					</div>

					<button
						onclick={startImport}
						class="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
					>
						Start Import
					</button>
				{/if}

				<div class="text-sm text-gray-500">
					<p class="font-medium mb-1">Expected file format:</p>
					<pre class="bg-gray-100 p-2 rounded text-xs overflow-x-auto">https://read.citeit.net/quote/sha256/0.4/00/0004d1bb...json
https://read.citeit.net/quote/sha256/0.4/00/0006229c...json</pre>
				</div>
			</div>
		{/if}
	</div>
</div>
