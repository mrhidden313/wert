import { FirebaseAdmin } from '$lib/server/firebase';
import { ChatwootAPI } from '$lib/server/chatwoot';

export async function load() {
	try {
		const chatwoot = new ChatwootAPI();
		let accounts = [];
		const accResp = await chatwoot.listAccounts();
		if (accResp && accResp.accounts) accounts = accResp.accounts;

		const subscriptions = await FirebaseAdmin.getAllSubscriptions();
		
		const billingAccounts = [];
		
		for (const [key, sub] of Object.entries(subscriptions)) {
			let totalRemaining = 0;
			
			if (sub.startup_fee && sub.startup_fee.remaining > 0) {
				totalRemaining += sub.startup_fee.remaining;
			}
			if (sub.pending_fees) {
				sub.pending_fees.forEach(f => {
					if (f.remaining > 0) totalRemaining += f.remaining;
				});
			}
			
			if (totalRemaining > 0) {
				const acc = accounts.find(a => String(a.id) === String(key)) || {};
				billingAccounts.push({
					id: key,
					name: acc.name || 'Unknown',
					linkedEmail: sub.linkedEmail || acc.admin_email || 'N/A',
					startup_remaining: sub.startup_fee ? sub.startup_fee.remaining : 0,
					pending_fees: sub.pending_fees || [],
					total_due: totalRemaining
				});
			}
		}
		
		return { billingAccounts };
	} catch (e) {
		return { billingAccounts: [], error: e.message };
	}
}
