<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Admin Profiles - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">Admin Profiles</h1>
		<p class="text-gray-400 mt-1">Manage admin networth and transaction ledgers.</p>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
	<!-- Predefined Admins to ensure they show up even if no data yet -->
	{#each ['mrhiddenhacker313@gmail.com', 'uzairadmin@gmail.com'] as email}
		{@const profile = data.profiles?.find(p => p.email === email) || { email, networth: 0 }}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col">
			<div class="flex items-start justify-between mb-4">
				<div>
					<h3 class="text-lg font-semibold text-white">{email.split('@')[0].toUpperCase()}</h3>
					<p class="text-sm text-gray-500">{email}</p>
				</div>
				<span class="px-2 py-1 bg-blue-900/30 text-blue-400 border border-blue-500/20 text-xs rounded font-medium">
					{email === 'mrhiddenhacker313@gmail.com' ? 'Super Admin' : 'Admin'}
				</span>
			</div>
			
			<div class="mt-4 mb-6">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Networth</p>
				<p class="text-3xl font-bold text-emerald-400">Rs {profile.networth.toLocaleString()}</p>
			</div>
			
			<div class="mt-auto">
				<a href="/dashboard/admins/{email}" class="block text-center w-full px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-sm font-medium transition-colors">
					Open Ledger & Manage
				</a>
			</div>
		</div>
	{/each}
</div>
