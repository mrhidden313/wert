<script>
	import { enhance } from '$app/forms';
	let { data } = $props();
	
	let loadingAction = $state(null);
	let currentTab = $state('active'); // 'active', 'expired', 'suspended'

	let filteredAccounts = $derived((data.accounts || []).filter(account => {
		if (currentTab === 'active') {
			return account.status === 'active' && account.daysRemaining > 0;
		} else if (currentTab === 'expired') {
			return account.status === 'active' && account.daysRemaining <= 0;
		} else if (currentTab === 'suspended') {
			return account.status === 'suspended';
		}
		return true;
	}));
</script>

<svelte:head>
	<title>Accounts Dashboard - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex justify-between items-end">
	<div>
		<h1 class="text-2xl font-bold text-white">All Accounts</h1>
		<p class="text-gray-400 mt-1">Manage workspaces, subscriptions, and access.</p>
	</div>
	<a href="/dashboard/create-account" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors">
		+ Build Account
	</a>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{/if}

<div class="mb-6 border-b border-gray-800">
	<nav class="-mb-px flex space-x-8" aria-label="Tabs">
		<button 
			class="{currentTab === 'active' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
			onclick={() => currentTab = 'active'}>
			Active
		</button>
		<button 
			class="{currentTab === 'expired' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
			onclick={() => currentTab = 'expired'}>
			Expired
		</button>
		<button 
			class="{currentTab === 'suspended' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-700'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors"
			onclick={() => currentTab = 'suspended'}>
			Suspended
		</button>
	</nav>
</div>

<div class="bg-gray-900 border border-gray-800 rounded-xl shadow-sm overflow-hidden">
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/50">
				<tr>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Admin Email</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plan</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Validity</th>
					<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
					<th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each filteredAccounts as account}
					<tr class="hover:bg-gray-800/50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap">
							<a href="/dashboard/account/{account.id}" class="text-sm font-medium text-emerald-400 hover:text-emerald-300 hover:underline">{account.name}</a>
							<div class="text-xs text-gray-500">ID: {account.id}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm text-gray-300">{account.linkedEmail}</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
								{account.planType}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm text-gray-300">
								{#if account.daysRemaining > 0}
									{account.daysRemaining} days left
								{:else}
									<span class="text-red-400 font-medium">Expired</span>
								{/if}
							</div>
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							{#if account.status === 'active'}
								<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">
									Active
								</span>
							{:else}
								<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900/30 text-red-400 border border-red-500/20">
									Suspended
								</span>
							{/if}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-3">
							
							{#if account.status === 'active'}
								<!-- Suspend Action -->
								<form method="POST" action="?/suspend" use:enhance={() => {
									loadingAction = `suspend-${account.id}`;
									return async ({ update }) => { await update(); loadingAction = null; };
								}}>
									<input type="hidden" name="accountId" value={account.id} />
									<button type="submit" disabled={loadingAction} class="text-yellow-500 hover:text-yellow-400 disabled:opacity-50">
										Suspend
									</button>
								</form>
							{:else}
								<!-- Renew Action (Quick 30 days) -->
								<form method="POST" action="?/renew" use:enhance={() => {
									loadingAction = `renew-${account.id}`;
									return async ({ update }) => { await update(); loadingAction = null; };
								}}>
									<input type="hidden" name="accountId" value={account.id} />
									<input type="hidden" name="planType" value={account.planType} />
									<input type="hidden" name="daysRemaining" value="30" />
									<button type="submit" disabled={loadingAction} class="text-emerald-400 hover:text-emerald-300 disabled:opacity-50">
										Renew (30d)
									</button>
								</form>
							{/if}

							<!-- Destroy Action -->
							<form method="POST" action="?/destroy" use:enhance={() => {
								if (!confirm('Are you absolutely sure? This will delete the account and all its data permanently.')) return () => {};
								loadingAction = `destroy-${account.id}`;
								return async ({ update }) => { await update(); loadingAction = null; };
							}}>
								<input type="hidden" name="accountId" value={account.id} />
								<button type="submit" disabled={loadingAction} class="text-red-500 hover:text-red-400 disabled:opacity-50 ml-2 border-l border-gray-700 pl-3">
									Destroy
								</button>
							</form>

						</td>
					</tr>
				{/each}

				{#if filteredAccounts.length === 0}
					<tr>
						<td colspan="6" class="px-6 py-12 text-center text-gray-500">
							No accounts found in this category.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
