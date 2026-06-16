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
			const sub = subscriptions[acc.id] || {};
			return {
				id: acc.id,
				name: acc.name,
				status: acc.status || 'active', // active or suspended
				planType: sub.planType || 'Unknown',
				daysRemaining: sub.daysRemaining || 0,
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
