<script>
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let loadingAction = $state(null);

	function promptPayment(type, feeId, maxAmount) {
		const amount = prompt(`Enter amount to pay (Max: ${maxAmount}):`, maxAmount);
		if (!amount || isNaN(amount) || amount <= 0) return;
		const bankType = prompt("Payment Method (e.g. Bank, Cash, Easypaisa):", "Cash");
		if (bankType === null) return;
		const txId = prompt("Transaction ID (optional):", "");
		const notes = prompt("Any notes (optional):", "");

		submitAction('?/recordPayment', { type, feeId, amount, bankType, txId, notes });
	}

	function promptAddMonthlyFee() {
		const amount = prompt("Enter Monthly Fee Amount:", data.account.monthly_fee_amount || "5000");
		if (!amount || isNaN(amount)) return;
		const month = prompt("Enter Label/Month:", new Date().toLocaleString('default', { month: 'short', year: 'numeric' }));
		if (!month) return;

		submitAction('?/addPendingFee', { amount, month });
	}

	function submitAction(actionUrl, payload) {
		const f = document.createElement('form');
		f.method = 'POST';
		f.action = actionUrl;
		Object.entries(payload).forEach(([k, v]) => {
			if (v !== undefined && v !== null) {
				const i = document.createElement('input');
				i.type = 'hidden';
				i.name = k;
				i.value = v;
				f.appendChild(i);
			}
		});
		document.body.appendChild(f);
		f.submit();
	}
</script>

<svelte:head>
	<title>Account Details - InstantFlow</title>
</svelte:head>

<div class="mb-6 flex items-center space-x-3">
	<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors shrink-0">
		<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
	</a>
	<div>
		<h1 class="text-xl sm:text-2xl font-bold text-white">Account Details</h1>
		<p class="text-gray-400 mt-0.5 text-sm">View workspace data and subscription information.</p>
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

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
				<div class="max-w-md">
					<label class="block text-xs font-medium text-gray-500 uppercase mb-2">Reset Admin Password</label>
					<form method="POST" action="?/resetPassword" use:enhance class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
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
							class="px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 hover:text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
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

		<!-- Billing Ledger -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm md:col-span-2">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Billing Ledger</h2>
			
			<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
				<!-- Startup Fee -->
				<div>
					<h3 class="text-sm font-medium text-gray-400 uppercase mb-3">Startup Fee</h3>
					{#if data.account.startup_fee}
						<div class="mb-4">
							<div class="flex justify-between text-sm mb-1 items-center">
								<span class="text-white flex items-center gap-2">
									Total: Rs {data.account.startup_fee.amount}
									<button 
										class="text-blue-400 hover:text-blue-300" 
										onclick={() => {
											const amt = prompt("Enter new total Startup Fee amount:", data.account.startup_fee.amount);
											if (!amt || isNaN(amt) || amt <= 0) return;
											submitAction('?/setStartupFee', { amount: amt });
										}}
										title="Edit Total Fee"
									>
										<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
									</button>
								</span>
								<span class="text-emerald-400">Paid: Rs {data.account.startup_fee.paid}</span>
								<span class="text-orange-400">Remaining: Rs {data.account.startup_fee.remaining}</span>
							</div>
							<div class="w-full bg-gray-800 rounded-full h-2">
								<div class="bg-emerald-500 h-2 rounded-full" style="width: {(data.account.startup_fee.paid / data.account.startup_fee.amount) * 100}%"></div>
							</div>
						</div>
						
						{#if data.account.startup_fee.remaining > 0}
							<button 
								class="px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-sm font-medium transition-colors"
								onclick={() => promptPayment('startup', null, data.account.startup_fee.remaining)}
							>
								Pay Remaining
							</button>
						{/if}
					{:else}
						<form method="POST" action="?/setStartupFee" use:enhance class="flex items-center space-x-3">
							<input type="number" name="amount" placeholder="Amount (e.g. 5000)" required class="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
							<button type="submit" class="px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg text-sm font-medium transition-colors">Set Fee</button>
						</form>
					{/if}
				</div>

				<!-- Monthly Pending Fees -->
				<div>
					<h3 class="text-sm font-medium text-gray-400 uppercase mb-3 flex justify-between items-center">
						Pending Monthly Fees
						<button 
							class="text-xs text-blue-400 hover:text-blue-300"
							onclick={() => promptAddMonthlyFee()}
						>
							+ Add Invoice
						</button>
					</h3>
					
					<div class="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
						{#each data.account.pending_fees.filter(f => f.remaining > 0) as fee}
							<div class="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700">
								<div>
									<div class="text-sm text-white font-medium">{fee.month_label}</div>
									<div class="text-xs text-orange-400">Remaining: Rs {fee.remaining} (Total: {fee.amount})</div>
								</div>
								<button 
									class="px-3 py-1 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-xs font-medium transition-colors"
									onclick={() => promptPayment('monthly', fee.id, fee.remaining)}
								>
									Pay
								</button>
							</div>
						{/each}
						{#if data.account.pending_fees.filter(f => f.remaining > 0).length === 0}
							<div class="text-sm text-gray-500 italic">No pending fees.</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- History Timeline -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm md:col-span-2">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Activity History</h2>
			<div class="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
				{#each [...data.account.history].reverse() as item}
					<div class="flex items-start gap-4">
						<div class="w-2 h-2 mt-2 rounded-full {item.type === 'payment' ? 'bg-emerald-500' : 'bg-blue-500'}"></div>
						<div>
							<div class="text-sm text-white font-medium">{item.action}</div>
							<div class="text-xs text-gray-400">{new Date(item.date).toLocaleString()} • {item.admin}</div>
							{#if item.notes}
								<div class="text-xs text-gray-500 mt-1 italic">Notes: {item.notes}</div>
							{/if}
						</div>
					</div>
				{/each}
				{#if data.account.history.length === 0}
					<div class="text-sm text-gray-500 italic">No history recorded yet.</div>
				{/if}
			</div>
		</div>
		<!-- Account Management (Danger Zone & Labels) -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-sm md:col-span-2">
			<h2 class="text-lg font-semibold text-white mb-4 border-b border-gray-800 pb-2">Account Management</h2>
			
			<div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
				
				<!-- Color Label Picker -->
				<div class="bg-gray-950 p-4 rounded-lg border border-gray-800">
					<h3 class="text-xs font-medium text-gray-500 uppercase mb-2">Color Label</h3>
					<form method="POST" action="?/updateLabelColor" use:enhance class="flex items-center space-x-2">
						<select name="labelColor" class="flex-1 bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-1.5">
							<option value="gray" selected={data.account.labelColor === 'gray'}>Gray</option>
							<option value="red" selected={data.account.labelColor === 'red'}>Red</option>
							<option value="blue" selected={data.account.labelColor === 'blue'}>Blue</option>
							<option value="green" selected={data.account.labelColor === 'green'}>Green</option>
							<option value="purple" selected={data.account.labelColor === 'purple'}>Purple</option>
							<option value="orange" selected={data.account.labelColor === 'orange'}>Orange</option>
						</select>
						<button type="submit" class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs transition-colors">Save</button>
					</form>
				</div>

				<!-- Suspend/Renew -->
				<div class="bg-gray-950 p-4 rounded-lg border border-gray-800">
					<h3 class="text-xs font-medium text-gray-500 uppercase mb-2">Access Status</h3>
					{#if data.account.status === 'active'}
						<form method="POST" action="?/suspend" use:enhance={() => {
							loadingAction = `suspend`;
							return async ({ update }) => { await update(); loadingAction = null; };
						}}>
							<button type="submit" disabled={loadingAction} class="w-full px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 border border-yellow-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
								Suspend Account
							</button>
						</form>
					{:else}
						<form method="POST" action="?/renew" use:enhance={() => {
							loadingAction = `renew`;
							return async ({ update }) => { await update(); loadingAction = null; };
						}}>
							<input type="hidden" name="daysRemaining" value="30" />
							<button type="submit" disabled={loadingAction} class="w-full px-4 py-2 bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
								Renew (30d)
							</button>
						</form>
					{/if}
				</div>

				<!-- App Freeze -->
				<div class="bg-gray-950 p-4 rounded-lg border border-gray-800">
					<h3 class="text-xs font-medium text-gray-500 uppercase mb-2">App Freeze</h3>
					<form method="POST" action="?/toggleFreeze" use:enhance={() => {
						loadingAction = `freeze`;
						return async ({ update }) => { await update(); loadingAction = null; };
					}}>
						<input type="hidden" name="freeze" value={data.account.freeze ? 'false' : 'true'} />
						<button type="submit" disabled={loadingAction} class="w-full px-4 py-2 {data.account.freeze ? 'bg-emerald-600/20 text-emerald-500 border-emerald-600/30 hover:bg-emerald-600/30' : 'bg-orange-600/20 text-orange-500 border-orange-600/30 hover:bg-orange-600/30'} border rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
							{data.account.freeze ? 'Unfreeze App' : 'Freeze App'}
						</button>
					</form>
				</div>

				<!-- Allowed Inboxes Panel -->
				<div class="bg-gray-950 p-4 rounded-lg border border-gray-800">
					<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
						<h3 class="text-xs font-medium text-gray-400 uppercase">Allowed Inboxes (Check to show to user)</h3>
						<div class="flex items-center space-x-1.5">
							<button
								type="button"
								onclick={() => {
									document.querySelectorAll('.inbox-checkbox').forEach(cb => cb.checked = true);
								}}
								class="px-2.5 py-1 text-[11px] font-semibold bg-gray-900 hover:bg-gray-800 text-gray-300 rounded border border-gray-700 transition-colors"
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
								class="px-2.5 py-1 text-[11px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 rounded border border-emerald-800/50 transition-colors"
							>
								Unselect All (Keep WhatsApp)
							</button>
						</div>
					</div>
					<form method="POST" action="?/saveAllowedInboxes" use:enhance={() => {
						loadingAction = `inboxes`;
						return async ({ update }) => { await update(); loadingAction = null; };
					}}>
						<div class="flex flex-col space-y-2 mb-4">
							{#each [
								{ id: 'whatsapp', label: 'WhatsApp Cloud API' },
								{ id: 'web_widget', label: 'Website Widget' },
								{ id: 'telegram', label: 'Telegram Bot' },
								{ id: 'api', label: 'API / Webhook Channel' },
								{ id: 'facebook', label: 'Facebook Messenger' },
								{ id: 'sms', label: 'SMS & Twilio' },
								{ id: 'email', label: 'Email Forwarding' },
								{ id: 'instagram', label: 'Instagram Direct' },
								{ id: 'line', label: 'LINE Official Account' }
							] as channel}
								<div class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-900/50 transition-colors">
									<label class="flex items-center space-x-2.5 text-sm text-gray-300 cursor-pointer flex-1">
										<input
											type="checkbox"
											name={channel.id}
											value="true"
											checked={channel.id === 'whatsapp' ? data.account.allowed_inboxes?.[channel.id] !== false : data.account.allowed_inboxes?.[channel.id] === true}
											class="inbox-checkbox w-4 h-4 rounded border-gray-700 bg-gray-900 text-emerald-500 focus:ring-emerald-500"
										/>
										<span>{channel.label}</span>
									</label>
									<button
										type="button"
										onclick={() => {
											document.querySelectorAll('.inbox-checkbox').forEach(cb => {
												cb.checked = (cb.name === channel.id);
											});
										}}
										class="px-2 py-0.5 text-[10.5px] font-medium text-gray-400 hover:text-emerald-400 hover:bg-gray-800/80 rounded border border-transparent hover:border-gray-700 transition-all ml-2"
										title="Keep only {channel.label} selected and uncheck all others"
									>
										Only this
									</button>
								</div>
							{/each}
						</div>
						<button
							type="submit"
							disabled={loadingAction === 'inboxes'}
							class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
						>
							{loadingAction === 'inboxes' ? 'Saving Allowed Inboxes...' : 'Save Allowed Inboxes'}
						</button>
					</form>
				</div>

				<!-- Destroy -->
				<div class="bg-gray-950 p-4 rounded-lg border border-red-900/30">
					<h3 class="text-xs font-medium text-red-500 uppercase mb-2">Danger Zone</h3>
					<form method="POST" action="?/destroy" use:enhance={() => {
						if (!confirm('Are you absolutely sure? This will delete the account and all its data permanently.')) return () => {};
						loadingAction = `destroy`;
						return async ({ update }) => { await update(); loadingAction = null; };
					}}>
						<button type="submit" disabled={loadingAction} class="w-full px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
							Destroy Account
						</button>
					</form>
				</div>

			</div>
		</div>

	</div>
{/if}
