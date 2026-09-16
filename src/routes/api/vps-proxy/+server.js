import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export async function GET({ url, cookies, fetch }) {
	// Require Admin Session
	if (!cookies.get('admin_session')) {
		throw error(401, 'Unauthorized');
	}

	const vpsIp = url.searchParams.get('ip');
	const action = url.searchParams.get('action'); // 'ls', 'download', 'storage', 'size', 'scan'
	const path = url.searchParams.get('path') || '/';

	if (!vpsIp || !action) {
		throw error(400, 'Missing vpsIp or action parameters');
	}

	// 1. Strict IP Whitelisting (Neutralize SSRF)
	const ALLOWED_VPS_IPS = [
		'69.169.103.35',   // Production VPS
		'163.245.192.11',  // Testing VPS
		'127.0.0.1', 
		'localhost'
	];
	if (env.ALLOWED_VPS_IPS) {
		const extra = env.ALLOWED_VPS_IPS.split(',').map(s => s.trim()).filter(Boolean);
		ALLOWED_VPS_IPS.push(...extra);
	}

	if (!ALLOWED_VPS_IPS.includes(vpsIp)) {
		throw error(403, `Forbidden: Target IP '${vpsIp}' is not in the approved VPS whitelist.`);
	}

	// Read the ADMIN_PASSWORD from Vercel's env to authenticate with the VPS bot
	const adminPassword = env.ADMIN_PASSWORD;

	if (!adminPassword) {
		throw error(500, 'ADMIN_PASSWORD environment variable is not configured');
	}

	// 2. Generate 30-Second Cryptographic HMAC-SHA256 Token
	const timestamp = Date.now();
	const hmacSignature = crypto.createHmac('sha256', adminPassword).update(String(timestamp)).digest('hex');
	const hmacAuthHeader = `HMAC:${timestamp}:${hmacSignature}`;

	// [God Mode Live Task Manager] Action: 'top'
	if (action === 'top') {
		try {
			const res = await fetch(`http://${vpsIp}:8080/api/top`, {
				method: 'GET',
				headers: { 'Authorization': hmacAuthHeader }
			});
			if (res.ok) {
				const data = await res.json();
				return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
		} catch (e) {
			// Fallback to bridge
		}
		try {
			const bridgeSecret = env.INSTANTFLOW_ADMIN_SECRET;
			if (!bridgeSecret && process.env.NODE_ENV === 'production') {
				throw error(500, 'FATAL: INSTANTFLOW_ADMIN_SECRET is missing in production');
			}
			const bridgeRes = await fetch('https://api.instantflow.online/super_admin/bridge/server_health', {
				method: 'GET',
				headers: { 'X-Admin-Secret': bridgeSecret || 'dev_secret_only_local' }
			});
			if (bridgeRes.ok) {
				const data = await bridgeRes.json();
				return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
			}
		} catch (e) {
			// ignore
		}
		return new Response(JSON.stringify({
			error: 'Live process feed unavailable on port 8080 or bridge endpoint.'
		}), { status: 502, headers: { 'Content-Type': 'application/json' } });
	}

	// Construct the URL to the VPS bot
	const targetUrl = `http://${vpsIp}:8080/api/${action}?path=${encodeURIComponent(path)}`;

	try {
		const response = await fetch(targetUrl, {
			method: 'GET',
			headers: {
				'Authorization': hmacAuthHeader
			}
		});

		if (action === 'download') {
			// For downloads, we pipe the stream back to the browser
			return new Response(response.body, {
				status: response.status,
				headers: {
					'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
					'Content-Disposition': response.headers.get('content-disposition') || `attachment; filename="download"`
				}
			});
		}

		// For ls, we just return the JSON
		const data = await response.json();
		return new Response(JSON.stringify(data), {
			status: response.status,
			headers: {
				'Content-Type': 'application/json'
			}
		});

	} catch (err) {
		throw error(502, `Failed to connect to VPS at ${vpsIp}:8080. Ensure the bot is running.`);
	}
}
