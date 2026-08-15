<script>
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';

	let { data, form } = $props();

	let currentTab = $state('active'); // 'all', 'active', 'expired', 'suspended', 'frozen'
	let filterColor = $state('all');
	let sortBy = $state('latest');
	let searchQuery = $state('');

	// Action Modal States
	let showAddDaysModal = $state(false);
	let modalAccount = $state(null);
	let modalDaysToAdd = $state(30);
	let modalPlanType = $state('Monthly');
	let modalNote = $state('Monthly renewal');
	let isSubmitting = $state(false);
	let actionFeedback = $state(null);

	// Accounts statistics
	let totalCount = $derived((data.accounts || []).length);
	let activeCount = $derived((data.accounts || []).filter(a => a.status === 'active' && a.daysRemaining > 0).length);
	let expiredCount = $derived((data.accounts || []).filter(a => a.status === 'active' && a.daysRemaining <= 0).length);
	let suspendedCount = $derived((data.accounts || []).filter(a => a.status === 'suspended').length);
	let frozenCount = $derived((data.accounts || []).filter(a => a.freeze).length);

	// Filtered & Searched Accounts
	let filteredAccounts = $derived((data.accounts || [])
		.filter(account => {
			// Tab filtering
			if (currentTab === 'active' && (account.status !== 'active' || account.daysRemaining <= 0)) return false;
			if (currentTab === 'expired' && (account.status !== 'active' || account.daysRemaining > 0)) return false;
			if (currentTab === 'suspended' && account.status !== 'suspended') return false;
			if (currentTab === 'frozen' && !account.freeze) return false;

			// Color tag filtering
			if (filterColor !== 'all' && (account.labelColor || 'gray') !== filterColor) return false;

			// Omni Search filtering (Name, Email, Phone Number, Account ID)
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchName = (account.name || '').toLowerCase().includes(q);
				const matchEmail = (account.linkedEmail || '').toLowerCase().includes(q);
				const matchPhone = (account.phoneNumber || '').toLowerCase().includes(q);
				const matchId = String(account.id || '').toLowerCase().includes(q);
				if (!matchName && !matchEmail && !matchPhone && !matchId) return false;
			}

			return true;
		})
		.sort((a, b) => {
			if (sortBy === 'latest') return Number(b.id) - Number(a.id);
			if (sortBy === 'oldest') return Number(a.id) - Number(b.id);
			if (sortBy === 'days_high') return Number(b.daysRemaining) - Number(a.daysRemaining);
			if (sortBy === 'days_low') return Number(a.daysRemaining) - Number(b.daysRemaining);
			if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
			return 0;
		})
	);

	function openRefreshDaysModal(account) {
		modalAccount = account;
		modalDaysToAdd = 30;
		modalPlanType = account.planType === 'Trial' ? 'Monthly' : account.planType;
		modalNote = account.daysRemaining <= 0 ? 'Renewed after expiry' : 'Added validity days';
		showAddDaysModal = true;
	}

	function copyToClipboard(text, label = 'Copied') {
		if (!text || text === 'N/A') return;
		navigator.clipboard.writeText(text);
		actionFeedback = `${label} to clipboard!`;
		setTimeout(() => { actionFeedback = null; }, 2500);
	}
</script>

<svelte:head>
	<title>Workspaces Dashboard — InstantFlow Admin</title>
</svelte:head>

<!-- Top Notification Toast -->
{#if actionFeedback || form?.message}
	<div class="fixed top-4 right-4 z-50 bg-emerald-950 border border-emerald-500 text-emerald-300 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
		<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
		<span class="text-sm font-semibold">{actionFeedback || form?.message}</span>
	</div>
{/if}

<!-- Header -->
<div class="mb-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
	<div>
		<h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">Client Workspaces</h1>
		<p class="text-gray-400 text-xs sm:text-sm mt-0.5">Manage live subscriptions, validities, client accounts, and access gates.</p>
	</div>
	<div class="flex items-center gap-2 flex-wrap">
		<a href="/dashboard/god-mode" class="px-3.5 py-2 bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all flex items-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
			GOD MODE
		</a>
		<a href="/dashboard/create-account" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5 whitespace-nowrap">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
			Build Account
		</a>
	</div>
</div>

<!-- LIVE METRICS COUNTER BAR -->
<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5 mb-5">
	<button
		onclick={() => { currentTab = 'all'; }}
		class="p-3.5 rounded-2xl border text-left transition-all {currentTab === 'all' ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-900/20' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}"
	>
		<div class="flex items-center justify-between text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
			<span>Total</span>
			<span class="w-2 h-2 rounded-full bg-blue-500"></span>
		</div>
		<div class="text-2xl font-black text-white">{totalCount}</div>
		<div class="text-[11px] text-gray-500 mt-0.5">All Workspaces</div>
	</button>

	<button
		onclick={() => { currentTab = 'active'; }}
		class="p-3.5 rounded-2xl border text-left transition-all {currentTab === 'active' ? 'bg-emerald-600/20 border-emerald-500 shadow-md shadow-emerald-900/20' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}"
	>
		<div class="flex items-center justify-between text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">
			<span>Active</span>
			<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
		</div>
		<div class="text-2xl font-black text-emerald-400">{activeCount}</div>
		<div class="text-[11px] text-gray-500 mt-0.5">Valid Subscriptions</div>
	</button>

	<button
		onclick={() => { currentTab = 'expired'; }}
		class="p-3.5 rounded-2xl border text-left transition-all {currentTab === 'expired' ? 'bg-amber-600/20 border-amber-500 shadow-md shadow-amber-900/20' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}"
	>
		<div class="flex items-center justify-between text-xs text-amber-400 font-medium uppercase tracking-wider mb-1">
			<span>Expired</span>
			<span class="w-2 h-2 rounded-full bg-amber-500"></span>
		</div>
		<div class="text-2xl font-black text-amber-400">{expiredCount}</div>
		<div class="text-[11px] text-gray-500 mt-0.5">Days &le; 0 (Renewal Due)</div>
	</button>

	<button
		onclick={() => { currentTab = 'suspended'; }}
		class="p-3.5 rounded-2xl border text-left transition-all {currentTab === 'suspended' ? 'bg-rose-600/20 border-rose-500 shadow-md shadow-rose-900/20' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}"
	>
		<div class="flex items-center justify-between text-xs text-rose-400 font-medium uppercase tracking-wider mb-1">
			<span>Suspended</span>
			<span class="w-2 h-2 rounded-full bg-rose-500"></span>
		</div>
		<div class="text-2xl font-black text-rose-400">{suspendedCount}</div>
		<div class="text-[11px] text-gray-500 mt-0.5">Locked Accounts</div>
	</button>

	<button
		onclick={() => { currentTab = 'frozen'; }}
		class="col-span-2 sm:col-span-1 p-3.5 rounded-2xl border text-left transition-all {currentTab === 'frozen' ? 'bg-orange-600/20 border-orange-500 shadow-md shadow-orange-900/20' : 'bg-gray-900/80 border-gray-800 hover:border-gray-700'}"
	>
		<div class="flex items-center justify-between text-xs text-orange-400 font-medium uppercase tracking-wider mb-1">
			<span>App Frozen</span>
			<span class="w-2 h-2 rounded-full bg-orange-500"></span>
		</div>
		<div class="text-2xl font-black text-orange-400">{frozenCount}</div>
		<div class="text-[11px] text-gray-500 mt-0.5">Payment Blocker Active</div>
	</button>
</div>

<!-- OMNI-SEARCH & TOOLBAR -->
<div class="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-5 shadow-lg space-y-3.5">
	<div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
		
		<!-- Search Input -->
		<div class="relative flex-1">
			<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search by Name, Email, Phone Number, or Account ID..."
				class="w-full pl-10 pr-10 py-2.5 bg-gray-950/80 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
			/>
			{#if searchQuery}
				<button
					onclick={() => searchQuery = ''}
					class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
					title="Clear Search"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			{/if}
		</div>

		<!-- Filters & Sort -->
		<div class="flex items-center gap-2 flex-wrap">
			<!-- Sort -->
			<div class="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800">
				<label for="sortBySelect" class="text-xs text-gray-500 font-bold uppercase">Sort:</label>
				<select id="sortBySelect" bind:value={sortBy} class="bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer">
					<option value="latest" class="bg-gray-900 text-white">Latest First</option>
					<option value="oldest" class="bg-gray-900 text-white">Oldest First</option>
					<option value="days_high" class="bg-gray-900 text-white">Days (High &rarr; Low)</option>
					<option value="days_low" class="bg-gray-900 text-white">Days (Low &rarr; High)</option>
					<option value="name" class="bg-gray-900 text-white">Name (A-Z)</option>
				</select>
			</div>

			<!-- Color Tag -->
			<div class="flex items-center gap-1.5 bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-800">
				<label for="filterColorSelect" class="text-xs text-gray-500 font-bold uppercase">Tag:</label>
				<select id="filterColorSelect" bind:value={filterColor} class="bg-transparent text-gray-200 text-xs font-semibold focus:outline-none cursor-pointer">
					<option value="all" class="bg-gray-900 text-white">All Tags</option>
					<option value="gray" class="bg-gray-900 text-white">Gray</option>
					<option value="red" class="bg-gray-900 text-white">Red</option>
					<option value="blue" class="bg-gray-900 text-white">Blue</option>
					<option value="green" class="bg-gray-900 text-white">Green</option>
					<option value="purple" class="bg-gray-900 text-white">Purple</option>
					<option value="orange" class="bg-gray-900 text-white">Orange</option>
				</select>
			</div>

			<!-- Result Counter Badge -->
			<span class="text-xs font-bold px-3 py-2 rounded-xl bg-gray-800/80 text-gray-300 border border-gray-700/60">
				Showing: <span class="text-emerald-400 font-black">{filteredAccounts.length}</span> / {totalCount}
			</span>
		</div>
	</div>

	<!-- Status Tabs Strip -->
	<div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-gray-800/60 pt-3">
		<button
			onclick={() => currentTab = 'all'}
			class="px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap {currentTab === 'all' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800'}"
		>
			All ({totalCount})
		</button>
		<button
			onclick={() => currentTab = 'active'}
			class="px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap {currentTab === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800'}"
		>
			Active ({activeCount})
		</button>
		<button
			onclick={() => currentTab = 'expired'}
			class="px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap {currentTab === 'expired' ? 'bg-amber-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800'}"
		>
			Expired ({expiredCount})
		</button>
		<button
			onclick={() => currentTab = 'suspended'}
			class="px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap {currentTab === 'suspended' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800'}"
		>
			Suspended ({suspendedCount})
		</button>
		<button
			onclick={() => currentTab = 'frozen'}
			class="px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap {currentTab === 'frozen' ? 'bg-orange-600 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-800'}"
		>
			Frozen ({frozenCount})
		</button>
	</div>
</div>

{#if data.error}
	<div class="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-xl mb-5 flex items-center gap-3">
		<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
		<span>{data.error}</span>
	</div>
{/if}

<!-- DESKTOP DATA TABLE (hidden on mobile, visible sm+) -->
<div class="hidden sm:block bg-gray-900 border border-gray-800 rounded-2xl shadow-xl overflow-hidden mb-6">
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-800">
			<thead class="bg-gray-950/70">
				<tr>
					<th scope="col" class="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Workspace</th>
					<th scope="col" class="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Contact & Phone</th>
					<th scope="col" class="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Plan</th>
					<th scope="col" class="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Validity Left</th>
					<th scope="col" class="px-6 py-3.5 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Status & Dues</th>
					<th scope="col" class="px-6 py-3.5 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800/60 font-sans">
				{#each filteredAccounts as account}
					<tr 
						class="hover:bg-gray-800/40 transition-colors cursor-pointer relative group"
						style="border-left: 4px solid {account.labelColor || 'gray'};"
						onclick={() => goto(`/dashboard/account/${account.id}`)}
					>
						<!-- Workspace Name & ID -->
						<td class="px-6 py-4 whitespace-nowrap">
							<div class="font-bold text-emerald-400 text-sm group-hover:text-emerald-300 transition-colors">{account.name}</div>
							<div class="text-[11px] text-gray-500 font-mono mt-0.5">ID: {account.id}</div>
						</td>

						<!-- Email & Phone Number -->
						<td class="px-6 py-4 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
							<div class="text-xs text-gray-300 font-medium flex items-center gap-1.5">
								<span>{account.linkedEmail}</span>
								<button
									onclick={() => copyToClipboard(account.linkedEmail, 'Email copied')}
									class="text-gray-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
									title="Copy Email"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
								</button>
							</div>
							{#if account.phoneNumber && account.phoneNumber !== 'N/A'}
								<div class="text-[11px] text-emerald-500/90 font-mono mt-0.5 flex items-center gap-1">
									<svg class="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
									<span>{account.phoneNumber}</span>
									<button
										onclick={() => copyToClipboard(account.phoneNumber, 'Phone copied')}
										class="text-gray-500 hover:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"
										title="Copy Phone"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
									</button>
								</div>
								{#if account.whatsapp_health}
									<div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 {account.whatsapp_health.health_level === 'BANNED' ? 'bg-red-950/80 text-red-300 border border-red-800' : account.whatsapp_health.health_level === 'DANGER' || account.whatsapp_health.health_level === 'WARNING' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : account.whatsapp_health.health_level === 'TOKEN_EXPIRED' ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'}">
										<span class="w-1.5 h-1.5 rounded-full {account.whatsapp_health.health_level === 'BANNED' ? 'bg-red-500 animate-pulse' : account.whatsapp_health.health_level === 'DANGER' || account.whatsapp_health.health_level === 'WARNING' ? 'bg-amber-400 animate-pulse' : account.whatsapp_health.health_level === 'TOKEN_EXPIRED' ? 'bg-gray-400' : 'bg-emerald-400'}"></span>
										<span>WhatsApp: {account.whatsapp_health.status || 'CONNECTED'} ({account.whatsapp_health.quality_rating || 'GREEN'})</span>
									</div>
								{/if}
							{:else}
								<div class="text-[10px] text-gray-600 italic">No Phone Saved</div>
							{/if}
						</td>

						<!-- Plan Dropdown -->
						<td class="px-6 py-4 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
							<form method="POST" action="?/updatePlan" use:enhance class="m-0">
								<input type="hidden" name="accountId" value={account.id} />
								<select
									name="planType"
									onchange={(e) => e.target.form.requestSubmit()}
									class="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-sm"
								>
									<option value="Trial" selected={account.planType === 'Trial'}>Trial</option>
									<option value="Monthly" selected={account.planType === 'Monthly' || account.planType === 'Unknown'}>Monthly</option>
									<option value="Yearly" selected={account.planType === 'Yearly'}>Yearly</option>
								</select>
							</form>
						</td>

						<!-- Days Validity & Refresh Button -->
						<td class="px-6 py-4 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
							<div class="flex items-center gap-2">
								{#if account.daysRemaining > 0}
									<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800/60">
										{account.daysRemaining} days left
									</span>
								{:else}
									<span class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase bg-red-950 text-red-300 border border-red-800/60">
										Expired
									</span>
								{/if}
								
								<button
									type="button"
									onclick={() => openRefreshDaysModal(account)}
									class="p-1.5 bg-gray-800 hover:bg-emerald-600 text-gray-300 hover:text-white rounded-lg transition-all shadow-sm"
									title="Add / Refresh Days"
								>
									<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
								</button>
							</div>
						</td>

						<!-- Status & Dues -->
						<td class="px-6 py-4 whitespace-nowrap" onclick={(e) => e.stopPropagation()}>
							<div class="flex flex-col gap-1 items-start">
								<div class="flex items-center gap-1.5">
									{#if account.status === 'active'}
										<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">Active</span>
									{:else}
										<span class="px-2 py-0.5 text-[11px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800/50">Suspended</span>
									{/if}
									{#if account.freeze || (account.daysRemaining !== undefined && account.daysRemaining <= 0)}
										<span class="px-2 py-0.5 text-[11px] font-black rounded-full bg-orange-950 text-orange-300 border border-orange-800/60 animate-pulse">Frozen</span>
									{/if}
								</div>
								{#if account.totalDue > 0}
									<div class="text-[11px] font-bold text-amber-400">Due: Rs {account.totalDue.toLocaleString()}</div>
								{/if}
							</div>
						</td>

						<!-- Action Button -->
						<td class="px-6 py-4 whitespace-nowrap text-right text-xs">
							<a
								href="/dashboard/account/{account.id}"
								class="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-lg font-semibold transition-colors inline-flex items-center gap-1"
							>
								<span>View Details</span>
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
							</a>
						</td>
					</tr>
				{/each}

				{#if filteredAccounts.length === 0}
					<tr>
						<td colspan="6" class="px-6 py-16 text-center text-gray-500">
							<svg class="w-12 h-12 mx-auto mb-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
							<div class="text-sm font-bold text-gray-400">No workspaces match your query.</div>
							<div class="text-xs text-gray-600 mt-1">Try clearing your search query or switching tabs.</div>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

<!-- MOBILE CARD VIEW (visible on small screens sm:hidden) -->
<div class="sm:hidden space-y-3 mb-6">
	{#each filteredAccounts as account}
		<div 
			class="bg-gray-900 border border-gray-800 rounded-2xl p-4 shadow-lg transition-all"
			style="border-left: 5px solid {account.labelColor || 'gray'};"
		>
			<!-- Card Top Row: Name, ID, Badges -->
			<div class="flex items-start justify-between gap-2 mb-2.5">
				<div class="min-w-0 flex-1">
					<a href="/dashboard/account/{account.id}" class="font-bold text-emerald-400 text-base leading-snug hover:underline block truncate">
						{account.name}
					</a>
					<div class="text-[11px] text-gray-500 font-mono">ID: {account.id}</div>
				</div>
				<div class="flex flex-col items-end gap-1 shrink-0">
					{#if account.status === 'active'}
						<span class="px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/50">Active</span>
					{:else}
						<span class="px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-red-950 text-red-300 border border-red-800/50">Suspended</span>
					{/if}
					{#if account.freeze}
						<span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-950 text-orange-300 border border-orange-800/60">Frozen</span>
					{/if}
				</div>
			</div>

			<!-- Card Info: Email & Phone -->
			<div class="bg-black/40 rounded-xl p-2.5 border border-gray-800/80 mb-3 space-y-1 text-xs">
				<div class="flex items-center justify-between text-gray-300">
					<span class="text-gray-500 text-[11px]">Admin:</span>
					<div class="flex items-center gap-1 truncate max-w-[200px]">
						<span class="truncate">{account.linkedEmail}</span>
						<button onclick={() => copyToClipboard(account.linkedEmail, 'Email copied')} class="text-gray-400 hover:text-white shrink-0 p-0.5">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
						</button>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-gray-500 text-[11px]">Phone:</span>
					{#if account.phoneNumber && account.phoneNumber !== 'N/A'}
						<div class="flex items-center gap-1 text-emerald-400 font-mono text-xs">
							<span>{account.phoneNumber}</span>
							<button onclick={() => copyToClipboard(account.phoneNumber, 'Phone copied')} class="text-gray-400 hover:text-white shrink-0 p-0.5">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
							</button>
						</div>
					{:else}
						<span class="text-gray-600 italic text-[11px]">No Phone</span>
					{/if}
				</div>

				{#if account.totalDue > 0}
					<div class="flex items-center justify-between text-amber-400 font-bold border-t border-gray-800/80 pt-1">
						<span>Pending Due:</span>
						<span>Rs {account.totalDue.toLocaleString()}</span>
					</div>
				{/if}
			</div>

			<!-- Card Controls: Plan & Days -->
			<div class="flex items-center justify-between gap-2 pt-1">
				<form method="POST" action="?/updatePlan" use:enhance class="m-0">
					<input type="hidden" name="accountId" value={account.id} />
					<select
						name="planType"
						onchange={(e) => e.target.form.requestSubmit()}
						class="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
					>
						<option value="Trial" selected={account.planType === 'Trial'}>Trial</option>
						<option value="Monthly" selected={account.planType === 'Monthly' || account.planType === 'Unknown'}>Monthly</option>
						<option value="Yearly" selected={account.planType === 'Yearly'}>Yearly</option>
					</select>
				</form>

				<div class="flex items-center gap-2">
					{#if account.daysRemaining > 0}
						<span class="text-xs font-bold text-blue-300 bg-blue-950 px-2 py-1 rounded-lg border border-blue-900">
							{account.daysRemaining}d left
						</span>
					{:else}
						<span class="text-xs font-black uppercase text-red-400 bg-red-950 px-2 py-1 rounded-lg border border-red-900">
							Expired
						</span>
					{/if}

					<button
						type="button"
						onclick={() => openRefreshDaysModal(account)}
						class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
					>
						<span>+ Days</span>
					</button>

					<a
						href="/dashboard/account/{account.id}"
						class="p-1.5 bg-gray-800 text-gray-300 rounded-lg hover:text-white transition-colors"
						title="Open Account"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
					</a>
				</div>
			</div>
		</div>
	{/each}

	{#if filteredAccounts.length === 0}
		<div class="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center text-gray-500 text-sm">
			No workspaces found matching your filter.
		</div>
	{/if}
</div>

<!-- SVELTE 5 INTERACTIVE MODAL: ADD / REFRESH DAYS -->
<Modal
	show={showAddDaysModal}
	title="Add Validity Days — {modalAccount?.name || 'Workspace'}"
	close={() => showAddDaysModal = false}
>
	<form
		method="POST"
		action="?/refreshDays"
		use:enhance={() => {
			isSubmitting = true;
			return async ({ update }) => {
				await update();
				isSubmitting = false;
				showAddDaysModal = false;
				actionFeedback = `Added ${modalDaysToAdd} days to ${modalAccount?.name}!`;
				setTimeout(() => { actionFeedback = null; }, 3000);
			};
		}}
		id="refreshDaysForm"
		class="space-y-4 font-sans"
	>
		<input type="hidden" name="accountId" value={modalAccount?.id} />

		<div class="bg-gray-950 p-3.5 rounded-xl border border-gray-800 text-xs text-gray-400 space-y-1">
			<div class="flex justify-between">
				<span>Workspace:</span>
				<span class="text-white font-bold">{modalAccount?.name} (ID: {modalAccount?.id})</span>
			</div>
			<div class="flex justify-between">
				<span>Current Days Remaining:</span>
				<span class="text-emerald-400 font-bold">{modalAccount?.daysRemaining || 0} days</span>
			</div>
			<div class="flex justify-between">
				<span>Phone Number:</span>
				<span class="text-white font-mono">{modalAccount?.phoneNumber || 'N/A'}</span>
			</div>
		</div>

		<div>
			<label for="modalDaysInput" class="block text-xs font-bold text-gray-300 uppercase mb-1">Days to Add</label>
			<div class="grid grid-cols-4 gap-2 mb-2">
				{#each [7, 15, 30, 90] as d}
					<button
						type="button"
						onclick={() => modalDaysToAdd = d}
						class="py-1.5 text-xs font-bold rounded-lg border transition-all {modalDaysToAdd === d ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm' : 'bg-gray-800/80 border-gray-700 text-gray-300 hover:bg-gray-800'}"
					>
						+{d} Days
					</button>
				{/each}
			</div>
			<input
				id="modalDaysInput"
				type="number"
				name="days"
				bind:value={modalDaysToAdd}
				required
				min="1"
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>

		<div>
			<label for="modalPlanTypeSelect" class="block text-xs font-bold text-gray-300 uppercase mb-1">Update Plan Type (Optional)</label>
			<select
				id="modalPlanTypeSelect"
				name="planType"
				bind:value={modalPlanType}
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
			>
				<option value="Trial">Trial</option>
				<option value="Monthly">Monthly</option>
				<option value="Yearly">Yearly</option>
			</select>
		</div>

		<div>
			<label for="modalNoteInput" class="block text-xs font-bold text-gray-300 uppercase mb-1">Audit Note / Reason</label>
			<input
				id="modalNoteInput"
				type="text"
				name="note"
				bind:value={modalNote}
				placeholder="e.g. Received monthly fee via Bank / Cash"
				class="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
			/>
		</div>
	</form>

	{#snippet footer()}
		<div class="flex items-center justify-end gap-2.5">
			<button
				type="button"
				onclick={() => showAddDaysModal = false}
				class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-colors"
			>
				Cancel
			</button>
			<button
				type="submit"
				form="refreshDaysForm"
				disabled={isSubmitting || !modalDaysToAdd || modalDaysToAdd <= 0}
				class="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
			>
				{isSubmitting ? 'Adding Days...' : `Confirm +${modalDaysToAdd} Days`}
			</button>
		</div>
	{/snippet}
</Modal>

<style>
	.no-scrollbar::-webkit-scrollbar { display: none; }
	.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>
