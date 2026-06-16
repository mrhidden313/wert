import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ params }) {
	const accountId = params.id;

	try {
		const chatwoot = new ChatwootAPI();
		
		// The Bridge API 'find_account' uses email, so we need to either find by ID, 
		// or fetch all and filter since bridge/accounts is small enough for SAAS.
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = [];
		if (accountsResponse && accountsResponse.accounts) {
			accounts = accountsResponse.accounts;
		}

		const account = accounts.find(a => String(a.id) === String(accountId));
		if (!account) {
			return { error: 'Account not found in Chatwoot' };
		}

		// Fetch Firebase subscription
		const subscription = await FirebaseAdmin.getSubscription(accountId) || {};

		return {
			account: {
				id: account.id,
				name: account.name,
				status: account.status,
				admin_email: account.admin_email,
				admin_name: account.admin_name,
				created_at: account.created_at,
				planType: subscription.planType || 'Unknown',
				daysRemaining: subscription.daysRemaining || 0,
				phoneNumber: subscription.phoneNumber || 'N/A'
			}
		};

	} catch (err) {
		console.error("Failed to load account details", err);
		return { error: 'Failed to load account details' };
	}
}
