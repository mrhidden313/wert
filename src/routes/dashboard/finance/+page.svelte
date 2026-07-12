<script>
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();
	
	let loading = $state(false);
	let showAddLoanModal = $state(false);
	let loanModalData = $state({ personName: '', amount: '', note: '' });

	let totalRevenue = $derived(data.totalRevenue || 0);
	let totalExpenses = $derived(data.totalExpenses || 0);
	let totalLoans = $derived(data.totalLoans || 0);
	
	let farman = $derived(data.admins?.farman || { networth: 0, paid: 0, pending: 0 });
	let uzair = $derived(data.admins?.uzair || { networth: 0, paid: 0, pending: 0 });
	let loans = $derived(data.loans || []);
</script>

<svelte:head>
	<title>Finance Overview - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center justify-between">
	<div>
		<h1 class="text-2xl font-bold text-white">Finance Overview</h1>
		<p class="text-gray-400 mt-1">High-level view of company revenue, expenses, admin shares, and loans.</p>
	</div>
</div>

{#if form?.success}
	<div class="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 p-4 rounded-lg mb-6">
		{form.message}
	</div>
{/if}
{#if form?.error || data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{form?.error || data.error}
	</div>
{/if}

<!-- COMPANY AGGREGATES -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Total Payments Received</h3>
		<p class="text-4xl font-bold text-emerald-400">Rs {totalRevenue.toLocaleString()}</p>
		<p class="text-xs text-gray-500 mt-2">Fetched directly from all client subscriptions.</p>
	</div>
	
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Total App Expenses</h3>
		<p class="text-4xl font-bold text-red-400">Rs {totalExpenses.toLocaleString()}</p>
		<p class="text-xs text-gray-500 mt-2">Sum of all recorded application expenses.</p>
	</div>
</div>

<!-- ADMIN SHARES -->
<h2 class="text-xl font-bold text-white mb-4">Admin Shares</h2>
<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
	<!-- Uzair Card -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
			<h3 class="font-bold text-white text-lg">Uzair</h3>
		</div>
		<div class="p-6 space-y-4">
			<div class="flex justify-between items-center">
				<span class="text-gray-400 text-sm">Total Networth</span>
				<span class="text-white font-bold">Rs {uzair.networth.toLocaleString()}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-gray-400 text-sm">Total Paid</span>
				<span class="text-emerald-400 font-bold">Rs {uzair.paid.toLocaleString()}</span>
			</div>
			<div class="pt-4 border-t border-gray-800 flex justify-between items-center">
				<span class="text-gray-400 text-sm font-medium">Pending (Bakaya)</span>
				<span class="text-orange-400 font-bold text-lg">Rs {uzair.pending.toLocaleString()}</span>
			</div>
		</div>
	</div>

	<!-- Farman Card -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
		<div class="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
			<h3 class="font-bold text-white text-lg">Farman</h3>
		</div>
		<div class="p-6 space-y-4">
			<div class="flex justify-between items-center">
				<span class="text-gray-400 text-sm">Total Networth</span>
				<span class="text-white font-bold">Rs {farman.networth.toLocaleString()}</span>
			</div>
			<div class="flex justify-between items-center">
				<span class="text-gray-400 text-sm">Total Paid</span>
				<span class="text-emerald-400 font-bold">Rs {farman.paid.toLocaleString()}</span>
			</div>
			<div class="pt-4 border-t border-gray-800 flex justify-between items-center">
				<span class="text-gray-400 text-sm font-medium">Pending (Bakaya)</span>
				<span class="text-orange-400 font-bold text-lg">Rs {farman.pending.toLocaleString()}</span>
			</div>
		</div>
	</div>
</div>

<!-- LOANS SECTION -->
<div class="mb-8">
	<div class="flex items-center justify-between mb-4">
		<div>
			<h2 class="text-xl font-bold text-white">Loan Records</h2>
			<p class="text-sm text-gray-400 mt-1">Total Loan Distributed: <span class="text-blue-400 font-bold">Rs {totalLoans.toLocaleString()}</span></p>
		</div>
		{#if data.isMasterAdmin}
			<button onclick={() => { loanModalData = { personName: '', amount: '', note: '' }; showAddLoanModal = true; }} class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
				+ Add Loan Entry
			</button>
		{/if}
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-800">
				<thead class="bg-gray-950/50">
					<tr>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Loaned Behind (User)</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
						<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
						<th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each loans as loan}
						<tr class="hover:bg-gray-800/50 transition-colors">
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
								{new Date(loan.timestamp).toLocaleDateString()}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
								{loan.personName}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-400">
								Rs {loan.amount.toLocaleString()}
							</td>
							<td class="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
								{loan.note}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
								{#if data.isMasterAdmin}
									<form method="POST" action="?/deleteLoan" class="inline" onsubmit={() => confirm('Are you sure you want to delete this loan record?')}>
										<input type="hidden" name="loanId" value={loan.id} />
										<button type="submit" class="text-red-400 hover:text-red-300 transition-colors">Delete</button>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
					
					{#if loans.length === 0}
						<tr>
							<td colspan="5" class="px-6 py-12 text-center text-gray-500">
								No loan records found.
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- MODALS -->
<Modal show={showAddLoanModal} title="Add Loan Entry" close={() => showAddLoanModal = false}>
	<form method="POST" action="?/addLoan" id="addLoanForm" onsubmit={() => showAddLoanModal = false}>
		<div class="space-y-4">
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Loaned Behind (e.g. Uzair, User X)</label>
				<input type="text" name="personName" bind:value={loanModalData.personName} required placeholder="Enter name" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Amount (Rs)</label>
				<input type="number" name="amount" bind:value={loanModalData.amount} required min="1" placeholder="e.g. 50000" class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-400 mb-1">Notes</label>
				<input type="text" name="note" bind:value={loanModalData.note} placeholder="Any details..." class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500">
			</div>
		</div>
	</form>
	
	{#snippet footer()}
		<button type="button" onclick={() => showAddLoanModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">Cancel</button>
		<button type="submit" form="addLoanForm" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">Save Loan</button>
	{/snippet}
</Modal>
