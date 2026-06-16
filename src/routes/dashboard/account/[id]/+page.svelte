<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
</script>

<svelte:head>
	<title>Account Details - InstantFlow</title>
</svelte:head>

<div class="mb-8 flex items-center space-x-4">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-2xl font-bold text-white">Account Details</h1>
		<p class="text-gray-400 mt-1">View workspace data and subscription information.</p>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
		{data.error}
	</div>
{:else if data.account}
	<!-- Form success/error from actions -->
	{#if form?.error}
		<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg mb-6">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 p-4 rounded-lg mb-6">
			{form.message || 'Action completed successfully!'}
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Chatwoot Data -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Chatwoot Workspace</h2>
			
			<div class="space-y-4">
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Account ID</label>
					<div class="mt-1 text-sm text-gray-300 font-mono">{data.account.id}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Workspace Name</label>
					<div class="mt-1 text-sm text-white font-medium">{data.account.name}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Administrator Email</label>
					<div class="mt-1 text-sm text-gray-300">{data.account.admin_email || 'No Admin Linked'}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Administrator Name</label>
					<div class="mt-1 text-sm text-gray-300">{data.account.admin_name || 'N/A'}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Created On</label>
					<div class="mt-1 text-sm text-gray-300">{data.account.created_at}</div>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase">Status</label>
					<div class="mt-1">
						{#if data.account.status === 'active'}
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-900/30 text-blue-400 border border-blue-500/20">Active</span>
						{:else}
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-900/30 text-red-400 border border-red-500/20">{data.account.status}</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

				<!-- Subscription & Billing Form -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Subscription & Billing</h2>
			
			<form method="POST" action="?/editSubscription" use:enhance class="space-y-4">
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase mb-1">Plan Type</label>
					<input type="text" name="planType" value={data.account.planType} required class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase mb-1">Days Remaining</label>
					<input type="number" name="daysRemaining" value={data.account.daysRemaining} required class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase mb-1">Linked Email (for DB)</label>
					<input type="email" name="linkedEmail" value={data.account.admin_email || 'N/A'} required class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 uppercase mb-1">Phone Number</label>
					<input type="text" name="phoneNumber" value={data.account.phoneNumber} class="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
				</div>
				<div class="pt-2">
					<button type="submit" class="w-full px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 hover:text-emerald-400 border border-emerald-600/30 rounded-lg text-sm font-medium transition-colors">
						Save Subscription Data
					</button>
				</div>
			</form>
		</div>
		<!-- Security & Access Data -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm md:col-span-2">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Security & Access</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div class="max-w-md">
					<label class="block text-xs font-medium text-gray-500 uppercase mb-2">Reset Admin Password</label>
					<form method="POST" action="?/resetPassword" use:enhance class="flex items-center space-x-3">
						<input 
							type="text" 
							name="newPassword" 
							placeholder="New Password (min 6 chars)" 
							minlength="6"
							required
							class="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
						/>
						<button 
							type="submit" 
							class="px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 hover:text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium transition-colors"
						>
							Reset Password
						</button>
					</form>
					<p class="text-xs text-gray-500 mt-2">This will immediately change the login password for {data.account.admin_email || 'the admin user'} in Chatwoot.</p>
				</div>
				
				<div class="max-w-md">
					<label class="block text-xs font-medium text-gray-500 uppercase mb-2">Force Logout</label>
					<form method="POST" action="?/forceLogout" use:enhance>
						<button 
							type="submit" 
							class="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 hover:text-red-400 border border-red-600/30 rounded-lg text-sm font-medium transition-colors"
						>
							Logout From All Devices
						</button>
					</form>
					<p class="text-xs text-gray-500 mt-2">Instantly wipe all access tokens. The user will be forcefully kicked out of all active sessions.</p>
				</div>
			</div>
		</div>
	</div>
{/if}
