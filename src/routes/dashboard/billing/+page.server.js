import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';

export async function load({ locals }) {
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

		// Admin Ledger specific logic
		const adminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = adminEmail === 'mrhidden313@gmail.com' || adminEmail.toLowerCase().includes('salar');
		const adminLedger = await FirebaseAdmin.getAdminLedger();

		return {
			billingAccounts,
			analytics,
			adminLedger: adminLedger.entries || [],
			isMasterAdmin
		};
	} catch (err) {
		console.error("Billing Load Error:", err);
		return { billingAccounts: [], analytics: {}, adminLedger: [], isMasterAdmin: false, error: 'Failed to load billing data' };
	}
}

export const actions = {
	addCommission: async ({ request, locals }) => {
		const data = await request.formData();
		const adminName = data.get('adminName');
		const title = data.get('title');
		const amount = parseInt(data.get('amount') || '0', 10);
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return { error: 'Unauthorized' };

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = ledgerData.entries || [];
			
			entries.push({
				id: Date.now().toString(),
				adminName,
				title,
				totalAmount: amount,
				paidAmount: 0,
				remainingAmount: amount,
				status: 'pending',
				createdAt: new Date().toISOString(),
				history: []
			});
			
			await FirebaseAdmin.updateAdminLedger({ entries });
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Add Commission', `Added ${amount} commission for ${adminName}`);
			return { success: true };
		} catch (err) {
			console.error(err);
			return { error: 'Failed to add commission' };
		}
	},

	payCommission: async ({ request, locals }) => {
		const data = await request.formData();
		const entryId = data.get('entryId');
		const amountToPay = parseInt(data.get('amount') || '0', 10);
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return { error: 'Unauthorized' };

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = ledgerData.entries || [];
			const entryIdx = entries.findIndex(e => e.id === entryId);
			
			if (entryIdx === -1) return { error: 'Entry not found' };
			
			const entry = entries[entryIdx];
			const actualPayment = Math.min(amountToPay, entry.remainingAmount);
			
			entry.paidAmount += actualPayment;
			entry.remainingAmount -= actualPayment;
			if (entry.remainingAmount <= 0) entry.status = 'paid';
			
			entry.history.push({
				date: new Date().toISOString(),
				amount: actualPayment,
				note: `Paid ${actualPayment}`
			});
			
			await FirebaseAdmin.updateAdminLedger({ entries });
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Pay Commission', `Paid ${actualPayment} to ${entry.adminName}`);
			return { success: true };
		} catch (err) {
			console.error(err);
			return { error: 'Failed to pay commission' };
		}
	},

	deleteCommission: async ({ request, locals }) => {
		const data = await request.formData();
		const entryId = data.get('entryId');
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return { error: 'Unauthorized' };

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = (ledgerData.entries || []).filter(e => e.id !== entryId);
			
			await FirebaseAdmin.updateAdminLedger({ entries });
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Delete Commission', `Deleted commission entry ${entryId}`);
			return { success: true };
		} catch (err) {
			console.error(err);
			return { error: 'Failed to delete commission' };
		}
	}
};
