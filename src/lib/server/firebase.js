import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';

// In production, the service account JSON should be stored in an environment variable
// CHATWOOT_FIREBASE_SERVICE_ACCOUNT as a stringified JSON.
function initFirebase() {
	if (getApps().length === 0) {
		try {
			const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
			if (Object.keys(serviceAccount).length > 0) {
				initializeApp({
					credential: cert(serviceAccount)
				});
			} else {
				console.warn("Firebase Service Account JSON is missing in environment variables.");
				// Fallback to default if running in GCP environment, otherwise will throw on usage
				initializeApp();
			}
		} catch (error) {
			console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", error);
		}
	}
	return getFirestore();
}

const db = initFirebase();

export class FirebaseAdmin {
	/**
	 * Creates or updates a user's subscription plan in Firestore.
	 * Using the exact schema agent-lite expects: linkedEmail, phoneNumber, planType, daysRemaining.
	 * 
	 * @param {string} accountId The Chatwoot account ID (used as Document ID for uniqueness)
	 * @param {Object} data 
	 * @param {string} data.linkedEmail
	 * @param {string} [data.phoneNumber]
	 * @param {string} data.planType "Basic", "Premium", etc.
	 * @param {number} data.daysRemaining How many days left in the plan
	 * @param {string} data.status "active", "expired", "suspended"
	 */
	static async updateSubscription(accountId, data) {
		const docRef = db.collection('subscriptions').doc(String(accountId));
		
		const payload = {
			...data,
			updatedAt: new Date().toISOString()
		};
		
		await docRef.set(payload, { merge: true });
		return payload;
	}

	/**
	 * Fetches all subscriptions to display in the admin dashboard.
	 */
	static async getAllSubscriptions() {
		const snapshot = await db.collection('subscriptions').get();
		const subs = {};
		snapshot.forEach(doc => {
			subs[doc.id] = doc.data();
		});
		return subs;
	}

	/**
	 * Fetches a single subscription by Chatwoot account ID
	 */
	static async getSubscription(accountId) {
		const docRef = db.collection('subscriptions').doc(String(accountId));
		const doc = await docRef.get();
		return doc.exists ? doc.data() : null;
	}

	/**
	 * Deletes a subscription document by its Document ID.
	 * Used to clean up old stray documents with random IDs during migration.
	 */
	static async deleteSubscription(docId) {
		await db.collection('subscriptions').doc(String(docId)).delete();
	}
}

export { db };
