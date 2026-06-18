import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ url, cookies, fetch }) {
	// Require Admin Session
	if (!cookies.get('admin_session')) {
		throw error(401, 'Unauthorized');
	}

	const vpsIp = url.searchParams.get('ip');
	const action = url.searchParams.get('action'); // 'ls', 'download', 'storage', 'size'
	const path = url.searchParams.get('path') || '/';

	if (!vpsIp || !action) {
		throw error(400, 'Missing vpsIp or action parameters');
	}

	// Read the ADMIN_PASSWORD from Vercel's env to authenticate with the VPS bot
	const adminPassword = env.ADMIN_PASSWORD;

	if (!adminPassword) {
		throw error(500, 'ADMIN_PASSWORD environment variable is not configured');
	}

	// Construct the URL to the VPS bot
	const targetUrl = `http://${vpsIp}:8080/api/${action}?path=${encodeURIComponent(path)}`;

	try {
		const response = await fetch(targetUrl, {
			method: 'GET',
			headers: {
				'Authorization': adminPassword
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
