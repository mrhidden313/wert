<script>
	let isOpen = $state(false);
	let inputMessage = $state('');
	let loading = $state(false);
	let apiStatus = $state('CHECKING...'); // 'CHECKING...', 'ONLINE', 'DEAD'

	let messages = $state([
		{
			role: 'assistant',
			text: '### 👋 InstantFlow Live AI Inspector\nConnected to **Google Gemini 1.5 Flash**. Ask me anything about your real database records, revenue, or system errors!'
		}
	]);

	let chatContainer;

	async function checkApiStatus() {
		apiStatus = 'CHECKING...';
		try {
			const res = await fetch('/api/ai/status');
			const data = await res.json();
			apiStatus = data.status || 'DEAD';
		} catch (err) {
			apiStatus = 'DEAD';
		}
	}

	function toggleChat() {
		isOpen = !isOpen;
		if (isOpen) {
			checkApiStatus();
		}
	}

	async function sendMessage(textToSend = null) {
		const msg = textToSend || inputMessage;
		if (!msg || !msg.trim() || loading) return;

		messages = [...messages, { role: 'user', text: msg }];
		if (!textToSend) inputMessage = '';
		loading = true;

		setTimeout(() => {
			if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
		}, 50);

		try {
			const response = await fetch('/api/ai/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: msg })
			});

			const data = await response.json();
			if (data.apiStatus) {
				apiStatus = data.apiStatus;
			}
			if (data.reply) {
				messages = [...messages, { role: 'assistant', text: data.reply }];
			} else {
				messages = [
					...messages,
					{ role: 'assistant', text: '### 🔴 API Status: DEAD\nNo reply received from server.' }
				];
			}
		} catch (err) {
			apiStatus = 'DEAD';
			messages = [
				...messages,
				{ role: 'assistant', text: `### 🔴 Connection Error (DEAD)\nCould not reach \`/api/ai/chat\`: \`${err.message}\`` }
			];
		} finally {
			loading = false;
			setTimeout(() => {
				if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
			}, 50);
		}
	}

	function sendQuickPrompt(prompt) {
		sendMessage(prompt);
	}
</script>

<!-- FLOATING BUTTON -->
<div class="fixed bottom-6 right-6 z-50">
	{#if !isOpen}
		<button
			onclick={toggleChat}
			class="group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all transform hover:scale-105"
		>
			<svg class="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 10V3L4 14h7v7l9-11h-7z"
				/>
			</svg>
			<span class="text-xs uppercase tracking-wider">AI Inspector</span>
		</button>
	{/if}

	<!-- CHAT PANEL DRAWER / MODAL -->
	{#if isOpen}
		<div
			class="w-80 sm:w-96 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300"
			style="height: 540px;"
		>
			<!-- HEADER WITH LIVE API ONLINE/DEAD STATUS -->
			<div
				class="px-4 py-3 bg-gray-950 border-b border-gray-800 flex justify-between items-center"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="w-2.5 h-2.5 rounded-full {apiStatus === 'ONLINE'
							? 'bg-emerald-400 animate-ping'
							: apiStatus === 'DEAD'
							? 'bg-red-500'
							: 'bg-amber-400 animate-pulse'}"
					></div>
					<div>
						<div class="flex items-center gap-2">
							<h3 class="text-sm font-bold text-white">InstantFlow AI</h3>
							<span
								class="px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider {apiStatus ===
								'ONLINE'
									? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
									: apiStatus === 'DEAD'
									? 'bg-red-950 text-red-300 border border-red-500/50'
									: 'bg-gray-800 text-gray-300'}"
							>
								API: {apiStatus}
							</span>
						</div>
						<p class="text-[10px] text-gray-400">Google Gemini 2.5 Flash (Live)</p>
					</div>
				</div>
				<button
					onclick={toggleChat}
					class="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<!-- QUICK PROMPTS -->
			<div
				class="px-3 py-2 bg-gray-950/60 border-b border-gray-800/80 flex gap-1.5 overflow-x-auto no-scrollbar"
			>
				<button
					onclick={() => sendQuickPrompt('Summarize our financial status & revenue')}
					class="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
				>
					💰 Revenue Summary
				</button>
				<button
					onclick={() => sendQuickPrompt('Which workspaces are expiring soon?')}
					class="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
				>
					⏳ Expiring Soon
				</button>
				<button
					onclick={() => sendQuickPrompt('Check server health & active processes')}
					class="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
				>
					🖥️ VPS Health
				</button>
				<button
					onclick={() => sendQuickPrompt('List any recent system failure logs')}
					class="whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 transition-colors"
				>
					⚠️ Failure Logs
				</button>
			</div>

			<!-- MESSAGES AREA -->
			<div
				bind:this={chatContainer}
				class="flex-1 p-4 overflow-y-auto space-y-4 text-xs"
			>
				{#each messages as m}
					<div
						class="flex flex-col {m.role === 'user' ? 'items-end' : 'items-start'}"
					>
						<div
							class="max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed {m.role ===
							'user'
								? 'bg-emerald-600 text-white rounded-br-none'
								: 'bg-gray-800 border border-gray-700/80 text-gray-200 rounded-bl-none'}"
						>
							{#if m.role === 'assistant'}
								<div class="whitespace-pre-wrap">{m.text}</div>
							{:else}
								<div>{m.text}</div>
							{/if}
						</div>
					</div>
				{/each}

				{#if loading}
					<div class="flex items-center gap-2 text-gray-400 text-xs pl-2">
						<span
							class="w-2 h-2 rounded-full bg-emerald-400 animate-bounce"
						></span>
						<span
							class="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]"
						></span>
						<span
							class="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]"
						></span>
						<span class="text-[11px] ml-1">Querying live Gemini 1.5 Flash...</span>
					</div>
				{/if}
			</div>

			<!-- INPUT FOOTER -->
			<form
				onsubmit={(e) => {
					e.preventDefault();
					sendMessage();
				}}
				class="p-3 bg-gray-950 border-t border-gray-800 flex items-center gap-2"
			>
				<input
					type="text"
					bind:value={inputMessage}
					placeholder="Ask live Gemini AI..."
					class="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
				/>
				<button
					type="submit"
					disabled={loading || !inputMessage.trim()}
					class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors"
				>
					Send
				</button>
			</form>
		</div>
	{/if}
</div>
