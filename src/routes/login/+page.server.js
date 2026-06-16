import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (!email || !password) {
			return fail(400, { email, missing: true });
		}

		// Use Environment Variables for Super Admin authentication
		const expectedEmail = env.ADMIN_EMAIL;
		const expectedPassword = env.ADMIN_PASSWORD;

		if (!expectedEmail || !expectedPassword) {
			console.error("ADMIN_EMAIL or ADMIN_PASSWORD is not set in environment variables!");
			return fail(500, { email, error: "Server Configuration Error: Admin credentials not set in Vercel." });
		}

		if (email !== expectedEmail || password !== expectedPassword) {
			return fail(401, { email, incorrect: true, error: "Access Denied: Invalid Email or Password." });
		}

		// If credentials match, generate a simple secure session token
		// (In a real app this could be a JWT, but for a single admin, a static string or random UUID is fine, 
		// because the backend only relies on the Chatwoot Platform Token for API calls)
		const sessionToken = "super-admin-session-token-" + Date.now();

		cookies.set('admin_session', sessionToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 1 week
		});

		throw redirect(303, '/dashboard');
	}
};

export function load({ cookies }) {
	// If already logged in, redirect to dashboard
	if (cookies.get('admin_session')) {
		throw redirect(303, '/dashboard');
	}
	return {};
}
