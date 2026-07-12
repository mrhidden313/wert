import { ChatwootAPI } from '$lib/server/chatwoot';

export async function load() {
	const startTime = Date.now();
	let latencyMs = 0;
	let isOnline = false;
	let bridgeMetrics = null;

	try {
		const chatwoot = new ChatwootAPI();
		// Try querying our bridge endpoint or basic health ping
		try {
			bridgeMetrics = await chatwoot._bridgeRequest('GET', '/super_admin/bridge/server_health');
		} catch (e) {
			// Fallback ping to verify server online status
			await fetch('https://api.instantflow.online/api', { method: 'HEAD' });
		}

		latencyMs = Date.now() - startTime;
		isOnline = true;
	} catch (err) {
		latencyMs = Date.now() - startTime;
		isOnline = false;
	}

	// STRICT REAL TELEMETRY ONLY (No simulated/fallback static numbers)
	const serverHealth = bridgeMetrics ? {
		...bridgeMetrics,
		isLiveBridge: true,
		network: {
			latencyMs,
			status: isOnline ? 'ONLINE' : 'OFFLINE'
		}
	} : {
		isLiveBridge: false,
		hostname: 'api.instantflow.online',
		os: 'Live VPS Host',
		uptime: 'Telemetry Endpoint Not Mounted',
		cpu: {
			model: 'VPS Telemetry Agent Unconnected',
			usagePercent: 0,
			temperature: 'N/A',
			loadAvg: ['N/A', 'N/A', 'N/A']
		},
		memory: {
			totalGb: 0,
			usedGb: 0,
			freeGb: 0,
			usagePercent: 0
		},
		disk: {
			totalGb: 0,
			usedGb: 0,
			freeGb: 0,
			usagePercent: 0
		},
		network: {
			latencyMs,
			status: isOnline ? 'ONLINE (Ping Verified)' : 'UNREACHABLE'
		},
		processes: []
	};

	return {
		serverHealth
	};
}
