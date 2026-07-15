<script>
	import { fade, slide } from 'svelte/transition';

	let vpsIp = $state('');
	let isConnected = $state(false);
	let isLoading = $state(false);
	let error = $state(null);

	let currentPath = $state('/');
	let pathInput = $state('/');
	let files = $state([]);

	// Storage State
	let showStorage = $state(false);
	let storageData = $state(null);
	let isStorageLoading = $state(false);

	// Advanced Scanner State
	let scanData = $state(null);
	let isScanning = $state(false);
	let scanError = $state(null);

	// Sort State
	let sortMode = $state('name'); // 'name', 'size', 'date'
	let sortDirection = $state(1); // 1 = ascending, -1 = descending

	let sortedFiles = $derived([...files].sort((a, b) => {
		// Directories always first, unless sorting strictly by size maybe? Keep dirs first.
		if (a.isDirectory && !b.isDirectory) return -1;
		if (!a.isDirectory && b.isDirectory) return 1;

		let valA, valB;
		if (sortMode === 'name') {
			valA = a.name.toLowerCase();
			valB = b.name.toLowerCase();
			if (valA < valB) return -1 * sortDirection;
			if (valA > valB) return 1 * sortDirection;
			return 0;
		} else if (sortMode === 'size') {
			valA = a.size || 0;
			valB = b.size || 0;
			return (valA - valB) * sortDirection;
		} else if (sortMode === 'date') {
			valA = a.mtime || 0;
			valB = b.mtime || 0;
			return (valA - valB) * sortDirection;
		}
		return 0;
	}));

	// Helper to format bytes
	function formatBytes(bytes, decimals = 2) {
		if (bytes === null || bytes === undefined) return '...';
		if (!+bytes) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
	}

	function formatDate(ms) {
		if (!ms) return '';
		return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// Helper to get simple icons based on extension
	function getFileIcon(name) {
		const ext = name.split('.').pop().toLowerCase();
		if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
		if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
		if (['json', 'js', 'html', 'css', 'ts', 'rb', 'py', 'php', 'sh', 'md'].includes(ext)) return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
		if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4';
		if (['mp3', 'wav', 'ogg'].includes(ext)) return 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3';
		return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
	}

	function getFileColor(name) {
		const ext = name.split('.').pop().toLowerCase();
		if (['js', 'ts', 'json'].includes(ext)) return 'text-yellow-400 group-hover:bg-yellow-400/20';
		if (['html', 'svelte', 'vue', 'jsx'].includes(ext)) return 'text-orange-400 group-hover:bg-orange-400/20';
		if (['css', 'scss', 'tailwind'].includes(ext)) return 'text-blue-400 group-hover:bg-blue-400/20';
		if (['rb', 'py', 'php'].includes(ext)) return 'text-red-400 group-hover:bg-red-400/20';
		if (['png', 'jpg', 'jpeg', 'svg', 'gif'].includes(ext)) return 'text-blue-500 group-hover:bg-blue-500/20';
		if (['mp4', 'mov', 'avi'].includes(ext)) return 'text-yellow-500 group-hover:bg-yellow-500/20';
		if (['zip', 'tar', 'gz'].includes(ext)) return 'text-amber-600 group-hover:bg-amber-600/20';
		if (['sh', 'bash'].includes(ext)) return 'text-green-400 group-hover:bg-green-400/20';
		if (['pdf', 'doc', 'docx', 'txt', 'csv'].includes(ext)) return 'text-red-500 group-hover:bg-red-500/20';
		if (['mp3', 'wav', 'ogg'].includes(ext)) return 'text-emerald-500 group-hover:bg-emerald-500/20';
		return 'text-gray-400 group-hover:bg-gray-400/20'; // default
	}

	let sizeFetchQueue = [];
	let isFetchingSizes = false;

	async function processSizeQueue() {
		if (isFetchingSizes || sizeFetchQueue.length === 0) return;
		isFetchingSizes = true;
		
		while (sizeFetchQueue.length > 0) {
			const item = sizeFetchQueue.shift();
			// Re-verify the item still exists in the current view
			const stillExists = files.find(f => f.name === item.name);
			if (!stillExists) continue;

			try {
				const itemPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
				const res = await fetch(`/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=size&path=${encodeURIComponent(itemPath)}`);
				if (res.ok) {
					const data = await res.json();
					// Update file array
					files = files.map(f => f.name === item.name ? { ...f, size: data.size } : f);
				}
			} catch (e) {
				// Ignore size fetch errors silently
			}
		}
		isFetchingSizes = false;
	}

	async function fetchDirectory(path) {
		if (!vpsIp) return;
		isLoading = true;
		error = null;
		scanData = null; // Reset scan data on navigate
		
		// Clear size queue since we are changing paths
		sizeFetchQueue = [];

		try {
			const res = await fetch(`/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=ls&path=${encodeURIComponent(path)}`);
			const data = await res.json();

			if (!res.ok) {
				throw new Error(data.error || 'Failed to fetch directory');
			}

			files = data.files || [];
			currentPath = data.path; 
			pathInput = data.path; 
			isConnected = true;

			// Queue directories for lazy size loading
			files.forEach(f => {
				if (f.isDirectory) {
					sizeFetchQueue.push(f);
				}
			});
			processSizeQueue();

		} catch (err) {
			error = err.message;
			if (!isConnected) vpsIp = '';
		} finally {
			isLoading = false;
		}
	}

	async function fetchStorage() {
		if (!vpsIp) return;
		isStorageLoading = true;
		try {
			const res = await fetch(`/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=storage`);
			if (res.ok) {
				storageData = await res.json();
			}
		} catch (e) {
			console.error('Failed to load storage data', e);
		} finally {
			isStorageLoading = false;
		}
	}

	async function triggerDeepScan() {
		if (!vpsIp || !currentPath) return;
		isScanning = true;
		scanError = null;
		
		try {
			const res = await fetch(`/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=scan&path=${encodeURIComponent(currentPath)}`);
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || 'Failed to scan directory');
			
			// Process categories into an array sorted by size
			const categoriesArray = Object.entries(data.categories)
				.map(([name, info]) => ({
					name,
					size: info.size,
					count: info.count,
					color: info.color,
					percent: data.totalSize > 0 ? (info.size / data.totalSize) * 100 : 0
				}))
				.filter(cat => cat.size > 0)
				.sort((a, b) => b.size - a.size);
				
			scanData = {
				totalSize: data.totalSize,
				totalFiles: data.totalFiles,
				categories: categoriesArray
			};
		} catch (e) {
			scanError = e.message;
		} finally {
			isScanning = false;
		}
	}

	function handleConnect(e) {
		e.preventDefault();
		if (!vpsIp.trim()) return;
		fetchDirectory('/');
	}

	function goUp() {
		if (currentPath === '/') return;
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
			const downloadPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
			window.location.href = `/api/vps-proxy?ip=${encodeURIComponent(vpsIp)}&action=download&path=${encodeURIComponent(downloadPath)}`;
		}
	}

	function toggleStorage() {
		showStorage = !showStorage;
		if (showStorage && !storageData) {
			fetchStorage();
		}
	}

	function getCategoryIcon(name) {
		if (name === 'Images') return 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z';
		if (name === 'Videos') return 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z';
		if (name === 'Documents') return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
		if (name === 'Audio') return 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3';
		if (name === 'Code') return 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4';
		if (name === 'Archives') return 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4';
		return 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z';
	}
</script>

<svelte:head>
	<title>GOD MODE - VPS Explorer</title>
</svelte:head>

<div class="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" in:fade={{ duration: 300 }}>
	<div class="flex items-center gap-3">
		<a href="/dashboard" class="text-gray-400 hover:text-white transition-colors">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
		</a>
		<div>
			<h1 class="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-purple-500 tracking-wider">
				GOD MODE <span class="text-xs font-medium text-gray-500 tracking-normal align-top">VPS EXPLORER</span>
			</h1>
			<p class="text-gray-400 text-sm mt-1">Read-only file system access directly via Chatwoot Super Admin Auth.</p>
		</div>
	</div>

	{#if isConnected}
	<div class="flex flex-wrap items-center gap-2 sm:gap-3">
		<!-- Sort Controls -->
		<div class="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
			<button onclick={() => { sortMode = 'name'; sortDirection = sortMode === 'name' ? sortDirection * -1 : 1; }} class="px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors {sortMode === 'name' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}">Name {sortMode === 'name' ? (sortDirection === 1 ? '↓' : '↑') : ''}</button>
			<button onclick={() => { sortMode = 'size'; sortDirection = sortMode === 'size' ? sortDirection * -1 : -1; }} class="px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors {sortMode === 'size' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}">Size {sortMode === 'size' ? (sortDirection === 1 ? '↑' : '↓') : ''}</button>
			<button onclick={() => { sortMode = 'date'; sortDirection = sortMode === 'date' ? sortDirection * -1 : -1; }} class="px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-md transition-colors {sortMode === 'date' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}">Date {sortMode === 'date' ? (sortDirection === 1 ? '↑' : '↓') : ''}</button>
		</div>

		<button onclick={toggleStorage} class="px-3 py-2 bg-gray-900 border border-gray-800 hover:border-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2">
			<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
			Storage
		</button>
	</div>
	{/if}
</div>

{#if showStorage && isConnected}
	<div class="mb-4 bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl relative overflow-hidden" in:slide>
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-white font-bold text-xl flex items-center gap-2">
					<svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
					Storage Overview
				</h2>
				<p class="text-sm text-gray-400 mt-1">Review heavy files to organize your space.</p>
			</div>

			<div class="text-right">
				{#if isStorageLoading}
					<div class="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block"></div>
				{:else if storageData}
					<p class="text-sm font-semibold text-gray-400">Total VPS Disk: <span class="text-white font-bold">{storageData.usedSpace}</span> / {storageData.totalSpace}</p>
					<div class="flex items-center justify-end gap-2 mt-1">
						<div class="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
							<div class="h-full bg-emerald-500" style="width: {storageData.usePercent}%"></div>
						</div>
						<span class="text-xs text-gray-500">{storageData.usePercent}% Used</span>
					</div>
				{/if}
			</div>
		</div>

		{#if !scanData && !isScanning}
			<div class="bg-black/30 border border-gray-800 rounded-lg p-8 flex flex-col items-center justify-center text-center">
				<div class="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4">
					<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
				</div>
				<h3 class="text-lg font-bold text-white mb-2">Deep Storage Analysis</h3>
				<p class="text-sm text-gray-400 mb-6 max-w-md">Click below to recursively scan the current folder (`{currentPath}`) and calculate exactly how much space each file type is using.</p>
				
				<button onclick={triggerDeepScan} class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center gap-2">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
					Analyze Deep Storage
				</button>
				{#if scanError}
					<p class="text-sm text-red-400 mt-4">{scanError}</p>
				{/if}
			</div>
		{:else if isScanning}
			<div class="bg-black/30 border border-gray-800 rounded-lg p-12 flex flex-col items-center justify-center">
				<div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
				<h3 class="text-white font-bold mb-1">Scanning directory...</h3>
				<p class="text-sm text-gray-500">This may take a few seconds for very large folders.</p>
			</div>
		{:else if scanData}
			<!-- Advanced Scanner Dashboard UI -->
			
			<!-- Category Cards -->
			<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
				{#each scanData.categories.slice(0, 5) as cat}
					<div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex flex-col">
						<div class="w-12 h-10 rounded-lg flex items-center justify-center mb-3" style="background-color: {cat.color}20; color: {cat.color};">
							<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={getCategoryIcon(cat.name)}></path></svg>
						</div>
						<div class="text-gray-300 font-bold mb-1">{cat.name}</div>
						<div class="text-xs text-gray-500">{cat.count} files</div>
					</div>
				{/each}
			</div>

			<!-- Main Storage Overview Box -->
			<div class="bg-black/40 border border-gray-800 rounded-xl p-6">
				<div class="flex items-end justify-between mb-4">
					<div>
						<span class="text-3xl font-black text-white">{formatBytes(scanData.totalSize)}</span>
						<span class="text-gray-400 ml-2">Total Analyzed</span>
					</div>
				</div>

				<!-- Huge colorful progress bar -->
				<div class="h-6 bg-gray-800 rounded-full overflow-hidden w-full flex mb-6 shadow-inner">
					{#each scanData.categories as cat}
						<div class="h-full hover:brightness-125 transition-all cursor-pointer" style="width: {cat.percent}%; background-color: {cat.color};" title="{cat.name}: {formatBytes(cat.size)}"></div>
					{/each}
				</div>

				<!-- Detailed Legend -->
				<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-3 gap-x-6">
					{#each scanData.categories as cat}
						<div class="flex items-center justify-between text-sm">
							<div class="flex items-center gap-2">
								<span class="w-3 h-3 rounded-full" style="background-color: {cat.color};"></span>
								<span class="text-gray-300">{cat.name}</span>
							</div>
							<span class="font-mono text-gray-400">{formatBytes(cat.size, 1)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}

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
	<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[75vh] mb-4" in:fade>
		
		<!-- Browser Header -->
		<div class="bg-black/40 border-b border-gray-800 p-4 flex items-center justify-between gap-4 shrink-0">
			<div class="flex items-center gap-2 shrink-0">
				<button onclick={goUp} disabled={currentPath === '/' || isLoading} class="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-300">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
				</button>
				<button onclick={() => fetchDirectory(currentPath)} disabled={isLoading} class="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors text-gray-300">
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
				</button>
			</div>

			<form class="flex-1 flex" onsubmit={(e) => { e.preventDefault(); fetchDirectory(pathInput); }}>
				<div class="flex-1 bg-black/60 border border-gray-800 rounded-lg flex items-center overflow-hidden focus-within:border-emerald-500 transition-colors">
					<span class="text-emerald-500 font-bold px-4 shrink-0 bg-gray-900/50 h-full flex items-center border-r border-gray-800 text-sm">PATH</span>
					<input 
						type="text" 
						bind:value={pathInput}
						class="w-full bg-transparent px-4 py-2 text-sm text-gray-300 font-mono focus:outline-none"
						spellcheck="false"
						autocomplete="off"
						placeholder="/var/www/..."
					/>
					<button type="submit" class="px-4 text-gray-400 hover:text-white transition-colors">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
					</button>
				</div>
			</form>

			<div class="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-900/30 text-emerald-500 border border-emerald-900 flex items-center gap-2 shrink-0">
				<div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
				CONNECTED
			</div>
		</div>

		<!-- File List Area -->
		<div class="flex-1 overflow-y-auto p-4 relative bg-[#0a0a0a]">
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
				<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
					{#each sortedFiles as file}
						<button 
							onclick={() => handleItemClick(file)}
							class="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 hover:bg-gray-800 active:scale-[0.98] transition-all text-left group border border-gray-800 hover:border-gray-600 shadow-sm"
						>
							{#if file.isDirectory}
								<div class="w-12 h-12 rounded-xl bg-blue-900/30 text-blue-400 flex items-center justify-center shrink-0">
									<svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
								</div>
								<div class="flex-1 min-w-0 flex flex-col justify-center">
									<div class="text-[15px] font-semibold text-gray-200 truncate group-hover:text-blue-400 transition-colors mb-0.5">{file.name}</div>
									<div class="flex items-center gap-2 text-xs text-gray-500">
										<span>Folder</span>
										{#if file.size !== undefined && file.size !== null}
											<span class="w-1 h-1 rounded-full bg-gray-700"></span>
											<span class="font-mono">{formatBytes(file.size, 1)}</span>
										{:else}
											<span class="w-1 h-1 rounded-full bg-gray-700"></span>
											<span class="animate-pulse">Calculating...</span>
										{/if}
									</div>
									{#if file.mtime}
										<div class="text-[10px] text-gray-600 mt-1">{formatDate(file.mtime)}</div>
									{/if}
								</div>
							{:else}
								<div class="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 transition-colors relative overflow-hidden {getFileColor(file.name)}">
									<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={getFileIcon(file.name)}></path>
									</svg>
									<!-- Hover overlay for download icon -->
									<div class="absolute inset-0 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
										<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
									</div>
								</div>
								<div class="flex-1 min-w-0 flex flex-col justify-center">
									<div class="text-[14px] font-medium text-gray-300 truncate group-hover:text-white transition-colors mb-0.5">{file.name}</div>
									<div class="text-[11px] text-gray-500 font-mono">{formatBytes(file.size)}</div>
									{#if file.mtime}
										<div class="text-[10px] text-gray-600 mt-1">{formatDate(file.mtime)}</div>
									{/if}
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
