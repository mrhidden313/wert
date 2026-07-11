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

	// -------------------------------------------------------------------------
	// GLOBAL AUDIT LOGS
	// -------------------------------------------------------------------------

	static async addAuditLog(adminEmail, action, details) {
		const docRef = db.collection('global_audit_logs').doc();
		await docRef.set({
			adminEmail,
			action,
			details,
			timestamp: new Date().toISOString()
		});
	}

	static async getAuditLogs() {
		const snapshot = await db.collection('global_audit_logs').orderBy('timestamp', 'desc').limit(200).get();
		const logs = [];
		snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
		return logs;
	}

	// -------------------------------------------------------------------------
	// ADMIN COMMISSION LEDGER
	// -------------------------------------------------------------------------

	static async getAdminLedger() {
		const docRef = db.collection('system').doc('admin_ledger');
		const doc = await docRef.get();
		if (!doc.exists) {
			return { entries: [] };
		}
		return doc.data();
	}

	static async updateAdminLedger(data) {
		const docRef = db.collection('system').doc('admin_ledger');
		await docRef.set({
			...data,
			updatedAt: new Date().toISOString()
		}, { merge: true });
	}

	// -------------------------------------------------------------------------
	// ADMIN PROFILES & NETWORTH (OLD LEDGER)
	// -------------------------------------------------------------------------

	static async getAdminProfiles() {
		const snapshot = await db.collection('admin_profiles').get();
		const profiles = {};
		snapshot.forEach(doc => {
			profiles[doc.id] = { id: doc.id, ...doc.data() };
		});
		return profiles;
	}

	static async getAdminProfile(adminEmail) {
		const docRef = db.collection('admin_profiles').doc(adminEmail);
		const doc = await docRef.get();
		if (!doc.exists) {
			// Initialize if doesn't exist
			await docRef.set({ email: adminEmail, networth: 0, totalPaid: 0, history: [] });
			return { email: adminEmail, networth: 0, totalPaid: 0, history: [] };
		}
		const data = doc.data();
		if (data.totalPaid === undefined) data.totalPaid = 0;
		return { id: doc.id, ...data };
	}

	static async updateAdminNetworth(adminEmail, amount, type = 'add', note = '', addedBy = 'System', txId = '') {
		const docRef = db.collection('admin_profiles').doc(adminEmail);
		const { FieldValue } = await import('firebase-admin/firestore');
		
		const doc = await docRef.get();
		const current = doc.exists ? (doc.data().networth || 0) : 0;
		const newNetworth = type === 'add' ? current + amount : Math.max(0, current - amount);

		const historyEntry = {
			id: Date.now().toString(),
			date: new Date().toISOString(),
			amount: type === 'add' ? amount : -amount,
			note,
			addedBy,
			txId,
			type
		};

		await docRef.set({
			email: adminEmail,
			networth: newNetworth,
			history: FieldValue.arrayUnion(historyEntry),
			updatedAt: new Date().toISOString()
		}, { merge: true });
	}

	static async payAdmin(adminEmail, amount, note, addedBy) {
		const docRef = db.collection('admin_profiles').doc(adminEmail);
		const { FieldValue } = await import('firebase-admin/firestore');
		
		const doc = await docRef.get();
		const currentPaid = doc.exists ? (doc.data().totalPaid || 0) : 0;
		
		const historyEntry = {
			id: Date.now().toString(),
			date: new Date().toISOString(),
			amount: amount, // Positive amount to indicate what was paid
			note: `Paid: ${note}`,
			addedBy,
			type: 'pay'
		};

		await docRef.set({
			email: adminEmail,
			totalPaid: currentPaid + amount,
			history: FieldValue.arrayUnion(historyEntry),
			updatedAt: new Date().toISOString()
		}, { merge: true });
	}

	static async editNetworth(adminEmail, newNetworth, addedBy) {
		const docRef = db.collection('admin_profiles').doc(adminEmail);
		const { FieldValue } = await import('firebase-admin/firestore');
		
		const historyEntry = {
			id: Date.now().toString(),
			date: new Date().toISOString(),
			amount: newNetworth,
			note: `Networth adjusted manually to Rs ${newNetworth}`,
			addedBy,
			type: 'edit'
		};

		await docRef.set({
			email: adminEmail,
			networth: newNetworth,
			history: FieldValue.arrayUnion(historyEntry),
			updatedAt: new Date().toISOString()
		}, { merge: true });
	}

	// -------------------------------------------------------------------------
	// PENDING APPROVALS
	// -------------------------------------------------------------------------

	static async getPendingApprovals() {
		const snapshot = await db.collection('pending_approvals').orderBy('timestamp', 'desc').get();
		const approvals = [];
		snapshot.forEach(doc => approvals.push({ id: doc.id, ...doc.data() }));
		return approvals;
	}

	static async addPendingApproval(senderEmail, receiverEmail, amount, note, txId = '') {
		const docRef = db.collection('pending_approvals').doc();
		await docRef.set({
			senderEmail,
			receiverEmail,
			amount,
			note,
			txId,
			timestamp: new Date().toISOString()
		});
	}

	static async deletePendingApproval(id) {
		await db.collection('pending_approvals').doc(id).delete();
	}

	// -------------------------------------------------------------------------
	// GLOBAL EXPENSES (APPLICATION FEES)
	// -------------------------------------------------------------------------

	static async getExpenses() {
		const snapshot = await db.collection('global_expenses').orderBy('timestamp', 'desc').get();
		const expenses = [];
		snapshot.forEach(doc => expenses.push({ id: doc.id, ...doc.data() }));
		return expenses;
	}

	static async addExpense(adminEmail, amount, note, category = 'VPS') {
		const docRef = db.collection('global_expenses').doc();
		await docRef.set({
			adminEmail,
			amount,
			note,
			category,
			timestamp: new Date().toISOString()
		});
	}
}

export { db };
