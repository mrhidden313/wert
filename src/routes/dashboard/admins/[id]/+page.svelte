<script>
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();
	
	let loading = $state(false);

	let showPayModal = $state(false);
	let showEditModal = $state(false);
	let payModalData = $state({ amount: '', note: '' });
	let editModalData = $state({ amount: '' });

	let totalNetworth = $derived(data.profile?.networth || 0);
	let totalPaid = $derived(data.profile?.totalPaid || 0);
	let pendingAmount = $derived(totalNetworth - totalPaid);
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

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
	<div class="lg:col-span-1 space-y-6">
		<!-- Summary Card -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm relative">
			<div class="flex justify-between items-start mb-2">
				<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider">Total Networth</h3>
				{#if data.isMasterAdmin}
					<button onclick={() => { editModalData.amount = totalNetworth; showEditModal = true; }} class="text-gray-500 hover:text-blue-400 transition-colors p-1" title="Edit Networth">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
						</svg>
					</button>
				{/if}
			</div>
			<p class="text-4xl font-bold text-emerald-400">Rs {totalNetworth.toLocaleString()}</p>
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
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
									{#if entry.type === 'pay'}
										<span class="text-orange-400">Rs {entry.amount.toLocaleString()}</span>
									{:else if entry.type === 'edit'}
										<span class="text-blue-400">Rs {entry.amount.toLocaleString()}</span>
									{:else}
										<span class={entry.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
											{entry.amount > 0 ? '+' : ''}{entry.amount.toLocaleString()}
										</span>
									{/if}
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

<!-- EARNINGS WALLET -->
<div class="mt-8 mb-8">
	<h2 class="text-xl font-bold text-white mb-4">Admin Wallet</h2>
	
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
		<div class="bg-gray-900 border border-orange-500/30 rounded-xl p-6 shadow-sm flex justify-between items-center">
			<div>
				<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Total Pending</h3>
				<p class="text-3xl font-bold text-orange-400">Rs {pendingAmount.toLocaleString()}</p>
			</div>
			{#if data.isMasterAdmin}
				<button onclick={() => { payModalData = { amount: '', note: '' }; showPayModal = true; }} class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
					Pay Now
				</button>
			{/if}
		</div>

		<div class="bg-gray-900 border border-emerald-500/30 rounded-xl p-6 shadow-sm">
			<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Total Paid</h3>
			<p class="text-3xl font-bold text-emerald-400">Rs {totalPaid.toLocaleString()}</p>
		</div>
	</div>
</div>

<!-- MODALS -->
<Modal show={showPayModal} title="Record Payment" close={() => showPayModal = false}>
	<form method="POST" action="?/payAdmin" id="payAdminForm" onsubmit={() => showPayModal = false}>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Amount (Rs)</label>
				<input type="number" name="amount" bind:value={payModalData.amount} max={pendingAmount} required min="1" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
				<p class="text-xs text-gray-500 mt-1">Maximum pending: Rs {pendingAmount.toLocaleString()}</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Notes</label>
				<input type="text" name="note" bind:value={payModalData.note} placeholder="e.g. Cash handed over" required class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500">
			</div>
		</div>
	</form>
	
	{#snippet footer()}
		<button type="button" onclick={() => showPayModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancel</button>
		<button type="submit" form="payAdminForm" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">Record Payment</button>
	{/snippet}
</Modal>

<Modal show={showEditModal} title="Edit Total Networth" close={() => showEditModal = false}>
	<form method="POST" action="?/editNetworth" id="editNetworthForm" onsubmit={() => showEditModal = false}>
		<div class="space-y-4">
			<div class="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg mb-4">
				<p class="text-sm text-blue-400">This will directly override the admin's Total Networth. Only use this for manual corrections.</p>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">New Total Networth (Rs)</label>
				<input type="number" name="amount" bind:value={editModalData.amount} required min="0" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
			</div>
		</div>
	</form>
	
	{#snippet footer()}
		<button type="button" onclick={() => showEditModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancel</button>
		<button type="submit" form="editNetworthForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">Save Changes</button>
	{/snippet}
</Modal>
