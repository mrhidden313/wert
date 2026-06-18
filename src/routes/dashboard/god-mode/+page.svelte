<script>
	import { fade, slide } from 'svelte/transition';

	let vpsIp = $state('');
	let isConnected = $state(false);
	let isLoading = $state(false);
	let error = $state(null);

	let currentPath = $state('/');
	let files = $state([]);

	// Helper to format bytes
	function formatBytes(bytes, decimals = 2) {
		if (!+bytes) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	// Helper to get simple icons based on extension
	function getFileIcon(name) {
		const ext = name.split('.').pop().toLowerCase();
		if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
		if (['mp4', 'mov', 'avi'].includes(ext)) return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
		if (['json', 'js', 'html', 'css', 'ts', 'rb'].includes(ext)) return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
		if (['zip', 'rar', 'tar', 'gz'].includes(ext)) return 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4';
		return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
	}

	async function fetchDirectory(path) {
		if (!vpsIp) return;
		isLoading = true;
		error = null;

		try {
			// Call our secure Vercel proxy, which injects the password and fetches the VPS
			const res = await fetch(`/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=ls&path=${encodeURIComponent(path)}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to fetch directory');
			}

			files = data.files || [];
			currentPath = data.path; // update to absolute path returned by server
			isConnected = true;
		} catch (err) {
			error = err.message;
			if (!isConnected) {
				// If we failed on initial connect, reset
				vpsIp = '';
			}
		} finally {
			isLoading = false;
		}
	}

	function handleConnect(e) {
		e.preventDefault();
		if (!vpsIp.trim()) return;
		fetchDirectory('/');
	}

	function goUp() {
		if (currentPath === '/') return;
		// Simple path pop
		const parts = currentPath.split('/').filter(Boolean);
		parts.pop();
		const upPath = '/' + parts.join('/');
		fetchDirectory(upPath || '/');
	}

	function handleItemClick(item) {
		if (item.isDirectory) {
			const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
			fetchDirectory(newPath);
		} else {
			// Trigger download
			const downloadPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
			window.location.href = `/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=download&path=${encodeURIComponent(downloadPath)}`;
		}
	}
</script>

<svelte:head>
	<title>GOD MODE - VPS Explorer</title>
</svelte:head>

<div class="mb-6" in:fade={{ duration: 300 }}>
	<div class="flex items-center gap-3">
		<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
		</a>
		<div>
			<h1 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-500 tracking-wider">
				GOD MODE <span class="text-xs font-medium text-gray-500 tracking-normal align-top">VPS EXPLORER</span>
			</h1>
			<p class="text-gray-400 text-sm mt-1">Read-only file system access directly via Chatwoot Super Admin Auth.</p>
		</div>
	</div>
</div>

{#if !isConnected}
	<!-- Connection Panel -->
	<div class="max-w-md mx-auto mt-12 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden" in:slide>
		<div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-purple-600"></div>
		<div class="text-center mb-6">
			<div class="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path></svg>
			</div>
			<h2 class="text-xl font-bold text-white">Connect to Server</h2>
			<p class="text-sm text-gray-400 mt-1">Ensure the bot is running on port 8080.</p>
		</div>

		<form onsubmit={handleConnect} class="space-y-4">
			<div>
				<label class="block text-xs font-medium text-gray-400 mb-1" for="vpsIp">Server IP Address</label>
				<input 
					id="vpsIp" 
					type="text" 
					bind:value={vpsIp}
					placeholder="e.g. 69.169.103.35" 
					class="w-full bg-black/50 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors"
					required
				/>
			</div>
			
			{#if error}
				<div class="bg-red-900/30 text-red-400 text-sm p-3 rounded-lg border border-red-900/50">
					{error}
				</div>
			{/if}

			<button 
				type="submit" 
				disabled={isLoading}
				class="w-full bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
			>
				{#if isLoading}
					<div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
					CONNECTING...
				{:else}
					INITIALIZE CONNECTION
				{/if}
			</button>
		</form>
	</div>

{:else}
	<!-- Explorer View -->
	<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[650px]" in:fade>
		
		<!-- Browser Header -->
		<div class="bg-black/40 border-b border-gray-800 p-4 flex items-center justify-between gap-4 shrink-0">
			<div class="flex items-center gap-2">
				<button onclick={goUp} disabled={currentPath === '/' || isLoading} class="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-300">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
				</button>
				<button onclick={() => fetchDirectory(currentPath)} disabled={isLoading} class="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-300">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
				</button>
			</div>

			<div class="flex-1 bg-black/60 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 font-mono flex items-center overflow-x-auto whitespace-nowrap hide-scrollbar">
				<span class="text-red-500 font-bold mr-2">ROOT</span>
				{#each currentPath.split('/').filter(Boolean) as segment, i}
					<span class="text-gray-600 mx-2">/</span>
					<span>{segment}</span>
				{/each}
			</div>

			<div class="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-900/30 text-emerald-500 border border-emerald-900 flex items-center gap-2">
				<div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
				CONNECTED
			</div>
		</div>

		<!-- File List Area -->
		<div class="flex-1 overflow-y-auto p-2 relative bg-[#0a0a0a]">
			{#if isLoading}
				<div class="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
					<div class="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}

			{#if error}
				<div class="m-4 bg-red-900/30 text-red-400 p-4 rounded-lg border border-red-900/50 flex items-start gap-3">
					<svg class="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<p class="text-sm font-medium">{error}</p>
				</div>
			{/if}

			{#if !error && files.length === 0 && !isLoading}
				<div class="h-full flex flex-col items-center justify-center text-gray-500">
					<svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
					<p>Directory is empty.</p>
				</div>
			{:else}
				<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
					{#each files as file}
						<button 
							onclick={() => handleItemClick(file)}
							class="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800/80 active:scale-[0.98] transition-all text-left group border border-transparent hover:border-gray-700/50"
						>
							{#if file.isDirectory}
								<div class="w-10 h-10 rounded-lg bg-blue-900/30 text-blue-400 flex items-center justify-center shrink-0">
									<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors">{file.name}</div>
									<div class="text-xs text-gray-500">Folder</div>
								</div>
							{:else}
								<div class="w-10 h-10 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center shrink-0 group-hover:bg-red-900/20 group-hover:text-red-400 transition-colors relative overflow-hidden">
									<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={getFileIcon(file.name)}></path>
									</svg>
									<!-- Hover overlay for download icon -->
									<div class="absolute inset-0 bg-red-500/20 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
									</div>
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium text-gray-300 truncate group-hover:text-red-400 transition-colors">{file.name}</div>
									<div class="text-[11px] text-gray-500">{formatBytes(file.size)}</div>
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	/* Hide scrollbar for path viewer */
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
