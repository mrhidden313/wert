<script>
	import { onMount } from 'svelte';

	let isGlobalMaintenance = $state(false);
	let isLoading = $state(true);
	let isSaving = $state(false);

	onMount(async () => {
		try {
			const res = await fetch('/api/admin/system-maintenance');
			if (res.ok) {
				const data = await res.json();
				isGlobalMaintenance = Boolean(data.active);
			}
		} catch (err) {
			console.error('Failed to load global maintenance status', err);
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
</script>

<svelte:head>
	<title>Global System Settings — InstantFlow Admin</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-8">
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white">Global System Settings</h1>
		<p class="text-gray-400 text-sm mt-1">Control system-wide maintenance, application locks, and global broadcast flags across all client workspaces.</p>
	</div>

	<!-- GLOBAL SYSTEM MAINTENANCE BLOCK -->
	<div class="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-lg">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
			<div class="flex items-start gap-4">
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
</div>
