import { fail, redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const email = data.get('email');
		const password = data.get('password');

		if (!email || !password) {
			return fail(400, { email, missing: true });
		}

		try {
			// Proxy login to Chatwoot to verify Super Admin credentials
			const response = await fetch('https://api.instantflow.online/auth/sign_in', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			if (!response.ok) {
				return fail(401, { email, incorrect: true });
			}

			const result = await response.json();
			const user = result.data;

			// We get the access_token from the headers or payload
			const accessToken = response.headers.get('access-token') || user.access_token;
			if (!accessToken) {
				return fail(500, { email, error: "Failed to retrieve access token from server" });
			}

			// SECURITY CHECK: Verify if the user is actually a Super Admin
			// We do this by attempting to hit a Platform API endpoint using their token.
			// Normal users or regular admins will be rejected with 401/403.
			const verifyResponse = await fetch('https://api.instantflow.online/platform/api/v1/accounts', {
				method: 'GET',
				headers: { 'api_access_token': accessToken }
			});

			if (!verifyResponse.ok) {
				// The user is not a Super Admin. They might be a regular user.
				return fail(403, { email, error: "Access Denied: You are not a Super Admin." });
			}

			// If the check passes, they are a genuine Super Admin.
			cookies.set('admin_session', accessToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'strict',
				secure: process.env.NODE_ENV === 'production',
				maxAge: 60 * 60 * 24 * 7 // 1 week
			});

		} catch (err) {
			console.error("Login Proxy Error:", err);
			return fail(500, { email, error: "Internal server error connecting to Chatwoot" });
		}

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
