<script>
	import { enhance } from '$app/forms';
	let { data } = $props();
	
	let loadingAction = null;
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
				{#each data.accounts as account}
					<tr class="hover:bg-gray-800/50 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="text-sm font-medium text-white">{account.name}</div>
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
									<button type="submit" disabled={loadingAction} class="text-red-400 hover:text-red-300 disabled:opacity-50">
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

						</td>
					</tr>
				{/each}

				{#if data.accounts.length === 0}
					<tr>
						<td colspan="6" class="px-6 py-12 text-center text-gray-500">
							No accounts found. Create one to get started.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>
