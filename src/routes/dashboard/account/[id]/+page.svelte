<script>
	import { enhance } from '$app/forms';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();
	let loadingAction = $state(null);

	// Modals State
	let showPaymentModal = $state(false);
	let paymentData = $state({ type: 'monthly', feeId: null, amount: 0, maxAmount: 0, bankType: 'Cash', txId: '', notes: '', title: '' });

	let showAddInvoiceModal = $state(false);
	let invoiceData = $state({ amount: 5000, month: new Date().toLocaleString('default', { month: 'short', year: 'numeric' }) });

	let showStartupFeeModal = $state(false);
	let startupFeeData = $state({ amount: 5000 });

	let isSubmitting = $state(false);
	let isFetchingPhone = $state(false);
	let isTogglingInbox = $state(null);
	let currentPhone = $state(data.account?.phoneNumber || '');
	let currentHealth = $state(data.account?.whatsapp_health || null);
	let inboxes = $state(data.account?.inboxes || []);
	let ignoredInboxIds = $state(data.account?.ignored_inbox_ids || []);

	$effect(() => {
		if (data.account?.phoneNumber !== undefined) currentPhone = data.account.phoneNumber;
		if (data.account?.whatsapp_health !== undefined) currentHealth = data.account.whatsapp_health;
		if (data.account?.inboxes !== undefined) inboxes = data.account.inboxes;
		if (data.account?.ignored_inbox_ids !== undefined) ignoredInboxIds = data.account.ignored_inbox_ids;
	});

	async function toggleInbox(inboxId, shouldIgnore) {
		isTogglingInbox = inboxId;
		try {
			const formData = new FormData();
			formData.append('inboxId', String(inboxId));
			formData.append('ignore', String(shouldIgnore));

			const res = await fetch('?/toggleIgnoreInbox', {
				method: 'POST',
				body: formData
			});
			const result = await res.json();
			if (result?.data) {
				const resData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
				if (resData.inboxes) inboxes = resData.inboxes;
				if (resData.phoneNumber) currentPhone = resData.phoneNumber;
				if (resData.health !== undefined) currentHealth = resData.health;
				if (resData.ignored_inbox_ids) ignoredInboxIds = resData.ignored_inbox_ids;
			}
		} catch (e) {
			console.error("Toggle inbox error:", e);
		} finally {
			isTogglingInbox = null;
		}
	}

	function openPaymentModal(type, feeId, maxAmount, title) {
		paymentData = {
			type,
			feeId,
			amount: maxAmount,
			maxAmount: maxAmount,
			bankType: 'Cash',
			txId: '',
			notes: '',
			title: title || (type === 'startup' ? 'Pay Startup Fee' : 'Pay Monthly Invoice')
		};
		showPaymentModal = true;
	}

	function openAddInvoiceModal() {
		invoiceData = {
			amount: data.account?.monthly_fee_amount || 5000,
			month: new Date().toLocaleString('default', { month: 'short', year: 'numeric' })
		};
		showAddInvoiceModal = true;
	}

	function openStartupFeeModal() {
		startupFeeData = {
			amount: data.account?.startup_fee?.amount || 5000
		};
		showStartupFeeModal = true;
	}
</script>

<svelte:head>
	<title>Account: {data.account?.name || 'Details'} — InstantFlow</title>
</svelte:head>

<!-- Top Header Navigation -->
<div class="mb-5 flex items-center space-x-3">
	<a href="/dashboard" class="p-2 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors shrink-0 shadow-sm">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<div class="flex items-center gap-2">
			<h1 class="text-xl sm:text-2xl font-black text-white">{data.account?.name || 'Account Details'}</h1>
			{#if data.account?.status === 'active'}
				<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">Active</span>
			{:else}
				<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-950 text-red-400 border border-red-800/50">Suspended</span>
			{/if}
			{#if data.account?.freeze || (data.account?.daysRemaining !== undefined && data.account.daysRemaining <= 0)}
				<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-orange-950 text-orange-400 border border-orange-800/60 animate-pulse">App Frozen</span>
			{/if}
		</div>
		<p class="text-gray-400 text-xs mt-0.5">Workspace ID: <span class="font-mono text-gray-300 font-bold">{data.account?.id}</span> &bull; Linked: <span class="text-gray-300">{data.account?.admin_email || 'No email'}</span></p>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-xl mb-5 flex items-center gap-3">
		<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
		<span>{data.error}</span>
	</div>
{:else if data.account}
	<!-- Feedback Alerts -->
	{#if form?.error}
		<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-xl mb-5 flex items-center gap-3">
			<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
			<span>{form.error}</span>
		</div>
	{/if}
	{#if form?.noNumbers}
		<div class="bg-amber-900/30 border border-amber-500/50 text-amber-300 p-4 rounded-xl mb-5 flex items-center gap-3">
			<svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
			<span>{form.message}</span>
		</div>
	{/if}
	{#if form?.success}
		<div class="bg-emerald-900/30 border border-emerald-500/50 text-emerald-300 p-4 rounded-xl mb-5 flex items-center gap-3">
			<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
			<span>{form.message || 'Action completed successfully!'}</span>
		</div>
	{/if}

	<!-- Hidden form for fetchInboxNumbers -->
	<form
		id="fetchPhoneForm"
		method="POST"
		action="?/fetchInboxNumbers"
		use:enhance={() => {
			isFetchingPhone = true;
			return async ({ result, update }) => {
				await update();
				isFetchingPhone = false;
				if (result.data?.fetchedPhone) {
					currentPhone = result.data.fetchedPhone;
				}
				if (result.data?.health !== undefined) {
					currentHealth = result.data.health;
				}
				if (result.data?.inboxes) {
					inboxes = result.data.inboxes;
				}
			};
		}}
		class="hidden"
	></form>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
		
		<!-- Chatwoot Workspace Info -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center gap-2">
				<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
				Chatwoot Workspace Info
			</h2>
			
			<div class="space-y-3.5 text-xs sm:text-sm font-sans">
				<div class="flex justify-between items-center py-1 border-b border-gray-800/60">
					<span class="text-gray-400 font-medium">Account ID</span>
					<span class="text-gray-200 font-mono font-bold bg-black/40 px-2 py-0.5 rounded">{data.account.id}</span>
				</div>
				<div class="flex justify-between items-center py-1 border-b border-gray-800/60">
					<span class="text-gray-400 font-medium">Workspace Name</span>
					<span class="text-white font-bold">{data.account.name}</span>
				</div>
				<div class="flex justify-between items-center py-1 border-b border-gray-800/60">
					<span class="text-gray-400 font-medium">Admin Email</span>
					<span class="text-gray-200 font-mono">{data.account.admin_email || 'No Admin Linked'}</span>
				</div>
				<div class="flex justify-between items-center py-1 border-b border-gray-800/60">
					<span class="text-gray-400 font-medium">Admin Name</span>
					<span class="text-gray-200">{data.account.admin_name || 'N/A'}</span>
				</div>
				<div class="flex justify-between items-center py-1 border-b border-gray-800/60">
					<span class="text-gray-400 font-medium">Created On</span>
					<span class="text-gray-400 text-xs">{data.account.created_at || 'N/A'}</span>
				</div>
				<div class="flex justify-between items-center py-1">
					<span class="text-gray-400 font-medium">Status</span>
					<div>
						{#if data.account.status === 'active'}
							<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">Active</span>
						{:else}
							<span class="px-2.5 py-0.5 text-xs font-bold rounded-full bg-red-950 text-red-400 border border-red-800/50">{data.account.status}</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Subscription & Validity Settings -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center gap-2">
				<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				Subscription & Contacts
			</h2>
			
			<form method="POST" action="?/editSubscription" use:enhance class="space-y-3.5 text-xs">
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block font-bold text-gray-400 uppercase mb-1">Plan Type</label>
						<select name="planType" class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer">
							<option value="Trial" selected={data.account.planType === 'Trial'}>Trial</option>
							<option value="Monthly" selected={data.account.planType === 'Monthly' || data.account.planType === 'Unknown'}>Monthly</option>
							<option value="Yearly" selected={data.account.planType === 'Yearly'}>Yearly</option>
						</select>
					</div>
					<div>
						<label class="block font-bold text-gray-400 uppercase mb-1">Days Remaining</label>
						<input type="number" name="daysRemaining" value={data.account.daysRemaining} required class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
					</div>
				</div>

				<div>
					<label class="block font-bold text-gray-400 uppercase mb-1">Linked Email (Firestore Key)</label>
					<input type="email" name="linkedEmail" value={data.account.admin_email || 'N/A'} required class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500" />
				</div>

				<div>
					<div class="flex items-center justify-between mb-1">
						<label class="block font-bold text-gray-400 uppercase">Phone Number (Client Contact)</label>
						<button
							type="submit"
							form="fetchPhoneForm"
							disabled={isFetchingPhone}
							class="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-800/60 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
							title="Fetch connected WhatsApp / SMS numbers directly from Chatwoot inboxes"
						>
							{#if isFetchingPhone}
								<span class="inline-block w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
								<span>Fetching...</span>
							{:else}
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
								<span>Auto-Fetch from Chatwoot</span>
							{/if}
						</button>
					</div>
					<input type="text" name="phoneNumber" bind:value={currentPhone} placeholder="e.g. +923001234567" class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono" />

					{#if inboxes && inboxes.length > 0}
						<!-- Multi-Channel Manager Card -->
						<div class="mt-3 p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-2.5">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="text-xs font-bold text-gray-300">Connected Channels ({inboxes.length})</span>
									<span class="text-[10px] text-gray-500 font-mono">Uncheck to ignore/mute</span>
								</div>
								{#if inboxes.filter(i => i.ignored).length > 0}
									<span class="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
										{inboxes.filter(i => i.ignored).length} Muted
									</span>
								{/if}
							</div>

							<div class="space-y-2">
								{#each inboxes as inbox}
									<div class="p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all {inbox.ignored ? 'bg-gray-900/40 border-gray-800/60 opacity-60' : 'bg-gray-900 border-gray-800'}">
										<div class="flex items-center gap-2.5">
											<button
												type="button"
												onclick={() => toggleInbox(inbox.id, !inbox.ignored)}
												disabled={isTogglingInbox === inbox.id}
												class="w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer {inbox.ignored ? 'bg-gray-800 border-gray-700 text-transparent' : 'bg-emerald-600 border-emerald-500 text-white'}"
												title={inbox.ignored ? 'Click to activate this channel' : 'Click to ignore/skip this channel'}
											>
												{#if isTogglingInbox === inbox.id}
													<span class="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
												{:else if !inbox.ignored}
													<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
												{/if}
											</button>

											<div>
												<div class="font-bold flex items-center gap-1.5 {inbox.ignored ? 'text-gray-400 line-through' : 'text-white'}">
													<span>{inbox.name}</span>
													<span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">ID #{inbox.id}</span>
												</div>
												<div class="text-[11px] font-mono mt-0.5 {inbox.ignored ? 'text-gray-500' : 'text-emerald-400 font-semibold'}">
													{inbox.phone_number || 'No phone'}
												</div>
											</div>
										</div>

										<div class="flex items-center gap-2">
											{#if inbox.health}
												<span class="px-2 py-0.5 rounded-full text-[10px] font-bold border {inbox.health.status === 'BANNED' || inbox.health.status === 'RESTRICTED' ? 'bg-red-950 text-red-400 border-red-800' : inbox.health.status === 'TOKEN_EXPIRED' ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-emerald-950 text-emerald-400 border-emerald-800'}">
													{inbox.health.status}
												</span>
											{/if}

											<span class="text-[10px] font-bold px-2 py-0.5 rounded {inbox.ignored ? 'bg-red-950/40 text-red-400 border border-red-900/50' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'}">
												{inbox.ignored ? 'Ignored' : 'Active'}
											</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					{#if currentHealth}
						<div class="mt-2.5 p-3 rounded-xl border text-xs flex flex-col gap-1.5 {currentHealth.health_level === 'BANNED' ? 'bg-red-950/60 border-red-800 text-red-300' : currentHealth.health_level === 'DANGER' || currentHealth.health_level === 'WARNING' ? 'bg-amber-950/60 border-amber-800 text-amber-300' : currentHealth.health_level === 'TOKEN_EXPIRED' ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'}">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 font-bold">
									<span class="w-2.5 h-2.5 rounded-full {currentHealth.health_level === 'BANNED' ? 'bg-red-500 animate-pulse' : currentHealth.health_level === 'DANGER' || currentHealth.health_level === 'WARNING' ? 'bg-amber-400 animate-pulse' : currentHealth.health_level === 'TOKEN_EXPIRED' ? 'bg-gray-400' : 'bg-emerald-400'}"></span>
									<span>Active WhatsApp Status: {currentHealth.status}</span>
								</div>
								<span class="text-[10px] font-mono opacity-80">{currentHealth.verified_at || 'Live'}</span>
							</div>
							<div class="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-white/10">
								<div>Quality Rating: <span class="font-bold">{currentHealth.quality_rating}</span></div>
								<div>Daily Limit: <span class="font-bold">{currentHealth.messaging_limit}</span></div>
							</div>
							{#if currentHealth.error}
								<div class="text-[10px] text-red-400 mt-0.5">Note: {currentHealth.error}</div>
							{/if}
						</div>
					{/if}
				</div>

				<div class="pt-2">
					<button type="submit" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-900/30 transition-all">
						Save Subscription Data
					</button>
				</div>
			</form>
		</div>

		<!-- Security & Access Credentials -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg md:col-span-2">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center gap-2">
				<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
				Security & Access Control
			</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
				<div>
					<label class="block text-xs font-bold text-gray-400 uppercase mb-2">Reset Client Admin Password</label>
					<form method="POST" action="?/resetPassword" use:enhance class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
						<input 
							type="text" 
							name="newPassword" 
							placeholder="New Password (min 6 chars)" 
							minlength="6"
							required
							class="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 transition-colors"
						/>
						<button 
							type="submit" 
							class="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition-colors whitespace-nowrap shadow-sm"
						>
							Reset Password
						</button>
					</form>
					<p class="text-[11px] text-gray-500 mt-2">Instantly updates the password for {data.account.admin_email || 'the admin user'} in Chatwoot.</p>
				</div>
				
				<div>
					<label class="block text-xs font-bold text-gray-400 uppercase mb-2">Force Logout (Wipe Tokens)</label>
					<form method="POST" action="?/forceLogout" use:enhance>
						<button 
							type="submit" 
							class="px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/40 font-bold rounded-xl text-xs transition-colors flex items-center gap-2"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
							Kick Out All Devices
						</button>
					</form>
					<p class="text-[11px] text-gray-500 mt-2">Invalidates all active tokens. Client will be immediately booted back to login.</p>
				</div>
			</div>
		</div>

		<!-- Billing Ledger: Startup Fee & Monthly Invoices -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg md:col-span-2">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
					<span>Financial Ledger & Invoices</span>
				</div>
			</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<!-- Startup Fee Card -->
				<div class="bg-gray-950 p-4 rounded-2xl border border-gray-800">
					<div class="flex items-center justify-between mb-3">
						<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Startup / Setup Fee</h3>
						{#if data.account.startup_fee}
							<button 
								onclick={openStartupFeeModal}
								class="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
							>
								Edit Fee
							</button>
						{/if}
					</div>

					{#if data.account.startup_fee}
						<div class="space-y-2 mb-3 text-xs">
							<div class="flex justify-between items-center">
								<span class="text-gray-400">Total Setup Fee:</span>
								<span class="text-white font-bold">Rs {data.account.startup_fee.amount}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-emerald-400">Total Paid:</span>
								<span class="text-emerald-400 font-bold">Rs {data.account.startup_fee.paid}</span>
							</div>
							<div class="flex justify-between items-center">
								<span class="text-orange-400">Remaining Due:</span>
								<span class="text-orange-400 font-bold">Rs {data.account.startup_fee.remaining}</span>
							</div>
							<div class="w-full bg-gray-800 rounded-full h-2 mt-2">
								<div class="bg-emerald-500 h-2 rounded-full" style="width: {Math.min(100, (data.account.startup_fee.paid / (data.account.startup_fee.amount || 1)) * 100)}%"></div>
							</div>
						</div>
						
						{#if data.account.startup_fee.remaining > 0}
							<button 
								class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
								onclick={() => openPaymentModal('startup', null, data.account.startup_fee.remaining, 'Pay Startup Fee')}
							>
								Record Payment (Rs {data.account.startup_fee.remaining} Due)
							</button>
						{:else}
							<div class="text-center py-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 rounded-xl border border-emerald-900">
								Startup Fee Fully Paid &bull; Cleared
							</div>
						{/if}
					{:else}
						<div class="text-center py-4">
							<p class="text-xs text-gray-500 mb-3">No setup fee configured for this workspace.</p>
							<button onclick={openStartupFeeModal} class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-sm transition-colors">
								+ Set Startup Fee
							</button>
						</div>
					{/if}
				</div>

				<!-- Monthly Recurring Fees -->
				<div class="bg-gray-950 p-4 rounded-2xl border border-gray-800 flex flex-col justify-between">
					<div>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Monthly Invoices</h3>
							<button 
								class="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
								onclick={openAddInvoiceModal}
							>
								+ Add Invoice
							</button>
						</div>
						
						<div class="space-y-2 max-h-52 overflow-y-auto pr-1">
							{#each data.account.pending_fees.filter(f => f.remaining > 0) as fee}
								<div class="flex justify-between items-center p-3 bg-gray-900 rounded-xl border border-gray-800 text-xs">
									<div>
										<div class="text-white font-bold">{fee.month_label}</div>
										<div class="text-orange-400 text-[11px]">Due: Rs {fee.remaining} <span class="text-gray-500">(Total: {fee.amount})</span></div>
									</div>
									<button 
										class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-colors"
										onclick={() => openPaymentModal('monthly', fee.id, fee.remaining, `Pay Invoice for ${fee.month_label}`)}
									>
										Pay
									</button>
								</div>
							{/each}
							{#if data.account.pending_fees.filter(f => f.remaining > 0).length === 0}
								<div class="text-xs text-gray-500 italic py-4 text-center">No pending monthly invoices. All dues are clear.</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Activity History -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg md:col-span-2">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center gap-2">
				<svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				Activity History & Payments
			</h2>
			<div class="space-y-3 max-h-72 overflow-y-auto pr-2">
				{#each [...data.account.history].reverse() as item}
					<div class="flex items-start gap-3 p-2.5 rounded-xl bg-gray-950/70 border border-gray-800/80 text-xs">
						<div class="w-2.5 h-2.5 mt-1 rounded-full shrink-0 {item.type === 'payment' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-blue-400'}"></div>
						<div class="flex-1">
							<div class="text-white font-bold">{item.action}</div>
							<div class="text-gray-400 text-[11px] mt-0.5">{new Date(item.date).toLocaleString()} &bull; <span class="text-gray-300 font-semibold">{item.admin}</span></div>
							{#if item.notes}
								<div class="text-gray-400 mt-1 italic bg-black/40 p-1.5 rounded-lg border border-gray-800 font-mono text-[10.5px]">Notes: {item.notes}</div>
							{/if}
						</div>
					</div>
				{/each}
				{#if data.account.history.length === 0}
					<div class="text-xs text-gray-500 italic text-center py-6">No activity history recorded yet.</div>
				{/if}
			</div>
		</div>

		<!-- Allowed Inboxes / Channel Access Control -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg md:col-span-2">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b border-gray-800 pb-2.5 gap-2">
				<h2 class="text-base font-bold text-white flex items-center gap-2">
					<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
					Allowed Channel Inboxes
				</h2>
				<div class="flex items-center space-x-1.5">
					<button
						type="button"
						onclick={() => { document.querySelectorAll('.inbox-checkbox').forEach(cb => cb.checked = true); }}
						class="px-2.5 py-1 text-[11px] font-bold bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
					>
						Select All
					</button>
					<button
						type="button"
						onclick={() => {
							document.querySelectorAll('.inbox-checkbox').forEach(cb => {
								cb.checked = (cb.name === 'whatsapp');
							});
						}}
						class="px-2.5 py-1 text-[11px] font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded-lg border border-emerald-800 transition-colors"
					>
						Only WhatsApp
					</button>
				</div>
			</div>

			<form method="POST" action="?/saveAllowedInboxes" use:enhance={() => {
				loadingAction = `inboxes`;
				return async ({ update }) => { await update(); loadingAction = null; };
			}}>
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
					{#each [
						{ id: 'whatsapp', label: 'WhatsApp Cloud API' },
						{ id: 'web_widget', label: 'Website Live Widget' },
						{ id: 'telegram', label: 'Telegram Bot' },
						{ id: 'api', label: 'Custom API / Webhook' },
						{ id: 'facebook', label: 'Facebook Messenger' },
						{ id: 'sms', label: 'SMS & Twilio' },
						{ id: 'email', label: 'Email Forwarding' },
						{ id: 'instagram', label: 'Instagram Direct' },
						{ id: 'line', label: 'LINE Official' }
					] as channel}
						<div class="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800/80 hover:border-gray-700 transition-colors">
							<label class="flex items-center space-x-2.5 text-xs text-gray-200 cursor-pointer flex-1">
								<input
									type="checkbox"
									name={channel.id}
									value="true"
									checked={channel.id === 'whatsapp' ? data.account.allowed_inboxes?.[channel.id] !== false : data.account.allowed_inboxes?.[channel.id] === true}
									class="inbox-checkbox w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
								/>
								<span class="font-medium">{channel.label}</span>
							</label>
							<button
								type="button"
								onclick={() => {
									document.querySelectorAll('.inbox-checkbox').forEach(cb => {
										cb.checked = (cb.name === channel.id);
									});
								}}
								class="px-2 py-0.5 text-[10px] font-bold text-gray-500 hover:text-emerald-400 bg-gray-900 rounded border border-gray-800 hover:border-gray-700 transition-all"
								title="Keep only this channel"
							>
								Only
							</button>
						</div>
					{/each}
				</div>
				<button
					type="submit"
					disabled={loadingAction === 'inboxes'}
					class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
				>
					{loadingAction === 'inboxes' ? 'Saving Inboxes...' : 'Save Channel Access Gates'}
				</button>
			</form>
		</div>

		<!-- Danger Zone & Operations -->
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 sm:p-6 shadow-lg md:col-span-2">
			<h2 class="text-base font-bold text-white mb-4 border-b border-gray-800 pb-2.5 flex items-center gap-2">
				<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
				Danger Zone & Workspace Gates
			</h2>
			
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
				
				<!-- Color Label Picker -->
				<div class="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
					<div>
						<h3 class="text-xs font-bold text-gray-400 uppercase mb-1">Color Tag</h3>
						<p class="text-[11px] text-gray-500 mb-2">Tag for visual grouping.</p>
					</div>
					<form method="POST" action="?/updateLabelColor" use:enhance class="flex items-center gap-2">
						<select name="labelColor" class="flex-1 bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-xl p-2 cursor-pointer">
							<option value="gray" selected={data.account.labelColor === 'gray'}>Gray</option>
							<option value="red" selected={data.account.labelColor === 'red'}>Red</option>
							<option value="blue" selected={data.account.labelColor === 'blue'}>Blue</option>
							<option value="green" selected={data.account.labelColor === 'green'}>Green</option>
							<option value="purple" selected={data.account.labelColor === 'purple'}>Purple</option>
							<option value="orange" selected={data.account.labelColor === 'orange'}>Orange</option>
						</select>
						<button type="submit" class="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-bold transition-colors">Save</button>
					</form>
				</div>

				<!-- Suspend/Renew -->
				<div class="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
					<div>
						<h3 class="text-xs font-bold text-gray-400 uppercase mb-1">Access Status</h3>
						<p class="text-[11px] text-gray-500 mb-2">Block or restore workspace.</p>
					</div>
					{#if data.account.status === 'active'}
						<form method="POST" action="?/suspend" use:enhance={() => {
							loadingAction = `suspend`;
							return async ({ update }) => { await update(); loadingAction = null; };
						}}>
							<button type="submit" disabled={loadingAction} class="w-full py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30 rounded-xl text-xs font-bold transition-colors">
								Suspend Workspace
							</button>
						</form>
					{:else}
						<form method="POST" action="?/renew" use:enhance={() => {
							loadingAction = `renew`;
							return async ({ update }) => { await update(); loadingAction = null; };
						}}>
							<input type="hidden" name="daysRemaining" value="30" />
							<button type="submit" disabled={loadingAction} class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors">
								Reactivate (30d)
							</button>
						</form>
					{/if}
				</div>

				<!-- App Freeze -->
				<div class="bg-gray-950 p-4 rounded-xl border border-gray-800 flex flex-col justify-between">
					<div>
						<h3 class="text-xs font-bold text-gray-400 uppercase mb-1">App Payment Blocker</h3>
						<p class="text-[11px] text-gray-500 mb-2">Freeze client interface.</p>
					</div>
					<form method="POST" action="?/toggleFreeze" use:enhance={() => {
						loadingAction = `freeze`;
						return async ({ update }) => { await update(); loadingAction = null; };
					}}>
						<input type="hidden" name="freeze" value={data.account.freeze ? 'false' : 'true'} />
						<button type="submit" disabled={loadingAction} class="w-full py-2 {data.account.freeze ? 'bg-emerald-600 text-white' : 'bg-orange-600/20 text-orange-400 border border-orange-600/30 hover:bg-orange-600/30'} rounded-xl text-xs font-bold transition-colors">
							{data.account.freeze ? 'Unfreeze App' : 'Freeze App'}
						</button>
					</form>
				</div>

				<!-- Destroy -->
				<div class="bg-gray-950 p-4 rounded-xl border border-rose-900/40 flex flex-col justify-between">
					<div>
						<h3 class="text-xs font-bold text-rose-400 uppercase mb-1">Delete Account</h3>
						<p class="text-[11px] text-gray-500 mb-2">Irreversible destruction.</p>
					</div>
					<form method="POST" action="?/destroy" use:enhance={() => {
						if (!confirm('Are you absolutely sure? This will delete this workspace permanently.')) return () => {};
						loadingAction = `destroy`;
						return async ({ update }) => { await update(); loadingAction = null; };
					}}>
						<button type="submit" disabled={loadingAction} class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors">
							Destroy Workspace
						</button>
					</form>
				</div>

			</div>
		</div>

	</div>
{/if}

<!-- SVELTE 5 MODAL: RECORD PAYMENT -->
<Modal show={showPaymentModal} title={paymentData.title} close={() => showPaymentModal = false}>
	<form
		method="POST"
		action="?/recordPayment"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
				showPaymentModal = false;
			};
		}}
		id="recordPaymentForm"
		class="space-y-3.5 text-xs"
	>
		<input type="hidden" name="type" value={paymentData.type} />
		{#if paymentData.feeId}
			<input type="hidden" name="feeId" value={paymentData.feeId} />
		{/if}

		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Amount to Pay (Rs)</label>
			<input
				type="number"
				name="amount"
				bind:value={paymentData.amount}
				min="1"
				max={paymentData.maxAmount}
				required
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
			<span class="text-[11px] text-gray-500">Max remaining due: Rs {paymentData.maxAmount}</span>
		</div>

		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Payment Method</label>
			<select
				name="bankType"
				bind:value={paymentData.bankType}
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
			>
				<option value="Cash">Cash</option>
				<option value="Bank">Bank Transfer</option>
				<option value="Easypaisa">Easypaisa</option>
				<option value="JazzCash">JazzCash</option>
				<option value="Other">Other</option>
			</select>
		</div>

		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Transaction ID / Reference (Optional)</label>
			<input
				type="text"
				name="txId"
				bind:value={paymentData.txId}
				placeholder="e.g. TRX-987654"
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>

		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Notes</label>
			<input
				type="text"
				name="notes"
				bind:value={paymentData.notes}
				placeholder="Any additional remarks..."
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-2.5">
			<button type="button" onclick={() => showPaymentModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors">
				Cancel
			</button>
			<button
				type="submit"
				form="recordPaymentForm"
				disabled={isSubmitting || !paymentData.amount || paymentData.amount <= 0}
				class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
			>
				{isSubmitting ? 'Recording...' : `Confirm Rs ${paymentData.amount} Payment`}
			</button>
		</div>
	{/snippet}
</Modal>

<!-- SVELTE 5 MODAL: ADD MONTHLY INVOICE -->
<Modal show={showAddInvoiceModal} title="Add Monthly Fee Invoice" close={() => showAddInvoiceModal = false}>
	<form
		method="POST"
		action="?/addPendingFee"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
				showAddInvoiceModal = false;
			};
		}}
		id="addInvoiceForm"
		class="space-y-3.5 text-xs"
	>
		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Invoice Amount (Rs)</label>
			<input
				type="number"
				name="amount"
				bind:value={invoiceData.amount}
				min="1"
				required
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>
		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Month / Invoice Label</label>
			<input
				type="text"
				name="month"
				bind:value={invoiceData.month}
				required
				placeholder="e.g. Sep 2026"
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-2.5">
			<button type="button" onclick={() => showAddInvoiceModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors">
				Cancel
			</button>
			<button
				type="submit"
				form="addInvoiceForm"
				disabled={isSubmitting || !invoiceData.amount || invoiceData.amount <= 0}
				class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all"
			>
				{isSubmitting ? 'Adding...' : 'Generate Invoice'}
			</button>
		</div>
	{/snippet}
</Modal>

<!-- SVELTE 5 MODAL: SET STARTUP FEE -->
<Modal show={showStartupFeeModal} title="Configure Startup / Setup Fee" close={() => showStartupFeeModal = false}>
	<form
		method="POST"
		action="?/setStartupFee"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
				showStartupFeeModal = false;
			};
		}}
		id="setStartupFeeForm"
		class="space-y-3.5 text-xs"
	>
		<div>
			<label class="block font-bold text-gray-300 uppercase mb-1">Total Startup Fee Amount (Rs)</label>
			<input
				type="number"
				name="amount"
				bind:value={startupFeeData.amount}
				min="1"
				required
				placeholder="e.g. 5000"
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
			<p class="text-[11px] text-gray-500 mt-1">Sets the total initial fee for onboarding this client.</p>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-2.5">
			<button type="button" onclick={() => showStartupFeeModal = false} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors">
				Cancel
			</button>
			<button
				type="submit"
				form="setStartupFeeForm"
				disabled={isSubmitting || !startupFeeData.amount || startupFeeData.amount <= 0}
				class="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/30 transition-all"
			>
				{isSubmitting ? 'Saving...' : 'Save Startup Fee'}
			</button>
		</div>
	{/snippet}
</Modal>
