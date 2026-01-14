<script lang="ts">
	import { enhance } from '$app/forms';

	let { form } = $props();
</script>

<div class="max-w-md mx-auto">
	<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
		<h1 class="text-2xl font-bold text-gray-900 mb-6">Create Account</h1>

		{#if form?.success}
			<div class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
				Check your email to confirm your account.
			</div>
		{/if}

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
					minlength="6"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				<p class="mt-1 text-xs text-gray-500">At least 6 characters</p>
			</div>

			<button
				type="submit"
				class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
			>
				Create Account
			</button>
		</form>

		<p class="mt-4 text-center text-sm text-gray-600">
			Already have an account?
			<a href="/auth/login" class="text-blue-600 hover:underline">Login</a>
		</p>
	</div>
</div>
