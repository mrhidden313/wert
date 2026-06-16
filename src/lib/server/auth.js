import crypto from 'crypto';
import { env } from '$env/dynamic/private';

// In a real production app, use a dedicated random 64-char hex string in .env like SESSION_SECRET
// Fallback to hashing the ADMIN_PASSWORD if SESSION_SECRET isn't set, ensuring it's always stable and unique per deployment.
function getSecret() {
	if (env.SESSION_SECRET) return env.SESSION_SECRET;
	if (env.ADMIN_PASSWORD) {
		return crypto.createHash('sha256').update(env.ADMIN_PASSWORD + (env.ADMIN_EMAIL || '')).digest('hex');
	}
	// Absolute fallback (will invalidate sessions on restart, but secure)
	return crypto.randomBytes(32).toString('hex');
}

const SECRET = getSecret();

/**
 * Signs a payload string and returns payload.signature
 * @param {string} payload 
 * @returns {string} Signed string
 */
export function signSession(payload) {
	const hmac = crypto.createHmac('sha256', SECRET);
	hmac.update(payload);
	const signature = hmac.digest('hex');
	return `${payload}.${signature}`;
}

/**
 * Verifies a signed session string.
 * @param {string} signedPayload 
 * @returns {string|null} The original payload if valid, null if tampered or invalid.
 */
export function verifySession(signedPayload) {
	if (!signedPayload || typeof signedPayload !== 'string') return null;

	const lastDot = signedPayload.lastIndexOf('.');
	if (lastDot === -1) return null;

	const payload = signedPayload.substring(0, lastDot);
	const signature = signedPayload.substring(lastDot + 1);

	// Re-sign the payload to check
	const expectedSignature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

	// Prevent timing attacks using timingSafeEqual
	if (signature.length === expectedSignature.length) {
		if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
			return payload; // Valid!
		}
	}
	
	return null; // Tampered or invalid!
}
