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
				phoneNumber: subscription.phoneNumber || 'N/A',
				startup_fee: subscription.startup_fee || null,
				monthly_fee_amount: subscription.monthly_fee_amount || 0,
				pending_fees: subscription.pending_fees || [],
				history: subscription.history || []
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
			// Find old document if it exists to delete it (cleanup random IDs)
			const allSubs = await FirebaseAdmin.getAllSubscriptions();
			const matchingSubKey = Object.keys(allSubs).find(key => 
				key !== String(accountId) && allSubs[key].linkedEmail === linkedEmail
			);
			
			if (matchingSubKey) {
				await FirebaseAdmin.deleteSubscription(matchingSubKey);
				console.log(`Deleted old subscription doc: ${matchingSubKey} for email ${linkedEmail}`);
			}

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
	},

	setStartupFee: async ({ request, params }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		try {
			await FirebaseAdmin.updateSubscription(params.id, {
				startup_fee: { amount, paid: 0, remaining: amount }
			});
			return { success: true, message: 'Startup fee set!' };
		} catch (err) {
			return fail(500, { error: 'Failed to set startup fee' });
		}
	},
	
	addPendingFee: async ({ request, params }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const month = data.get('month') || new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
		try {
			const { FieldValue } = await import('firebase-admin/firestore');
			const { db } = await import('$lib/server/firebase');
			const docRef = db.collection('subscriptions').doc(String(params.id));
			
			const newFee = { id: Date.now().toString(), type: 'monthly', amount, remaining: amount, paid: false, month_label: month };
			await docRef.set({ pending_fees: FieldValue.arrayUnion(newFee) }, { merge: true });
			
			return { success: true, message: 'Added pending monthly fee!' };
		} catch (err) {
			return fail(500, { error: 'Failed to add monthly fee' });
		}
	},

	recordPayment: async ({ request, params }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const type = data.get('type'); // 'startup' or 'monthly'
		const feeId = data.get('feeId'); 
		const bankType = data.get('bankType') || 'Cash';
		const txId = data.get('txId') || '';
		const notes = data.get('notes') || '';
		
		try {
			const sub = await FirebaseAdmin.getSubscription(params.id);
			if (!sub) return fail(404, { error: 'Not found' });
			
			const { FieldValue } = await import('firebase-admin/firestore');
			const { db } = await import('$lib/server/firebase');
			const docRef = db.collection('subscriptions').doc(String(params.id));
			
			let updateData = {};
			
			if (type === 'startup' && sub.startup_fee) {
				const sf = sub.startup_fee;
				const newPaid = sf.paid + amount;
				const newRemaining = Math.max(0, sf.amount - newPaid);
				updateData.startup_fee = { amount: sf.amount, paid: newPaid, remaining: newRemaining };
			} else if (type === 'monthly' && sub.pending_fees) {
				const pFees = [...sub.pending_fees];
				const idx = pFees.findIndex(f => f.id === feeId);
				if (idx > -1) {
					pFees[idx].remaining = Math.max(0, pFees[idx].remaining - amount);
					if (pFees[idx].remaining === 0) pFees[idx].paid = true;
					updateData.pending_fees = pFees;
				}
			}
			
			const historyEntry = {
				date: new Date().toISOString(),
				action: `Paid ${amount} towards ${type}`,
				admin: 'Admin',
				notes: `${bankType} ${txId ? 'Tx: '+txId : ''} ${notes}`.trim(),
				type: 'payment',
				amount_paid: amount
			};
			
			updateData.history = FieldValue.arrayUnion(historyEntry);
			updateData.updatedAt = new Date().toISOString();
			
			await docRef.set(updateData, { merge: true });
			return { success: true, message: 'Payment recorded!' };
			
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to record payment' });
		}
	},

	updateLabelColor: async ({ request, params }) => {
		const data = await request.formData();
		const labelColor = data.get('labelColor') || 'gray';
		try {
			await FirebaseAdmin.updateSubscription(params.id, { labelColor });
			return { success: true, message: 'Label color updated!' };
		} catch (err) {
			return fail(500, { error: 'Failed to update label color' });
		}
	},

	suspend: async ({ params }) => {
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.suspendAccount(params.id);
			await FirebaseAdmin.updateSubscription(params.id, { status: 'suspended', daysRemaining: 0 });
			return { success: true, message: 'Account suspended.' };
		} catch (err) {
			return fail(500, { error: 'Failed to suspend account' });
		}
	},

	renew: async ({ request, params }) => {
		const data = await request.formData();
		const days = parseInt(data.get('daysRemaining') || '30', 10);
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.reactivateAccount(params.id);
			await FirebaseAdmin.updateSubscription(params.id, { status: 'active', daysRemaining: days });
			return { success: true, message: 'Account renewed.' };
		} catch (err) {
			return fail(500, { error: 'Failed to renew account' });
		}
	},

	toggleFreeze: async ({ request, params }) => {
		const data = await request.formData();
		const freeze = data.get('freeze') === 'true';
		try {
			await FirebaseAdmin.updateSubscription(params.id, { freeze });
			return { success: true, message: freeze ? 'App Frozen' : 'App Unfrozen' };
		} catch (err) {
			return fail(500, { error: 'Failed to freeze/unfreeze' });
		}
	},

	destroy: async ({ params }) => {
		try {
			const chatwoot = new ChatwootAPI();
			await chatwoot.destroyAccount(params.id);
			return { success: true, message: 'Account destroyed.' };
		} catch (err) {
			return fail(500, { error: 'Failed to destroy account' });
		}
	}
};
