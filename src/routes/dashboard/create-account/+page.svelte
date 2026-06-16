<script>
	import { enhance } from '$app/forms';
	let { form } = $props();
	
	let loading = false;
</script>

<svelte:head>
	<title>Build Account - InstantFlow</title>
</svelte:head>

<div class="max-w-3xl mx-auto">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white">Build New Account</h1>
		<p class="text-gray-400 mt-1">Create a new Chatwoot workspace and Firebase plan simultaneously.</p>
	</div>

	<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
		<form method="POST" use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				await update();
				loading = false;
			};
		}}>
			<div class="p-6 space-y-6">
				
				{#if form?.success}
					<div class="bg-emerald-900/30 border border-emerald-500/50 text-emerald-400 p-4 rounded-lg flex items-start">
						<svg class="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<div>
							<h3 class="font-medium text-sm">Account created successfully!</h3>
							<p class="text-xs text-emerald-500/80 mt-1">Chatwoot Account ID: {form.accountId}</p>
						</div>
					</div>
				{/if}

				{#if form?.error}
					<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-lg flex items-start">
						<svg class="w-5 h-5 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
						<span class="text-sm">{form.error}</span>
					</div>
				{/if}

				<!-- Company Details -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4 border-b border-gray-800 pb-2">Business Details</h3>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div class="sm:col-span-2">
							<label for="companyName" class="block text-sm font-medium text-gray-300">Company / Workspace Name</label>
							<input type="text" name="companyName" id="companyName" required 
								class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-white shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
						</div>
					</div>
				</div>

				<!-- Admin User Details -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4 border-b border-gray-800 pb-2">Admin User Credentials</h3>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div>
							<label for="email" class="block text-sm font-medium text-gray-300">Email Address</label>
							<input type="email" name="email" id="email" required 
								class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-white shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
						</div>
						
						<div>
							<label for="phoneNumber" class="block text-sm font-medium text-gray-300">Phone Number (Optional)</label>
							<input type="text" name="phoneNumber" id="phoneNumber" 
								class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-white shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
						</div>

						<div>
							<label for="password" class="block text-sm font-medium text-gray-300">Password</label>
							<input type="text" name="password" id="password" required minlength="6"
								class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-white shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
						</div>
					</div>
				</div>

				<!-- Billing & Plan Details -->
				<div>
					<h3 class="text-lg font-medium text-white mb-4 border-b border-gray-800 pb-2">Plan & Access</h3>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
						<div>
							<label for="planType" class="block text-sm font-medium text-gray-300">Plan Type</label>
							<select id="planType" name="planType" 
								class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-800 bg-gray-950 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-md">
								<option value="Trial">Trial (7 Days)</option>
								<option value="Basic">Basic (1 Month)</option>
								<option value="Premium" selected>Premium (1 Month)</option>
								<option value="Lifetime">Lifetime</option>
							</select>
						</div>

						<div>
							<label for="daysRemaining" class="block text-sm font-medium text-gray-300">Validity (Days)</label>
							<input type="number" name="daysRemaining" id="daysRemaining" value="30" required 
								class="mt-1 block w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-white shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm">
						</div>
					</div>
					<p class="mt-2 text-xs text-gray-500">Note: All Chatwoot limits (inboxes, agents) will be set to maximum by default.</p>
				</div>

			</div>
			
			<div class="px-6 py-4 bg-gray-950/50 border-t border-gray-800 flex items-center justify-end">
				<button type="submit" disabled={loading}
					class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-950 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors">
					{#if loading}
						<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Building Backend...
					{:else}
						Create & Build Account
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
