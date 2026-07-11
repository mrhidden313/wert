<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	
	let loading = $state(false);
</script>

<svelte:head>
	<title>{data.profile?.email} Ledger - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard/admins" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">Admin Ledger</h1>
		<p class="text-gray-400 mt-1">{data.profile?.email}</p>
	</div>
</div>

{#if form?.success}
	<div class="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 p-4 rounded-lg mb-6">
		{form.message}
	</div>
{/if}
{#if form?.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{form.error}
	</div>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
	<div class="lg:col-span-1 space-y-6">
		<!-- Summary Card -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Total Networth</h3>
			<p class="text-4xl font-bold text-emerald-400">Rs {(data.profile?.networth || 0).toLocaleString()}</p>
		</div>

		<!-- Add Money Form -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h3 class="text-lg font-semibold text-white mb-4">Add Money</h3>
			<p class="text-sm text-gray-400 mb-6">This will send a request to the admin for approval before being added to their networth.</p>
			
			<form method="POST" action="?/addMoney" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
				<div class="space-y-4">
					<div>
						<label for="amount" class="block text-sm font-medium text-gray-400 mb-1">Amount (Rs)</label>
						<input type="number" id="amount" name="amount" required min="1"
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
					</div>
					
					<div>
						<label for="txId" class="block text-sm font-medium text-gray-400 mb-1">Transaction ID (Optional)</label>
						<input type="text" id="txId" name="txId"
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
					</div>
					
					<div>
						<label for="note" class="block text-sm font-medium text-gray-400 mb-1">Notes</label>
						<textarea id="note" name="note" rows="2" required placeholder="e.g. Paid 40k as monthly share"
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"></textarea>
					</div>

					<button type="submit" disabled={loading}
						class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50">
						{loading ? 'Sending Request...' : 'Send Approval Request'}
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="lg:col-span-2">
		<!-- History -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
			<div class="px-6 py-4 border-b border-gray-800">
				<h2 class="text-lg font-semibold text-white">Networth History</h2>
			</div>
			<div class="overflow-x-auto flex-grow">
				<table class="min-w-full divide-y divide-gray-800">
					<thead class="bg-gray-950/50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Added By</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-800">
						{#each [...(data.profile?.history || [])].reverse() as entry}
							<tr class="hover:bg-gray-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
									{new Date(entry.date).toLocaleDateString()}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium {entry.amount > 0 ? 'text-emerald-400' : 'text-red-400'}">
									{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
									{entry.addedBy}
								</td>
								<td class="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
									{#if entry.txId}
										<span class="block text-xs text-blue-400">Tx: {entry.txId}</span>
									{/if}
									{entry.note}
								</td>
							</tr>
						{/each}
						
						{#if !data.profile?.history || data.profile?.history.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-12 text-center text-gray-500">
									No history found for this admin.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
