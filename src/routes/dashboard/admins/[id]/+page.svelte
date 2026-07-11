<script>
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();
	
	let loading = $state(false);

	let showAddModal = $state(false);
	let showPayModal = $state(false);
	let addModalData = $state({ title: '', amount: '' });
	let payModalData = $state({ entryId: '', maxAmount: 0, amount: '' });

	let pendingTotal = $derived((data.adminLedger || []).filter(e => e.status === 'pending').reduce((sum, e) => sum + e.remainingAmount, 0));
	let paidTotal = $derived((data.adminLedger || []).reduce((sum, e) => sum + e.paidAmount, 0));
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

<!-- COMMISSION LEDGER -->
<div class="mt-8 mb-8">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-bold text-white">Commission Ledger</h2>
		{#if data.isMasterAdmin}
			<button onclick={() => { addModalData = {title: '', amount: ''}; showAddModal = true; }} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
				+ Add Pending Commission
			</button>
		{/if}
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm p-6">
		<div class="flex justify-between mb-6">
			<div>
				<p class="text-gray-400 text-sm">Total Pending</p>
				<p class="text-3xl font-bold text-orange-400">Rs {pendingTotal.toLocaleString()}</p>
			</div>
			<div class="text-right">
				<p class="text-gray-400 text-sm">Total Paid</p>
				<p class="text-3xl font-bold text-emerald-400">Rs {paidTotal.toLocaleString()}</p>
			</div>
		</div>

		<div class="space-y-3 max-h-96 overflow-y-auto pr-2">
			{#each data.adminLedger || [] as entry}
				<div class="bg-gray-950 p-4 rounded-lg border border-gray-800 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
					<div>
						<p class="text-white font-medium text-base">{entry.title}</p>
						<p class="text-gray-500 text-xs">{new Date(entry.createdAt).toLocaleDateString()}</p>
					</div>
					<div class="flex items-center justify-between sm:justify-end space-x-4">
						<div class="text-right">
							<p class="text-orange-400 text-sm font-bold">Pending: Rs {entry.remainingAmount}</p>
							{#if entry.paidAmount > 0}
								<p class="text-emerald-500 text-xs">Paid: Rs {entry.paidAmount}</p>
							{/if}
						</div>
						<div class="flex items-center space-x-2">
							{#if data.isMasterAdmin && entry.remainingAmount > 0}
								<button onclick={() => { payModalData = {entryId: entry.id, maxAmount: entry.remainingAmount, amount: entry.remainingAmount}; showPayModal = true; }} class="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 border border-emerald-600/30 hover:bg-emerald-600/40 rounded text-sm transition-colors">
									Pay
								</button>
							{/if}
							{#if data.isMasterAdmin}
								<form method="POST" action="?/deleteCommission" class="inline" onsubmit={() => confirm('Are you sure you want to delete this pending commission?')}>
									<input type="hidden" name="entryId" value={entry.id} />
									<button type="submit" class="p-1.5 text-red-500/50 hover:text-red-500 transition-colors">
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>
			{/each}
			{#if (data.adminLedger || []).length === 0}
				<p class="text-gray-500 text-sm text-center py-6">No commission entries found for this admin.</p>
			{/if}
		</div>
	</div>
</div>

<!-- MODALS -->
<Modal show={showAddModal} title="Add Pending Commission" close={() => showAddModal = false}>
	<form method="POST" action="?/addCommission" id="addCommissionForm" onsubmit={() => showAddModal = false}>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Title / Description</label>
				<input type="text" name="title" bind:value={addModalData.title} placeholder="e.g. July Networth Share" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Amount (Rs)</label>
				<input type="number" name="amount" bind:value={addModalData.amount} placeholder="e.g. 5000" required min="1" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
			</div>
		</div>
	</form>
	
	{#snippet footer()}
		<button type="button" onclick={() => showAddModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancel</button>
		<button type="submit" form="addCommissionForm" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">Add Commission</button>
	{/snippet}
</Modal>

<Modal show={showPayModal} title="Pay Commission" close={() => showPayModal = false}>
	<form method="POST" action="?/payCommission" id="payCommissionForm" onsubmit={() => showPayModal = false}>
		<input type="hidden" name="entryId" bind:value={payModalData.entryId} />
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Amount to Pay (Rs)</label>
				<input type="number" name="amount" bind:value={payModalData.amount} max={payModalData.maxAmount} required min="1" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
				<p class="text-xs text-gray-500 mt-1">Maximum remaining: Rs {payModalData.maxAmount}</p>
			</div>
		</div>
	</form>
	
	{#snippet footer()}
		<button type="button" onclick={() => showPayModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancel</button>
		<button type="submit" form="payCommissionForm" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">Record Payment</button>
	{/snippet}
</Modal>

<div class="mt-8 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
	<h3 class="text-red-400 font-bold mb-2">DEBUG RAW LEDGER DATA:</h3>
	<pre class="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(data.rawLedger || [], null, 2)}</pre>
</div>
