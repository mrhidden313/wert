import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		const chatwoot = new ChatwootAPI();
		
		// Fetch from Chatwoot Bridge
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = [];
		if (accountsResponse && accountsResponse.accounts) {
			accounts = accountsResponse.accounts;
		} else if (Array.isArray(accountsResponse)) {
			accounts = accountsResponse;
		} else if (accountsResponse.payload) {
			accounts = accountsResponse.payload;
		}

		// Fetch from Firebase
		const subscriptions = await FirebaseAdmin.getAllSubscriptions();

		// Merge data
		const mergedAccounts = accounts.map(acc => {
			let sub = subscriptions[acc.id];
			
			// Fallback: If no direct ID match, search by linkedEmail (for old Firestore documents)
			if (!sub && acc.admin_email) {
				const matchingSubKey = Object.keys(subscriptions).find(key => 
					subscriptions[key].linkedEmail === acc.admin_email
				);
				if (matchingSubKey) {
					sub = subscriptions[matchingSubKey];
				}
			}
			
			sub = sub || {};
			
			return {
				id: acc.id,
				name: acc.name,
				status: acc.status || 'active', // active or suspended
				planType: sub.planType || 'Unknown',
				daysRemaining: sub.daysRemaining || 0,
				freeze: sub.freeze || false,
				linkedEmail: acc.admin_email || sub.linkedEmail || 'N/A' // Use Chatwoot admin email if available
			};
		});

		return {
			accounts: mergedAccounts
		};
	} catch (err) {
		console.error("Dashboard Load Error:", err);
		return { accounts: [], error: `Failed: ${err.message || err.toString()}` };
	}
}

export const actions = {
	suspend: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.suspendAccount(accountId);
			await FirebaseAdmin.updateSubscription(accountId, { status: 'suspended', daysRemaining: 0 });
			return { success: true };
		} catch (err) {
			return fail(500, { error: 'Failed to suspend account' });
		}
	},
	
	renew: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const planType = data.get('planType');
		const days = parseInt(data.get('daysRemaining') || '30', 10);
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.reactivateAccount(accountId);
			await FirebaseAdmin.updateSubscription(accountId, { status: 'active', planType, daysRemaining: days });
			return { success: true };
		} catch (err) {
			return fail(500, { error: 'Failed to renew account' });
		}
	},

	refreshDays: async ({ request }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const daysToAdd = parseInt(data.get('days') || '30', 10);
		const note = data.get('note') || '';

		try {
			const sub = await FirebaseAdmin.getSubscription(accountId);
			const currentDays = sub?.daysRemaining || 0;
			const newDays = currentDays + daysToAdd;

			const historyEntry = {
				date: new Date().toISOString(),
				action: `Added ${daysToAdd} days`,
				admin: 'Admin',
				notes: note,
				type: 'days_added'
			};

			const { FieldValue } = await import('firebase-admin/firestore');
			const { db } = await import('$lib/server/firebase');
			const docRef = db.collection('subscriptions').doc(String(accountId));
			await docRef.set({
				daysRemaining: newDays,
				history: FieldValue.arrayUnion(historyEntry),
				updatedAt: new Date().toISOString()
			}, { merge: true });

			return { success: true };
		} catch (err) {
			console.error("Failed to refresh days", err);
			return fail(500, { error: 'Failed to refresh days' });
		}
	},

	toggleFreeze: async ({ request }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const freeze = data.get('freeze') === 'true';

		try {
			await FirebaseAdmin.updateSubscription(accountId, { freeze });
			return { success: true };
		} catch (err) {
			console.error("Failed to toggle freeze", err);
			return fail(500, { error: 'Failed to freeze/unfreeze' });
		}
	},

	destroy: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.destroyAccount(accountId);
			return { success: true };
		} catch (err) {
			console.error("Failed to destroy account", err);
			return fail(500, { error: 'Failed to destroy account. Check logs.' });
		}
	}
};
