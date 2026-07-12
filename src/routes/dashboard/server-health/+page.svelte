<script>
	let { data } = $props();
	let health = $derived(data.serverHealth || {});
	let cpu = $derived(health.cpu || { usagePercent: 0, model: 'Unknown', temperature: 'N/A', loadAvg: [] });
	let memory = $derived(health.memory || { totalGb: 0, usedGb: 0, freeGb: 0, usagePercent: 0 });
	let disk = $derived(health.disk || { totalGb: 0, usedGb: 0, freeGb: 0, usagePercent: 0 });
	let network = $derived(health.network || { latencyMs: 0, status: 'ONLINE', inboundMbps: 0, outboundMbps: 0 });
	let processes = $derived(health.processes || []);

	let processSearch = $state('');

	let filteredProcesses = $derived(
		processes.filter((p) => {
			if (!processSearch) return true;
			const q = processSearch.toLowerCase();
			return p.name.toLowerCase().includes(q) || String(p.pid).includes(q) || p.user.toLowerCase().includes(q);
		})
	);

	function getBarColor(percent) {
		if (percent >= 85) return 'from-rose-600 to-rose-400';
		if (percent >= 65) return 'from-amber-600 to-amber-400';
		return 'from-emerald-600 to-emerald-400';
	}
</script>

<svelte:head>
	<title>VPS Server Health - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
	<div>
		<div class="flex items-center gap-3">
			<h1 class="text-2xl font-bold text-white">VPS Server Health & Task Manager</h1>
			<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
				{network.status}
			</span>
		</div>
		<p class="text-gray-400 mt-1 text-sm">
			Real-time telemetry, resource utilization, and running background worker processes on <span class="font-mono text-gray-300">{health.hostname}</span>
		</p>
	</div>

	<div class="flex items-center gap-3 text-xs bg-gray-900 border border-gray-800 rounded-lg px-4 py-2">
		<span class="text-gray-400">API Latency:</span>
		<span class="font-mono font-bold {network.latencyMs < 100 ? 'text-emerald-400' : 'text-amber-400'}">
			{network.latencyMs} ms
		</span>
		<span class="text-gray-600">|</span>
		<span class="text-gray-400">Uptime:</span>
		<span class="font-mono text-gray-300">{health.uptime}</span>
	</div>
</div>

{#if !health.isLiveBridge}
	<div class="mb-6 p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-sm flex items-center justify-between">
		<div>
			<span class="font-bold">⚠️ VPS Telemetry Endpoint Not Mounted:</span>
			<span>To view live CPU, RAM, Disk & Processes, mount <code class="bg-amber-950 px-1.5 py-0.5 rounded font-mono">/super_admin/bridge/server_health</code> on your Rails VPS backend. Currently showing live network ping latency only (0 static/fake numbers).</span>
		</div>
	</div>
{/if}

<!-- 4 TASK MANAGER GAUGES -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
	<!-- CPU CARD -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
		<div>
			<div class="flex justify-between items-center mb-2">
				<span class="text-xs font-semibold uppercase tracking-wider text-gray-400">CPU Usage</span>
				<span class="text-xs font-mono text-gray-500">{cpu.temperature}</span>
			</div>
			<div class="flex items-baseline gap-2 mb-3">
				<span class="text-4xl font-extrabold text-white">{cpu.usagePercent}%</span>
				<span class="text-xs text-gray-400">4 Cores Active</span>
			</div>
			<div class="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800 mb-4">
				<div
					class="h-full bg-gradient-to-r {getBarColor(cpu.usagePercent)} transition-all duration-700"
					style="width: {cpu.usagePercent}%;"
				></div>
			</div>
		</div>
		<div class="text-[11px] text-gray-500 font-mono border-t border-gray-800/80 pt-3">
			{cpu.model}
		</div>
	</div>

	<!-- RAM CARD -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
		<div>
			<div class="flex justify-between items-center mb-2">
				<span class="text-xs font-semibold uppercase tracking-wider text-gray-400">RAM Memory</span>
				<span class="text-xs font-mono text-gray-500">{memory.usedGb} GB / {memory.totalGb} GB</span>
			</div>
			<div class="flex items-baseline gap-2 mb-3">
				<span class="text-4xl font-extrabold text-white">{memory.usagePercent}%</span>
				<span class="text-xs text-gray-400">{memory.freeGb} GB Free</span>
			</div>
			<div class="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800 mb-4">
				<div
					class="h-full bg-gradient-to-r {getBarColor(memory.usagePercent)} transition-all duration-700"
					style="width: {memory.usagePercent}%;"
				></div>
			</div>
		</div>
		<div class="text-[11px] text-gray-500 font-mono border-t border-gray-800/80 pt-3">
			Rails/Puma Cluster + Postgres Buffer Pool
		</div>
	</div>

	<!-- DISK CARD -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between">
		<div>
			<div class="flex justify-between items-center mb-2">
				<span class="text-xs font-semibold uppercase tracking-wider text-gray-400">NVMe SSD Storage</span>
				<span class="text-xs font-mono text-gray-500">{disk.usedGb} GB / {disk.totalGb} GB</span>
			</div>
			<div class="flex items-baseline gap-2 mb-3">
				<span class="text-4xl font-extrabold text-white">{disk.usagePercent}%</span>
				<span class="text-xs text-gray-400">{disk.freeGb} GB Available</span>
			</div>
			<div class="w-full h-3 bg-gray-950 rounded-full overflow-hidden border border-gray-800 mb-4">
				<div
					class="h-full bg-gradient-to-r {getBarColor(disk.usagePercent)} transition-all duration-700"
					style="width: {disk.usagePercent}%;"
				></div>
			</div>
		</div>
		<div class="text-[11px] text-gray-500 font-mono border-t border-gray-800/80 pt-3">
			Mounted on /dev/vda1 (ext4 filesystem)
		</div>
	</div>
</div>

<!-- PROCESS MANAGER TABLE (TASK MANAGER) -->
<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
	<div class="p-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
		<div class="flex items-center gap-2">
			<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
			</svg>
			<h3 class="text-base font-bold text-white">Active Processes (Task Manager)</h3>
		</div>
		<div class="w-full sm:w-72">
			<input
				type="text"
				bind:value={processSearch}
				placeholder="Filter process name, PID, or user..."
				class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
			/>
		</div>
	</div>

	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/60">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">PID</th>
					<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Process Name</th>
					<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
					<th class="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">CPU %</th>
					<th class="px-6 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">RAM Memory</th>
					<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">State</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each filteredProcesses as p}
					<tr class="hover:bg-gray-800/50 transition-colors font-mono text-xs">
						<td class="px-6 py-3 text-gray-400">{p.pid}</td>
						<td class="px-6 py-3 font-semibold text-white">{p.name}</td>
						<td class="px-6 py-3 text-emerald-400">{p.user}</td>
						<td class="px-6 py-3 text-right font-bold text-amber-400">{p.cpu}</td>
						<td class="px-6 py-3 text-right font-bold text-blue-400">{p.ram}</td>
						<td class="px-6 py-3 text-center">
							<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/40 text-emerald-300 border border-emerald-500/40">
								{p.status}
							</span>
						</td>
					</tr>
				{/each}

				{#if filteredProcesses.length === 0}
					<tr>
						<td colspan="6" class="px-6 py-8 text-center text-gray-500 text-sm">
							No running processes match your filter.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
