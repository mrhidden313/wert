<script>
	import { fade, scale } from 'svelte/transition';
	let { show = false, title = "Modal Title", description = "", close = () => {}, children, footer } = $props();
</script>

{#if show}
	<!-- Backdrop -->
	<div 
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<!-- Modal Content -->
		<div 
			class="bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
			transition:scale={{ duration: 150, start: 0.95 }}
		>
			<!-- Header -->
			<div class="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-950/50">
				<h3 class="text-lg font-semibold text-white">{title}</h3>
				<button type="button" onclick={close} class="text-gray-400 hover:text-white transition-colors">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
					</svg>
				</button>
			</div>
			
			<!-- Body -->
			<div class="px-6 py-6">
				{#if description}
					<p class="text-sm text-gray-400 mb-4">{description}</p>
				{/if}
				{@render children?.()}
			</div>
			
			<!-- Footer -->
			{#if footer}
				<div class="px-6 py-4 bg-gray-950/50 border-t border-gray-800 flex justify-end space-x-3">
					{@render footer?.()}
				</div>
			{/if}
		</div>
	</div>
{/if}
