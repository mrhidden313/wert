<script>
	import { page } from '$app/stores';
	let { children } = $props();
</script>

<div class="flex h-screen bg-gray-950 text-white">
	<!-- Sidebar -->
	<div class="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
		<div class="h-16 flex items-center px-6 border-b border-gray-800">
			<h1 class="text-xl font-bold text-emerald-400">InstantFlow</h1>
		</div>
		
		<nav class="flex-1 px-4 py-6 space-y-2">
			<a href="/dashboard" 
				class="flex items-center px-4 py-3 rounded-lg transition-colors {$page.url.pathname === '/dashboard' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
				<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
				All Accounts
			</a>
			
			<a href="/dashboard/create-account" 
				class="flex items-center px-4 py-3 rounded-lg transition-colors {$page.url.pathname === '/dashboard/create-account' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
				<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
				Build Account
			</a>
			
			<a href="/dashboard/billing" 
				class="flex items-center px-4 py-3 rounded-lg transition-colors {$page.url.pathname === '/dashboard/billing' ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}">
				<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
				Billing & Pricing
			</a>
		</nav>

		<div class="p-4 border-t border-gray-800">
			<form action="/logout" method="POST">
				<button type="submit" class="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
					<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
					Logout
				</button>
			</form>
		</div>
	</div>

	<!-- Main content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950 p-6">
			{@render children()}
		</main>
	</div>
</div>
