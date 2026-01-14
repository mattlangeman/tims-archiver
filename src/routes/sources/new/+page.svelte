<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from '@lucide/svelte';

	let { form } = $props();
	let loading = $state(false);
</script>

<div class="max-w-2xl mx-auto">
	<a
		href="/sources"
		class="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
	>
		<ArrowLeft class="w-4 h-4" />
		Back to Sources
	</a>

	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">Add Source</h1>

		{#if form?.error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
				{form.error}
			</div>
		{/if}

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					loading = false;
					await update();
				};
			}}
			class="space-y-6"
		>
			<!-- URL - Required -->
			<div>
				<label for="url" class="block text-sm font-medium text-gray-700 mb-1">
					URL <span class="text-red-500">*</span>
				</label>
				<input
					type="url"
					id="url"
					name="url"
					required
					placeholder="https://example.com/article"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					value={form?.values?.url ?? ''}
				/>
				<p class="mt-1 text-xs text-gray-500">
					Paste any URL - we'll detect if it's a webpage, PDF, or YouTube video
				</p>
			</div>

			<!-- Title - Optional (will be fetched if not provided) -->
			<div>
				<label for="title" class="block text-sm font-medium text-gray-700 mb-1">
					Title
				</label>
				<input
					type="text"
					id="title"
					name="title"
					placeholder="Optional - will try to fetch from URL"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					value={form?.values?.title ?? ''}
				/>
			</div>

			<!-- Description - Optional -->
			<div>
				<label for="description" class="block text-sm font-medium text-gray-700 mb-1">
					Notes / Description
				</label>
				<textarea
					id="description"
					name="description"
					rows="3"
					placeholder="Why is this source important? Any context?"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>{form?.values?.description ?? ''}</textarea>
			</div>

			<!-- Tags - Optional -->
			<div>
				<label for="tags" class="block text-sm font-medium text-gray-700 mb-1">
					Tags
				</label>
				<input
					type="text"
					id="tags"
					name="tags"
					placeholder="politics, climate, 2024 (comma separated)"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					value={form?.values?.tags ?? ''}
				/>
			</div>

			<!-- Archive options -->
			<div class="border-t border-gray-200 pt-6">
				<h3 class="text-sm font-medium text-gray-900 mb-3">Archive Options</h3>
				<div class="space-y-3">
					<label class="flex items-center gap-3">
						<input
							type="checkbox"
							name="archive_now"
							value="true"
							checked
							class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
						/>
						<span class="text-sm text-gray-700">Archive at Archive.org immediately</span>
					</label>
				</div>
			</div>

			<div class="flex gap-4">
				<button
					type="submit"
					disabled={loading}
					class="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
				>
					{loading ? 'Adding...' : 'Add Source'}
				</button>
				<a
					href="/sources"
					class="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-md transition-colors"
				>
					Cancel
				</a>
			</div>
		</form>
	</div>
</div>
