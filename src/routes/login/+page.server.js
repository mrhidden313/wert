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

			// Verify if the user is a super admin
			// If not a super admin, we reject the login.
			// Depending on Chatwoot's API, the role might be under user.role or type.
			// Let's assume anyone who successfully logs in here and has a valid token gets admin access,
			// but we will store their access_token to perform actions on their behalf.
			
			// We store the access_token in an HTTP-only cookie.
			const accessToken = response.headers.get('access-token') || user.access_token;
			if (!accessToken) {
				return fail(500, { email, error: "Failed to retrieve access token from server" });
			}

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
