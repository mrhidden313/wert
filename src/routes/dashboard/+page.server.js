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
				linkedEmail: acc.admin_email || sub.linkedEmail || 'N/A', // Use Chatwoot admin email if available
				labelColor: sub.labelColor || 'gray'
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
		const adminEmail = locals.adminEmail || 'Unknown';
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.suspendAccount(accountId);
			await FirebaseAdmin.updateSubscription(accountId, { status: 'suspended', daysRemaining: 0 });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Suspend Account', `Suspended account ${accountId} from main dashboard`);
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
		const adminEmail = locals.adminEmail || 'Unknown';
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.reactivateAccount(accountId);
			await FirebaseAdmin.updateSubscription(accountId, { status: 'active', planType, daysRemaining: days });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Renew Account', `Renewed account ${accountId} from main dashboard`);
			return { success: true };
		} catch (err) {
			return fail(500, { error: 'Failed to renew account' });
		}
	},

	refreshDays: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const daysToAdd = parseInt(data.get('days') || '30', 10);
		const note = data.get('note') || '';
		const planType = data.get('planType');
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			const sub = await FirebaseAdmin.getSubscription(accountId);
			const currentDays = sub?.daysRemaining || 0;
			const newDays = currentDays + daysToAdd;

			const historyEntry = {
				date: new Date().toISOString(),
				action: `Added ${daysToAdd} days`,
				admin: adminEmail,
				notes: note,
				type: 'days_added'
			};

			const { FieldValue } = await import('firebase-admin/firestore');
			const { db } = await import('$lib/server/firebase');
			const docRef = db.collection('subscriptions').doc(String(accountId));
			
			const updateData = {
				daysRemaining: newDays,
				history: FieldValue.arrayUnion(historyEntry),
				updatedAt: new Date().toISOString()
			};
			if (planType) {
				updateData.planType = planType;
			}
			
			await docRef.set(updateData, { merge: true });

			await FirebaseAdmin.addAuditLog(adminEmail, 'Refresh Days', `Added ${daysToAdd} days to account ${accountId}`);
			return { success: true };
		} catch (err) {
			console.error("Failed to refresh days", err);
			return fail(500, { error: 'Failed to refresh days' });
		}
	},

	updatePlan: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const planType = data.get('planType');
		const adminEmail = locals.adminEmail || 'Unknown';
		
		try {
			await FirebaseAdmin.updateSubscription(accountId, { planType });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Update Plan', `Changed plan to ${planType} for account ${accountId}`);
			return { success: true };
		} catch (err) {
			console.error("Failed to update plan", err);
			return fail(500, { error: 'Failed to update plan' });
		}
	},

	toggleFreeze: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const freeze = data.get('freeze') === 'true';
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			await FirebaseAdmin.updateSubscription(accountId, { freeze });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Toggle Freeze', `${freeze ? 'Froze' : 'Unfroze'} account ${accountId} from main dashboard`);
			return { success: true };
		} catch (err) {
			console.error("Failed to toggle freeze", err);
			return fail(500, { error: 'Failed to freeze/unfreeze' });
		}
	},

	destroy: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		const adminEmail = locals.adminEmail || 'Unknown';
		
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.destroyAccount(accountId);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Destroy Account', `Destroyed account ${accountId} from main dashboard`);
			return { success: true };
		} catch (err) {
			console.error("Failed to destroy account", err);
			return fail(500, { error: 'Failed to destroy account. Check logs.' });
		}
	}
};
