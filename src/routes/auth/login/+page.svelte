<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="max-w-md mx-auto">
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">Login</h1>

		{#if form?.error}
			<div class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
				{form.error}
			</div>
		{/if}

		<form method="POST" use:enhance class="space-y-4">
			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input
					type="email"
					id="email"
					name="email"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					value={form?.email ?? ''}
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					required
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<button
				type="submit"
				class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				Login
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-600">
			Don't have an account?
			<a href="/auth/register" class="text-blue-600 hover:underline">Register</a>
		</p>
	</div>
</div>
