import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';

export async function load() {
	try {
		const chatwoot = new ChatwootAPI();
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = [];
		if (accountsResponse && accountsResponse.accounts) {
			accounts = accountsResponse.accounts;
		}

		const subscriptions = await FirebaseAdmin.getAllSubscriptions();
		let billingAccounts = [];
		
		let analytics = {
			totalRevenue: 0,
			totalPending: 0,
			totalStartupFees: 0,
			totalMonthlyFees: 0,
			paymentMethods: { Cash: 0, Bank: 0, Easypaisa: 0, Other: 0 }
		};

		accounts.forEach(acc => {
			let sub = subscriptions[acc.id];
			if (!sub && acc.admin_email) {
				const matchingSubKey = Object.keys(subscriptions).find(key => 
					subscriptions[key].linkedEmail === acc.admin_email
				);
				if (matchingSubKey) sub = subscriptions[matchingSubKey];
			}

			if (sub) {
				const startupRemaining = sub.startup_fee?.remaining || 0;
				const startupPaid = sub.startup_fee?.paid || 0;
				
				const pendingFees = (sub.pending_fees || []).filter(f => f.remaining > 0);
				const paidFees = (sub.pending_fees || []).filter(f => f.paid === true);
				
				const monthlyRemaining = pendingFees.reduce((sum, f) => sum + f.remaining, 0);
				const monthlyPaid = paidFees.reduce((sum, f) => sum + f.amount, 0);
				
				const totalDue = startupRemaining + monthlyRemaining;
				
				analytics.totalRevenue += startupPaid + monthlyPaid;
				analytics.totalPending += totalDue;
				analytics.totalStartupFees += startupPaid;
				analytics.totalMonthlyFees += monthlyPaid;
				
				// Parse history for payment methods
				if (sub.history) {
					sub.history.forEach(h => {
						if (h.type === 'payment' && h.amount_paid) {
							const notes = (h.notes || '').toLowerCase();
							if (notes.includes('easypaisa')) analytics.paymentMethods.Easypaisa += h.amount_paid;
							else if (notes.includes('bank')) analytics.paymentMethods.Bank += h.amount_paid;
							else if (notes.includes('cash')) analytics.paymentMethods.Cash += h.amount_paid;
							else analytics.paymentMethods.Other += h.amount_paid;
						}
					});
				}

				if (totalDue > 0) {
					billingAccounts.push({
						id: acc.id,
						name: acc.name,
						linkedEmail: acc.admin_email || sub.linkedEmail,
						startup_remaining: startupRemaining,
						pending_fees: pendingFees,
						total_due: totalDue
					});
				}
			}
		});

		// Sort by highest due first
		billingAccounts.sort((a, b) => b.total_due - a.total_due);

		return {
			billingAccounts,
			analytics
		};
	} catch (err) {
		console.error("Billing Load Error:", err);
		return { billingAccounts: [], analytics: {}, error: 'Failed to load billing data' };
	}
}
