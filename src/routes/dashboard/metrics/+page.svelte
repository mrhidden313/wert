<script>
	let { data } = $props();

	let searchQuery = $state('');
	let sortBy = $state('total'); // 'total', 'sent', 'received', 'conversations'

	let filteredMetrics = $derived(
		(data.clientMetrics || [])
			.filter((client) => {
				if (!searchQuery) return true;
				const q = searchQuery.toLowerCase();
				return (
					client.name?.toLowerCase().includes(q) ||
					client.email?.toLowerCase().includes(q) ||
					String(client.id).includes(q)
				);
			})
			.sort((a, b) => {
				if (sortBy === 'total') return b.totalMessages - a.totalMessages;
				if (sortBy === 'sent') return b.outgoingCount - a.outgoingCount;
				if (sortBy === 'received') return b.incomingCount - a.incomingCount;
				if (sortBy === 'conversations') return b.conversationsCount - a.conversationsCount;
				return 0;
			})
	);

	let totalIncoming = $derived(data.totals?.incoming || 0);
	let totalOutgoing = $derived(data.totals?.outgoing || 0);
	let totalMessages = $derived(data.totals?.messages || 0);
	let totalConversations = $derived(data.totals?.conversations || 0);

	let incomingPercent = $derived(
		totalMessages > 0 ? Math.round((totalIncoming / totalMessages) * 100) : 50
	);
	let outgoingPercent = $derived(
		totalMessages > 0 ? Math.round((totalOutgoing / totalMessages) * 100) : 50
	);
</script>

<svelte:head>
	<title>Usage Analytics - InstantFlow</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-bold text-white">Client Usage Analytics</h1>
	<p class="text-gray-400 mt-1">
		Real-time message volume, conversations, and engagement metrics across all workspaces (Last 30 Days).
	</p>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<!-- SYSTEM TOTALS CARDS -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<span class="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">
			Total Messages
		</span>
		<span class="text-3xl font-extrabold text-white">{totalMessages.toLocaleString()}</span>
		<div class="text-xs text-gray-500 mt-2">All sent & received volume</div>
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<span class="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">
			Outgoing (Sent)
		</span>
		<span class="text-3xl font-extrabold text-emerald-400">{totalOutgoing.toLocaleString()}</span>
		<div class="text-xs text-gray-500 mt-2">{outgoingPercent}% of total messages</div>
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<span class="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">
			Incoming (Received)
		</span>
		<span class="text-3xl font-extrabold text-blue-400">{totalIncoming.toLocaleString()}</span>
		<div class="text-xs text-gray-500 mt-2">{incomingPercent}% of total messages</div>
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
		<span class="text-gray-400 text-xs font-semibold uppercase tracking-wider block mb-1">
			Conversations
		</span>
		<span class="text-3xl font-extrabold text-purple-400">{totalConversations.toLocaleString()}</span>
		<div class="text-xs text-gray-500 mt-2">Active chat threads</div>
	</div>
</div>

<!-- GRAPHICAL PROPORTION BAR -->
<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
	<h3 class="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
		System Traffic Distribution
	</h3>
	<div class="w-full h-6 bg-gray-950 rounded-full overflow-hidden flex border border-gray-800">
		<div
			class="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-gray-950"
			style="width: {outgoingPercent}%;"
			title="Outgoing: {outgoingPercent}%"
		>
			{#if outgoingPercent > 10}
				Sent {outgoingPercent}%
			{/if}
		</div>
		<div
			class="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white"
			style="width: {incomingPercent}%;"
			title="Incoming: {incomingPercent}%"
		>
			{#if incomingPercent > 10}
				Received {incomingPercent}%
			{/if}
		</div>
	</div>
	<div class="flex justify-between items-center text-xs text-gray-400 mt-3">
		<div class="flex items-center gap-2">
			<div class="w-3 h-3 rounded-full bg-emerald-500"></div>
			<span>Outgoing (Sent by Clients / AI): <strong class="text-white">{totalOutgoing.toLocaleString()}</strong></span>
		</div>
		<div class="flex items-center gap-2">
			<div class="w-3 h-3 rounded-full bg-blue-500"></div>
			<span>Incoming (Received from Users): <strong class="text-white">{totalIncoming.toLocaleString()}</strong></span>
		</div>
	</div>
</div>

<!-- CONTROLS & TABLE -->
<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
	<div class="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search workspace name or email..."
			class="w-full sm:w-72 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
		/>
		<div class="flex items-center gap-2 w-full sm:w-auto justify-end">
			<label class="text-xs text-gray-400 font-medium">Sort By:</label>
			<select
				bind:value={sortBy}
				class="bg-gray-950 border border-gray-800 text-gray-300 text-xs rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 cursor-pointer"
			>
				<option value="total">Highest Total Messages</option>
				<option value="sent">Most Messages Sent</option>
				<option value="received">Most Messages Received</option>
				<option value="conversations">Most Conversations</option>
			</select>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Messages Sent</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Received</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Volume</th>
					<th class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Conversations</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each filteredMetrics as client}
					<tr class="hover:bg-gray-800/50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="text-sm font-bold text-white block">{client.name}</span>
							<span class="text-xs text-gray-500 block">{client.email} (ID: {client.id})</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 py-0.5 text-xs font-medium rounded-md bg-gray-800 text-gray-300 border border-gray-700">
								{client.planType}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right font-semibold text-emerald-400">
							{client.outgoingCount.toLocaleString()}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right font-semibold text-blue-400">
							{client.incomingCount.toLocaleString()}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right font-bold text-white text-base">
							{client.totalMessages.toLocaleString()}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right font-semibold text-purple-400">
							{client.conversationsCount.toLocaleString()}
						</td>
					</tr>
				{/each}

				{#if filteredMetrics.length === 0}
					<tr>
						<td colspan="6" class="px-6 py-12 text-center text-gray-500">
							No workspaces match your search filter.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
