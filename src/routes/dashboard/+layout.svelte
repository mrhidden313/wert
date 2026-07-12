<script>
	import { page } from '$app/stores';
	import AiChatWidget from '$lib/components/AiChatWidget.svelte';
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
				class="{$page.url.pathname === '/dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
				</svg>
				Client Overview
			</a>

			<a href="/dashboard/billing" 
				class="{$page.url.pathname === '/dashboard/billing' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Billing & Analytics
			</a>

			<a href="/dashboard/metrics" 
				class="{$page.url.pathname === '/dashboard/metrics' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
				</svg>
				Usage Analytics
			</a>

			<div class="pt-6 pb-2">
				<p class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Internal Finances</p>
			</div>

			<a href="/dashboard/finance" 
				class="{$page.url.pathname === '/dashboard/finance' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Finance Overview
			</a>

			<a href="/dashboard/admins" 
				class="{$page.url.pathname.startsWith('/dashboard/admins') ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				Admin Networth
			</a>

			<a href="/dashboard/approvals" 
				class="{$page.url.pathname === '/dashboard/approvals' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				Pending Approvals
			</a>

			<a href="/dashboard/expenses" 
				class="{$page.url.pathname === '/dashboard/expenses' ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
				</svg>
				App Expenses
			</a>

			<div class="pt-6 pb-2">
				<p class="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">System Settings</p>
			</div>

			<a href="/dashboard/audit-logs" 
				class="{$page.url.pathname === '/dashboard/audit-logs' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
				</svg>
				Audit Logs
			</a>

			<a href="/dashboard/failure-logs" 
				class="{$page.url.pathname === '/dashboard/failure-logs' ? 'bg-rose-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors">
				<svg class="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				Failure Logs
			</a>

			<div class="p-4 border-t border-gray-800">
				<form action="/logout" method="POST">
					<button type="submit" class="w-full flex items-center px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
						<svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
						Logout
					</button>
				</form>
			</div>
		</nav>
	</div>

	<!-- Main content -->
	<div class="flex-1 flex flex-col overflow-hidden">
		<main class="flex-1 overflow-x-hidden overflow-y-auto bg-gray-950 p-6">
			{@render children()}
		</main>
	</div>

	<AiChatWidget />
</div>
