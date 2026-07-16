<script>
	import { onMount } from 'svelte';

	let isGlobalMaintenance = $state(false);
	let isUpgradeCelebration = $state(false);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let isCelebrationSaving = $state(false);
	let showDurationModal = $state(false);
	let selectedDuration = $state(6);

	onMount(async () => {
		try {
			const [maintRes, celebRes] = await Promise.all([
				fetch('/api/admin/system-maintenance'),
				fetch('/api/admin/system-celebration')
			]);
			if (maintRes.ok) {
				const data = await maintRes.json();
				isGlobalMaintenance = Boolean(data.active);
			}
			if (celebRes.ok) {
				const data = await celebRes.json();
				isUpgradeCelebration = Boolean(data.active);
			}
		} catch (err) {
			console.error('Failed to load global settings status', err);
		} finally {
			isLoading = false;
		}
	});

	async function toggleGlobalMaintenance() {
		isSaving = true;
		try {
			const nextState = !isGlobalMaintenance;
			const res = await fetch('/api/admin/system-maintenance', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: nextState })
			});
			if (res.ok) {
				const data = await res.json();
				isGlobalMaintenance = Boolean(data.active);
			}
		} catch (err) {
			console.error('Failed to toggle global maintenance', err);
		} finally {
			isSaving = false;
		}
	}

	async function toggleUpgradeCelebration(targetState, durationHours = 0) {
		isCelebrationSaving = true;
		showDurationModal = false;
		try {
			const res = await fetch('/api/admin/system-celebration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: targetState, durationHours })
			});
			if (res.ok) {
				const data = await res.json();
				isUpgradeCelebration = Boolean(data.active);
			}
		} catch (err) {
			console.error('Failed to toggle upgrade celebration', err);
		} finally {
			isCelebrationSaving = false;
		}
	}

	function handleCelebrationButtonClick() {
		if (isUpgradeCelebration) {
			toggleUpgradeCelebration(false, 0);
		} else {
			showDurationModal = true;
		}
	}
</script>

<svelte:head>
	<title>Global System Settings — InstantFlow Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-4 sm:py-8 space-y-6">
	<div class="mb-6">
		<h1 class="text-xl sm:text-2xl font-bold text-white">Global System Settings</h1>
		<p class="text-gray-400 text-sm mt-1">Control system-wide maintenance, application locks, and global broadcast flags across all client workspaces.</p>
	</div>

	<!-- GLOBAL SYSTEM MAINTENANCE BLOCK -->
	<div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
			<div class="flex items-start gap-3 sm:gap-4">
				<div class="w-12 h-12 rounded-2xl flex items-center justify-center {isGlobalMaintenance ? 'bg-red-500/20 text-red-400' : 'bg-gray-800 text-gray-400'} shrink-0 transition-colors">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
				</div>
				<div>
					<div class="flex items-center gap-3">
						<h3 class="text-lg font-bold text-white">Global System Maintenance Mode</h3>
						{#if isLoading}
							<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400">Loading...</span>
						{:else}
							<span class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider {isGlobalMaintenance ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-800 text-gray-500'}">
								{isGlobalMaintenance ? 'ACTIVE ALL USERS' : 'OFF'}
							</span>
						{/if}
					</div>
					<p class="text-xs text-gray-400 mt-1.5 max-w-xl leading-relaxed">
						When toggled ON, triggers the vibrant uncloseable System Upgrade & Maintenance blocker screen across all active client apps via live Firestore sync. Users will not see any close (X) or cancel button until you disable it here.
					</p>
				</div>
			</div>

			<button
				onclick={toggleGlobalMaintenance}
				disabled={isSaving || isLoading}
				class="px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 {isGlobalMaintenance ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white'} disabled:opacity-50"
			>
				{isSaving ? 'Syncing...' : isGlobalMaintenance ? 'Disable Global Maintenance' : 'Enable Global Maintenance'}
			</button>
		</div>
	</div>

	<!-- GLOBAL UPGRADE CELEBRATION BLOCK -->
	<div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0">
			<div class="flex items-start gap-3 sm:gap-4">
				<div class="w-12 h-12 rounded-2xl flex items-center justify-center {isUpgradeCelebration ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-400'} shrink-0 transition-colors">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
					</svg>
				</div>
				<div>
					<div class="flex items-center gap-3">
						<h3 class="text-lg font-bold text-white">Global Upgrade Celebration Banner</h3>
						{#if isLoading}
							<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-400">Loading...</span>
						{:else}
							<span class="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider {isUpgradeCelebration ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-800 text-gray-500'}">
								{isUpgradeCelebration ? 'BROADCASTING (ONCE PER DEVICE)' : 'OFF'}
							</span>
						{/if}
					</div>
					<p class="text-xs text-gray-400 mt-1.5 max-w-xl leading-relaxed">
						When toggled ON, displays a stunning "Server Successfully Upgraded! Click OK and Enjoy!" celebration banner across all connected Svelte devices. Each user device sees it exactly ONCE per device (saved in localStorage).
					</p>
				</div>
			</div>

			<button
				onclick={handleCelebrationButtonClick}
				disabled={isCelebrationSaving || isLoading}
				class="px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 {isUpgradeCelebration ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_25px_rgba(220,38,38,0.5)]' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)]'} disabled:opacity-50"
			>
				{isCelebrationSaving ? 'Syncing...' : isUpgradeCelebration ? 'Stop Celebration Broadcast' : 'Broadcast Upgrade Celebration'}
			</button>
		</div>
	</div>

	{#if showDurationModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
			<div class="bg-gray-900 border border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
				<div>
					<h3 class="text-xl font-bold text-white">Select Broadcast Duration</h3>
					<p class="text-xs text-gray-400 mt-1">
						Choose how long the Upgrade Celebration banner should stay active. After this time, it will automatically turn OFF and clean up from Firebase.
					</p>
				</div>

				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						onclick={() => selectedDuration = 1}
						class="p-3.5 rounded-2xl border text-left font-bold transition-all {selectedDuration === 1 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800'}"
					>
						<div class="text-sm">1 Hour</div>
						<div class="text-[10px] opacity-70 font-normal">Short broadcast</div>
					</button>

					<button
						type="button"
						onclick={() => selectedDuration = 6}
						class="p-3.5 rounded-2xl border text-left font-bold transition-all {selectedDuration === 6 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800'}"
					>
						<div class="text-sm">6 Hours</div>
						<div class="text-[10px] opacity-70 font-normal">Recommended</div>
					</button>

					<button
						type="button"
						onclick={() => selectedDuration = 24}
						class="p-3.5 rounded-2xl border text-left font-bold transition-all {selectedDuration === 24 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800'}"
					>
						<div class="text-sm">24 Hours</div>
						<div class="text-[10px] opacity-70 font-normal">Full day cycle</div>
					</button>

					<button
						type="button"
						onclick={() => selectedDuration = 0}
						class="p-3.5 rounded-2xl border text-left font-bold transition-all {selectedDuration === 0 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800'}"
					>
						<div class="text-sm">Permanent</div>
						<div class="text-[10px] opacity-70 font-normal">Until manual stop</div>
					</button>
				</div>

				<div class="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onclick={() => showDurationModal = false}
						class="px-4 py-2.5 rounded-xl font-bold text-sm text-gray-400 hover:text-white transition-colors"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={() => toggleUpgradeCelebration(true, selectedDuration)}
						class="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
					>
						Start Broadcast
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

