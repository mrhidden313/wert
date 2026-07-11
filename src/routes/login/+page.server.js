import { fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signSession } from '$lib/server/auth';

// Simple in-memory rate limiter
const rateLimits = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
	const now = Date.now();
	const record = rateLimits.get(ip);

	if (record) {
		if (record.blockedUntil && now < record.blockedUntil) {
			return { allowed: false, remainingTimeMs: record.blockedUntil - now };
		}
		if (record.blockedUntil && now > record.blockedUntil) {
			// Unblock
			rateLimits.delete(ip);
		}
	}
	return { allowed: true };
}

function recordFailedAttempt(ip) {
	const now = Date.now();
	let record = rateLimits.get(ip) || { attempts: 0, blockedUntil: null };
	
	record.attempts += 1;
	if (record.attempts >= MAX_ATTEMPTS) {
		record.blockedUntil = now + BLOCK_DURATION_MS;
	}
	
	rateLimits.set(ip, record);
	
	// Cleanup old records periodically to prevent memory leak (simple approach)
	if (rateLimits.size > 10000) rateLimits.clear(); 
}

function clearAttempts(ip) {
	rateLimits.delete(ip);
}

export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		// Use IP for rate limiting
		const ip = getClientAddress();
		const rateLimit = checkRateLimit(ip);
		
		if (!rateLimit.allowed) {
			const waitMins = Math.ceil(rateLimit.remainingTimeMs / 60000);
			return fail(429, { 
				blocked: true, 
				unlockTime: Date.now() + rateLimit.remainingTimeMs,
				error: `Too many failed attempts. Please try again in ${waitMins} minutes.` 
			});
		}

		const data = await request.formData();
		const email = data.get('email')?.toLowerCase()?.trim();
		const password = data.get('password');

		if (!email || !password) {
			return fail(400, { email, missing: true });
		}

		// Use Environment Variables for Admin authentication
		const superAdminEmail = env.ADMIN_EMAIL || 'mrhiddenhacker313@gmail.com';
		const expectedPassword = env.ADMIN_PASSWORD;
		const uzairEmail = env.UZAIR_EMAIL;
		const uzairPassword = env.UZAIR_PASSWORD;

		if (!expectedPassword) {
			console.error("ADMIN_PASSWORD is not set in environment variables!");
			return fail(500, { email, error: "Server Configuration Error: Admin credentials not set in Vercel." });
		}

		// Verify email and password
		let isValid = false;
		if (email === superAdminEmail && password === expectedPassword) {
			isValid = true;
		} else if (uzairEmail && uzairPassword && email === uzairEmail && password === uzairPassword) {
			isValid = true;
		}

		if (!isValid) {
			recordFailedAttempt(ip);
			return fail(401, { email, incorrect: true, error: "Access Denied: Invalid Email or Password." });
		}

		// Clear attempts on success
		clearAttempts(ip);

		// If credentials match, generate a secure, cryptographically signed session token
		const payload = `session|${email}|${Date.now()}`;
		const sessionToken = signSession(payload);

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
