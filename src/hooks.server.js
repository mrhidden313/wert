import { redirect } from '@sveltejs/kit';

export async function handle({ event, resolve }) {
	const sessionId = event.cookies.get('admin_session');

	if (event.url.pathname.startsWith('/dashboard')) {
		if (!sessionId) {
			throw redirect(303, '/login');
		}
		// Pass the token to the locals so endpoints can use it
		event.locals.adminToken = sessionId;
	}

	if (event.url.pathname === '/') {
		throw redirect(303, '/dashboard');
	}

	return resolve(event);
}
