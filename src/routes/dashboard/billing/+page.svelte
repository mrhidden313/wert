<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>Billing Dashboard - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">Global Billing Dashboard</h1>
		<p class="text-gray-400 mt-1">Accounts with pending startup or monthly fees.</p>
	</div>
</div>

<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/50">
				<tr>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Startup Fee Due</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Monthly Fees Due</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-emerald-400 uppercase tracking-wider">Total Due</th>
					<th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each data.billingAccounts || [] as acc}
					<tr class="hover:bg-gray-800/50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="text-sm font-medium text-white">{acc.name}</span>
							<div class="text-xs text-gray-500">{acc.linkedEmail}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm {acc.startup_remaining > 0 ? 'text-orange-400' : 'text-gray-500'}">Rs {acc.startup_remaining}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm text-gray-300">
								{#each acc.pending_fees.filter(f => f.remaining > 0) as fee}
									<div class="text-xs text-orange-400">{fee.month_label}: Rs {fee.remaining}</div>
								{/each}
								{#if acc.pending_fees.filter(f => f.remaining > 0).length === 0}
									<span class="text-gray-500 text-xs">Clear</span>
								{/if}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-bold text-emerald-400">Rs {acc.total_due}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right">
							<a href="/dashboard/account/{acc.id}" class="px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 rounded-lg text-sm font-medium transition-colors">
								Open Ledger
							</a>
						</td>
					</tr>
				{/each}
				
				{#if !data.billingAccounts || data.billingAccounts.length === 0}
					<tr>
						<td colspan="5" class="px-6 py-12 text-center text-gray-500">
							No pending dues found across all accounts.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
