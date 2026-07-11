<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Global Audit Logs - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">System Audit Logs</h1>
		<p class="text-gray-400 mt-1">Track all administrative actions across the platform.</p>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
	<div class="px-6 py-4 border-b border-gray-800">
		<h2 class="text-lg font-semibold text-white">Recent Activity</h2>
	</div>
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/50">
				<tr>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date & Time</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each data.logs || [] as log}
					<tr class="hover:bg-gray-800/50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
							{new Date(log.timestamp).toLocaleString()}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-medium">
							{log.adminEmail}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-white">
							{log.action}
						</td>
						<td class="px-6 py-4 text-sm text-gray-400 max-w-md truncate">
							{log.details}
						</td>
					</tr>
				{/each}
				
				{#if !data.logs || data.logs.length === 0}
					<tr>
						<td colspan="4" class="px-6 py-12 text-center text-gray-500">
							No audit logs recorded yet.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
