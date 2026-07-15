<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	
	// Both admins can see and approve pending transfers
	let incomingApprovals = $derived(data.approvals || []);
	let outgoingApprovals = $derived((data.approvals || []).filter(a => a.senderEmail === data.currentUserEmail && a.receiverEmail !== data.currentUserEmail));
</script>

<svelte:head>
	<title>Pending Approvals - InstantFlow</title>
</svelte:head>

<div class="mb-6 flex items-center space-x-3">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors shrink-0">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-xl sm:text-2xl font-bold text-white">Pending Approvals</h1>
		<p class="text-gray-400 mt-1 text-sm">Review and approve money transfers to your ledger.</p>
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

<div class="space-y-8">
	<!-- Incoming Requests (Needs my approval) -->
	<div>
		<h2 class="text-lg font-semibold text-white mb-4">Awaiting Your Approval</h2>
		
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each incomingApprovals as approval}
				<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col relative overflow-hidden">
					<div class="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -z-0"></div>
					
					<div class="flex justify-between items-start mb-4 relative z-10">
						<div>
							<p class="text-sm text-gray-400">From</p>
							<p class="font-medium text-white">{approval.senderEmail}</p>
						</div>
						<div class="text-right">
							<p class="text-xs text-gray-500">{new Date(approval.timestamp).toLocaleDateString()}</p>
						</div>
					</div>
					
					<div class="mb-6 relative z-10">
						<p class="text-3xl font-bold text-emerald-400">Rs {approval.amount.toLocaleString()}</p>
						{#if approval.txId}
							<p class="text-xs text-blue-400 mt-1">Tx: {approval.txId}</p>
						{/if}
						<p class="text-sm text-gray-400 mt-2 bg-gray-950 p-2 rounded border border-gray-800">
							"{approval.note}"
						</p>
					</div>
					
					<div class="mt-auto flex space-x-3 relative z-10">
						<form method="POST" action="?/approve" use:enhance class="flex-1">
							<input type="hidden" name="id" value={approval.id}>
							<input type="hidden" name="amount" value={approval.amount}>
							<input type="hidden" name="senderEmail" value={approval.senderEmail}>
							<input type="hidden" name="receiverEmail" value={approval.receiverEmail}>
							<input type="hidden" name="txId" value={approval.txId || ''}>
							<input type="hidden" name="note" value={approval.note}>
							<button type="submit" class="w-full py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-sm font-medium transition-colors">
								Approve
							</button>
						</form>
						
						<form method="POST" action="?/reject" use:enhance class="flex-1">
							<input type="hidden" name="id" value={approval.id}>
							<input type="hidden" name="amount" value={approval.amount}>
							<button type="submit" class="w-full py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-sm font-medium transition-colors">
								Reject
							</button>
						</form>
					</div>
				</div>
			{/each}
			
			{#if incomingApprovals.length === 0}
				<div class="col-span-full bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">
					No pending transfers waiting for your approval.
				</div>
			{/if}
		</div>
	</div>

	<!-- Outgoing Requests -->
	{#if outgoingApprovals.length > 0}
		<div>
			<h2 class="text-lg font-semibold text-gray-400 mb-4">Sent by you (Awaiting their approval)</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-70">
				{#each outgoingApprovals as approval}
					<div class="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-sm">
						<div class="flex justify-between items-center mb-2">
							<p class="text-sm text-gray-400">To {approval.receiverEmail.split('@')[0]}</p>
							<span class="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs rounded border border-yellow-500/20">Pending</span>
						</div>
						<p class="text-xl font-bold text-gray-300">Rs {approval.amount.toLocaleString()}</p>
						<p class="text-xs text-gray-500 mt-1 truncate">{approval.note}</p>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
