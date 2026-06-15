<script>
	import { enhance } from '$app/forms';
	export let form;
	
	let loading = false;
</script>

<svelte:head>
	<title>InstantFlow - Super Admin Login</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<!-- We can use their neon theme here -->
		<h2 class="mt-6 text-center text-3xl font-extrabold text-white">
			<span class="text-emerald-400">InstantFlow</span> Admin
		</h2>
		<p class="mt-2 text-center text-sm text-gray-400">
			Super Admin Dashboard
		</p>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-gray-900 py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border border-gray-800">
			<form class="space-y-6" method="POST" use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}>
				
				{#if form?.incorrect}
					<div class="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm text-center">
						Invalid email or password.
					</div>
				{/if}
				{#if form?.error}
					<div class="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm text-center">
						{form.error}
					</div>
				{/if}

				<div>
					<label for="email" class="block text-sm font-medium text-gray-300">
						Super Admin Email
					</label>
					<div class="mt-1">
						<input id="email" name="email" type="email" autocomplete="email" required 
							class="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
							value={form?.email || ''}
						>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-300">
						Password
					</label>
					<div class="mt-1">
						<input id="password" name="password" type="password" autocomplete="current-password" required 
							class="appearance-none block w-full px-3 py-2 border border-gray-700 rounded-md shadow-sm placeholder-gray-500 bg-gray-800 text-white focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
						>
					</div>
				</div>

				<div>
					<button type="submit" disabled={loading} 
						class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-emerald-400 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors">
						{#if loading}
							Signing in...
						{:else}
							Sign in
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
