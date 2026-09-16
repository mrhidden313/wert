import { redirect } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('admin_session');

	// 1. Guard Administrative API Routes
	if (event.url.pathname.startsWith('/api')) {
		const isPublicOrIndependentlySecured = 
			event.url.pathname.startsWith('/api/subscription') || 
			event.url.pathname.startsWith('/api/cron');

		if (!isPublicOrIndependentlySecured) {
			if (!sessionId) {
				return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Session missing' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			const validPayload = verifySession(sessionId);
			if (!validPayload) {
				event.cookies.delete('admin_session', { path: '/' });
				return new Response(JSON.stringify({ success: false, error: 'Unauthorized: Tampered or invalid session' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			event.locals.adminToken = validPayload;
			const parts = validPayload.split('|');
			event.locals.adminEmail = parts.length >= 2 ? parts[1] : 'Unknown Admin';
		}
	}

	// 2. Guard Dashboard UI Routes
	if (event.url.pathname.startsWith('/dashboard')) {
		if (!sessionId) {
			throw redirect(303, '/login');
		}
		
		// Verify cryptographic signature
		const validPayload = verifySession(sessionId);
		if (!validPayload) {
			// Hacker tampering detected or session invalid
			event.cookies.delete('admin_session', { path: '/' });
			throw redirect(303, '/login');
		}

		// Pass the token to the locals so endpoints can use it
		event.locals.adminToken = validPayload;
		
		// Extract email from payload: session|email|timestamp
		const parts = validPayload.split('|');
		if (parts.length >= 2) {
			event.locals.adminEmail = parts[1];
		} else {
			event.locals.adminEmail = 'Unknown Admin';
		}
	}

	if (event.url.pathname === '/') {
		throw redirect(303, '/dashboard');
	}

	const response = await resolve(event);

	// Enterprise Security Headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	
	// Prevent cache poisoning for sensitive routes
	if (event.url.pathname.startsWith('/dashboard') || event.url.pathname.startsWith('/api')) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	return response;
}
