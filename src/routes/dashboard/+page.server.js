import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		const chatwoot = new ChatwootAPI(locals.adminToken);
		
		// Fetch from Chatwoot
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = accountsResponse || [];
		// The API might return { payload: [...] } or just an array depending on the exact version. 
		// Usually it's an array for platform accounts or wrapped in payload.
		if (accounts.payload) accounts = accounts.payload;

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
				linkedEmail: sub.linkedEmail || 'N/A'
			};
		});

		return {
			accounts: mergedAccounts
		};
	} catch (err) {
		console.error("Dashboard Load Error:", err);
		return { accounts: [], error: 'Failed to load accounts.' };
	}
}

export const actions = {
	suspend: async ({ request, locals }) => {
		const data = await request.formData();
		const accountId = data.get('accountId');
		
		try {
			const chatwoot = new ChatwootAPI(locals.adminToken);
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
			const chatwoot = new ChatwootAPI(locals.adminToken);
			await chatwoot.reactivateAccount(accountId);
			await FirebaseAdmin.updateSubscription(accountId, { status: 'active', planType, daysRemaining: days });
			return { success: true };
		} catch (err) {
			return fail(500, { error: 'Failed to renew account' });
		}
	}
};
