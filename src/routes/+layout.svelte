<script lang="ts">
	import '../app.css';
	import { Globe, FileText, Archive, LogIn, LogOut, Plus, Quote } from '@lucide/svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: Globe },
		{ href: '/articles', label: 'Articles', icon: Archive },
		{ href: '/citations', label: 'Citations', icon: Quote },
		{ href: '/sources', label: 'Sources', icon: FileText }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16">
				<div class="flex items-center gap-8">
					<a href="/" class="text-xl font-bold text-gray-900">Tim's Archiver</a>

					<nav class="hidden md:flex items-center gap-1">
						{#each navItems as item}
							<a
								href={item.href}
								class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
							>
								<item.icon class="w-4 h-4" />
								{item.label}
							</a>
						{/each}
					</nav>
				</div>

				<div class="flex items-center gap-4">
					{#if data.user}
						<a
							href="/sources/new"
							class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
						>
							<Plus class="w-4 h-4" />
							Add Source
						</a>
						<span class="text-sm text-gray-600">{data.user.email}</span>
						<form action="/auth/logout" method="POST">
							<button
								type="submit"
								class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
							>
								<LogOut class="w-4 h-4" />
								Logout
							</button>
						</form>
					{:else}
						<a
							href="/auth/login"
							class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
						>
							<LogIn class="w-4 h-4" />
							Login
						</a>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>
