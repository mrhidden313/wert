<script>
	import { Doughnut, Pie } from 'svelte-chartjs';
	import { Chart, Title, Tooltip, Legend, ArcElement } from 'chart.js';

	Chart.register(Title, Tooltip, Legend, ArcElement);

	let { data } = $props();

	let duesData = {
		labels: ['Paid Revenue', 'Pending Dues'],
		datasets: [{
			data: [data.analytics?.totalRevenue || 0, data.analytics?.totalPending || 0],
			backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(249, 115, 22, 0.8)'],
			borderColor: ['rgba(16, 185, 129, 1)', 'rgba(249, 115, 22, 1)'],
			borderWidth: 1
		}]
	};

	let methodsData = {
		labels: ['Cash', 'Bank', 'Easypaisa', 'Other'],
		datasets: [{
			data: [
				data.analytics?.paymentMethods?.Cash || 0,
				data.analytics?.paymentMethods?.Bank || 0,
				data.analytics?.paymentMethods?.Easypaisa || 0,
				data.analytics?.paymentMethods?.Other || 0
			],
			backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)', 'rgba(139, 92, 246, 0.8)', 'rgba(107, 114, 128, 0.8)'],
			borderColor: ['#111827', '#111827', '#111827', '#111827'],
			borderWidth: 2
		}]
	};

	const pieOptions = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				position: 'bottom',
				labels: { color: '#9ca3af', padding: 20, font: { size: 12 } }
			}
		}
	};
</script>

<svelte:head>
	<title>Billing & Pricing - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">Billing & Pricing Dashboard</h1>
		<p class="text-gray-400 mt-1">Financial analytics and pending dues overview.</p>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<!-- ANALYTICS SECTION -->
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
	<!-- Summary Cards -->
	<div class="flex flex-col gap-4">
		<div class="bg-gradient-to-br from-emerald-900/40 to-gray-900 border border-emerald-500/20 p-6 rounded-xl shadow-sm flex-1 flex flex-col justify-center">
			<h3 class="text-emerald-500 text-sm font-medium uppercase tracking-wider mb-2">Total Revenue</h3>
			<p class="text-4xl font-bold text-white">Rs {data.analytics?.totalRevenue?.toLocaleString() || 0}</p>
		</div>
		<div class="bg-gradient-to-br from-orange-900/40 to-gray-900 border border-orange-500/20 p-6 rounded-xl shadow-sm flex-1 flex flex-col justify-center">
			<h3 class="text-orange-500 text-sm font-medium uppercase tracking-wider mb-2">Pending Dues</h3>
			<p class="text-4xl font-bold text-white">Rs {data.analytics?.totalPending?.toLocaleString() || 0}</p>
		</div>
	</div>

	<!-- Paid vs Pending Chart -->
	<div class="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-sm">
		<h3 class="text-gray-300 text-sm font-medium uppercase tracking-wider mb-4 text-center">Collection Status</h3>
		<div class="h-48">
			<Doughnut data={duesData} options={pieOptions} />
		</div>
	</div>

	<!-- Payment Methods Chart -->
	<div class="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-sm">
		<h3 class="text-gray-300 text-sm font-medium uppercase tracking-wider mb-4 text-center">Payment Methods</h3>
		<div class="h-48">
			<Pie data={methodsData} options={pieOptions} />
		</div>
	</div>
</div>

<!-- LEDGER TABLE -->
<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden mt-8">
	<div class="px-6 py-4 border-b border-gray-800">
		<h2 class="text-lg font-semibold text-white">Accounts with Pending Dues</h2>
	</div>
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

