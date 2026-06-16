import { redirect } from '@sveltejs/kit';
import { verifySession } from '$lib/server/auth';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('admin_session');

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
	if (event.url.pathname.startsWith('/dashboard')) {
		response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
		response.headers.set('Pragma', 'no-cache');
		response.headers.set('Expires', '0');
	}

	return response;
}
