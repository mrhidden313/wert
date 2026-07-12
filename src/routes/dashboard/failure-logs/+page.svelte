<script>
	let { data } = $props();

	let searchQuery = $state('');
	let selectedErrorCode = $state('all'); // 'all', '401', '404', '500', 'other'

	let filteredLogs = $derived(
		(data.logs || []).filter((log) => {
			// Search Query Filter
			if (searchQuery) {
				const q = searchQuery.toLowerCase();
				const matchEndpoint = log.endpoint?.toLowerCase().includes(q);
				const matchError = log.fullError?.toLowerCase().includes(q);
				const matchCode = String(log.errorCode)?.includes(q);
				if (!matchEndpoint && !matchError && !matchCode) return false;
			}

			// Error Code Filter
			if (selectedErrorCode !== 'all') {
				const code = String(log.errorCode || '');
				if (selectedErrorCode === '401' && !code.startsWith('401')) return false;
				if (selectedErrorCode === '404' && !code.startsWith('404')) return false;
				if (selectedErrorCode === '500' && !code.startsWith('5')) return false;
				if (selectedErrorCode === 'other' && (code.startsWith('401') || code.startsWith('404') || code.startsWith('5'))) {
					return false;
				}
			}

			return true;
		})
	);

	function formatDate(iso) {
		if (!iso) return 'Unknown Date';
		return new Date(iso).toLocaleString();
	}

	function getCodeBadgeColor(code) {
		const c = String(code);
		if (c.startsWith('5')) return 'bg-rose-900/40 text-rose-300 border-rose-500/40';
		if (c.startsWith('401') || c.startsWith('403')) return 'bg-amber-900/40 text-amber-300 border-amber-500/40';
		return 'bg-red-900/40 text-red-300 border-red-500/40';
	}
</script>

<svelte:head>
	<title>System Failure Logs - InstantFlow</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-bold text-white flex items-center gap-3">
		<span class="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span>
		System Failure & Error Logs
	</h1>
	<p class="text-gray-400 mt-1">
		Real-time failure capturing across Chatwoot APIs, Webhooks, and Bridge endpoints. Success logs are excluded.
	</p>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<!-- FILTER & SEARCH CONTROL BAR -->
<div class="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
	<div class="w-full sm:w-80">
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search endpoint, error code, or stack trace..."
			class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
		/>
	</div>

	<!-- FILTER BUTTONS -->
	<div class="flex flex-wrap items-center gap-2">
		<button
			onclick={() => (selectedErrorCode = 'all')}
			class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {selectedErrorCode === 'all'
				? 'bg-rose-600 text-white'
				: 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}"
		>
			All Errors ({data.logs?.length || 0})
		</button>
		<button
			onclick={() => (selectedErrorCode = '401')}
			class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {selectedErrorCode === '401'
				? 'bg-amber-600 text-white'
				: 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}"
		>
			401 / 403 Auth
		</button>
		<button
			onclick={() => (selectedErrorCode = '404')}
			class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {selectedErrorCode === '404'
				? 'bg-red-600 text-white'
				: 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}"
		>
			404 Not Found
		</button>
		<button
			onclick={() => (selectedErrorCode = '500')}
			class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors {selectedErrorCode === '500'
				? 'bg-rose-700 text-white'
				: 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'}"
		>
			5xx Server Error
		</button>
	</div>
</div>

<!-- ERROR CARDS LISTING -->
<div class="space-y-4">
	{#each filteredLogs as log}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm hover:border-gray-700 transition-colors">
			<div class="px-6 py-4 bg-gray-950/60 border-b border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
				<div class="flex items-center gap-3">
					<span class="px-2.5 py-1 text-xs font-bold rounded-md border {getCodeBadgeColor(log.errorCode)}">
						HTTP {log.errorCode || 'ERR'}
					</span>
					<span class="font-mono text-sm font-semibold text-rose-400">
						{log.endpoint || 'Unknown Endpoint'}
					</span>
				</div>
				<span class="text-xs text-gray-500 font-mono">
					{formatDate(log.timestamp)}
				</span>
			</div>

			<!-- FULL ERROR DISPLAY -->
			<div class="p-6">
				<div class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
					Full Error Message / Stack Output
				</div>
				<div class="bg-gray-950 border border-gray-800/80 rounded-lg p-4 font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
					{log.fullError || 'No error output provided.'}
				</div>

				{#if log.context}
					<div class="mt-4">
						<div class="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
							Request Payload Context
						</div>
						<div class="bg-gray-950/50 rounded p-2 font-mono text-[11px] text-gray-400 overflow-x-auto">
							{log.context}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/each}

	{#if filteredLogs.length === 0}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
			<div class="text-emerald-400 font-bold text-lg mb-1">No Failure Logs Found!</div>
			<p class="text-gray-500 text-sm">
				All monitored endpoints and API requests are running smoothly with zero recorded errors.
			</p>
		</div>
	{/if}
</div>
