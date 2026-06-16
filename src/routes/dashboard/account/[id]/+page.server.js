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
		let subscription = await FirebaseAdmin.getSubscription(accountId);
		
		// Fallback for old Firestore documents using linkedEmail
		if (!subscription && account.admin_email) {
			const allSubs = await FirebaseAdmin.getAllSubscriptions();
			const matchingSubKey = Object.keys(allSubs).find(key => 
				allSubs[key].linkedEmail === account.admin_email
			);
			if (matchingSubKey) {
				subscription = allSubs[matchingSubKey];
			}
		}
		
		subscription = subscription || {};

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

export const actions = {
	resetPassword: async ({ request, params }) => {
		const data = await request.formData();
		const newPassword = data.get('newPassword');
		const accountId = params.id;

		if (!newPassword || newPassword.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters long' });
		}

		try {
			const chatwoot = new ChatwootAPI();
			const result = await chatwoot.changePassword(accountId, newPassword);
			
			if (result && result.success === false) {
				return fail(400, { error: result.error || 'Failed to update password' });
			}

			return { success: true, message: 'Password reset successfully!' };
		} catch (error) {
			console.error('Password reset error:', error);
			return fail(500, { error: 'Internal server error while resetting password' });
		}
	},

	forceLogout: async ({ params }) => {
		const accountId = params.id;

		try {
			const chatwoot = new ChatwootAPI();
			const result = await chatwoot.forceLogout(accountId);
			
			if (result && result.success === false) {
				return fail(400, { error: result.error || 'Failed to force logout' });
			}

			return { success: true, message: 'User forcefully logged out of all devices!' };
		} catch (error) {
			console.error('Force logout error:', error);
			return fail(500, { error: 'Internal server error while forcing logout' });
		}
	},

	editSubscription: async ({ request, params }) => {
		const data = await request.formData();
		const accountId = params.id;
		
		const planType = data.get('planType');
		const daysRemaining = parseInt(data.get('daysRemaining'));
		const linkedEmail = data.get('linkedEmail');
		const phoneNumber = data.get('phoneNumber');

		if (!planType || isNaN(daysRemaining) || !linkedEmail) {
			return fail(400, { error: 'Plan Type, Days Remaining, and Linked Email are required' });
		}

		try {
			// Update in Firebase (this also acts as a migration if it was stored by a random ID before)
			await FirebaseAdmin.updateSubscription(accountId, {
				planType,
				daysRemaining,
				linkedEmail,
				phoneNumber: phoneNumber || 'N/A'
			});

			return { success: true, message: 'Subscription data updated successfully in Firebase!' };
		} catch (error) {
			console.error('Edit subscription error:', error);
			return fail(500, { error: 'Internal server error while updating subscription' });
		}
	}
};
