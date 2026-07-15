<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	
	let loading = $state(false);

	let totalExpenses = $derived((data.expenses || []).reduce((sum, exp) => sum + exp.amount, 0));
</script>

<svelte:head>
	<title>App Expenses - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">App Expenses</h1>
		<p class="text-gray-400 mt-1">Track server costs, VPS, and other platform fees.</p>
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
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h3 class="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Total Platform Expenses</h3>
			<p class="text-4xl font-bold text-red-400">Rs {totalExpenses.toLocaleString()}</p>
		</div>

		<!-- Record Expense Form -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h3 class="text-lg font-semibold text-white mb-4">Record New Expense</h3>
			
			<form method="POST" action="?/addExpense" use:enhance={() => { loading = true; return async ({ update }) => { await update(); loading = false; }; }}>
				<div class="space-y-4">
					<div>
						<label for="category" class="block text-sm font-medium text-gray-400 mb-1">Category</label>
						<select id="category" name="category" required
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
							<option value="VPS">VPS / Hosting</option>
							<option value="Domain">Domain / DNS</option>
							<option value="API">API Usage (OpenAI/Anthropic)</option>
							<option value="Marketing">Marketing / Ads</option>
							<option value="Other">Other</option>
						</select>
					</div>

					<div>
						<label for="amount" class="block text-sm font-medium text-gray-400 mb-1">Amount (Rs)</label>
						<input type="number" id="amount" name="amount" required min="1"
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
					</div>
					
					<div>
						<label for="note" class="block text-sm font-medium text-gray-400 mb-1">Description / Notes</label>
						<textarea id="note" name="note" rows="2" required placeholder="e.g. Contabo VPS monthly renewal"
							class="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"></textarea>
					</div>

					<button type="submit" disabled={loading}
						class="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-500 border border-red-500/30 font-medium rounded-lg transition-colors focus:outline-none disabled:opacity-50">
						{loading ? 'Recording...' : 'Record Expense'}
					</button>
				</div>
			</form>
		</div>
	</div>

	<div class="lg:col-span-2">
		<!-- History -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
			<div class="px-6 py-4 border-b border-gray-800">
				<h2 class="text-lg font-semibold text-white">Expense History</h2>
			</div>
			<div class="overflow-x-auto flex-grow">
				<table class="min-w-full divide-y divide-gray-800">
					<thead class="bg-gray-950/50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Recorded By</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-800">
						{#each data.expenses || [] as expense}
							<tr class="hover:bg-gray-800/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
									{new Date(expense.timestamp).toLocaleDateString()}
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
									<span class="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded border border-gray-700">
										{expense.category}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-400">
									-Rs {expense.amount.toLocaleString()}
								</td>
								<td class="px-6 py-4 text-sm text-gray-400">
									{expense.adminEmail.split('@')[0]}
									<div class="text-xs text-gray-500 mt-1 max-w-xs truncate">{expense.note}</div>
								</td>
							</tr>
						{/each}
						
						{#if !data.expenses || data.expenses.length === 0}
							<tr>
								<td colspan="4" class="px-6 py-12 text-center text-gray-500">
									No expenses recorded yet.
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
