import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const adminEmail = params.id;
	const currentAdminEmail = locals.adminEmail || 'Unknown';
	const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');

	try {
		const profile = await FirebaseAdmin.getAdminProfile(adminEmail);
		const allLedgers = await FirebaseAdmin.getAdminLedger();
		// Match by either adminEmail (new format) or adminName (old test data)
		const nameFallback = adminEmail.toLowerCase().includes('uzair') ? 'Uzair' : 'MrHidden';
		const adminLedger = (allLedgers.entries || []).filter(e => e.adminEmail === adminEmail || e.adminName === nameFallback);

		return { profile, adminLedger, rawLedger: allLedgers.entries, isMasterAdmin };
	} catch (err) {
		console.error("Admin Profile Load Error:", err);
		return { profile: { email: adminEmail, networth: 0, history: [] }, adminLedger: [], isMasterAdmin: false, error: 'Failed to load admin profile' };
	}
}

export const actions = {
	addMoney: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const note = data.get('note') || '';
		const txId = data.get('txId') || '';
		const receiverEmail = params.id;
		const senderEmail = locals.adminEmail || 'Unknown';

		if (amount <= 0) {
			return fail(400, { error: 'Amount must be greater than 0' });
		}

		try {
			// Always create a pending approval for the receiver
			await FirebaseAdmin.addPendingApproval(senderEmail, receiverEmail, amount, note, txId);
			await FirebaseAdmin.addAuditLog(senderEmail, 'Request Transfer', `Requested to add ${amount} to ${receiverEmail}'s networth`);
			
			return { success: true, message: `Transfer requested! ${receiverEmail} must approve it.` };
		} catch (err) {
			console.error('Failed to add money', err);
			return fail(500, { error: 'Failed to request transfer' });
		}
	},

	addCommission: async ({ request, params, locals }) => {
		const data = await request.formData();
		const title = data.get('title');
		const amount = parseInt(data.get('amount') || '0', 10);
		const receiverEmail = params.id;
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = ledgerData.entries || [];
			
			entries.push({
				id: Date.now().toString(),
				adminEmail: receiverEmail,
				title,
				totalAmount: amount,
				paidAmount: 0,
				remainingAmount: amount,
				status: 'pending',
				createdAt: new Date().toISOString(),
				history: []
			});
			
			await FirebaseAdmin.updateAdminLedger({ entries });
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Add Commission', `Added ${amount} pending commission for ${receiverEmail}`);
			return { success: true, message: 'Commission added successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to add commission' });
		}
	},

	payCommission: async ({ request, locals }) => {
		const data = await request.formData();
		const entryId = data.get('entryId');
		const amountToPay = parseInt(data.get('amount') || '0', 10);
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = ledgerData.entries || [];
			const entryIdx = entries.findIndex(e => e.id === entryId);
			
			if (entryIdx === -1) return fail(404, { error: 'Entry not found' });
			
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
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Pay Commission', `Paid ${actualPayment} for entry ${entryId}`);
			return { success: true, message: 'Payment recorded successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to pay commission' });
		}
	},

	deleteCommission: async ({ request, locals }) => {
		const data = await request.formData();
		const entryId = data.get('entryId');
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail === 'mrhidden313@gmail.com' || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		try {
			const ledgerData = await FirebaseAdmin.getAdminLedger();
			const entries = (ledgerData.entries || []).filter(e => e.id !== entryId);
			
			await FirebaseAdmin.updateAdminLedger({ entries });
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Delete Commission', `Deleted commission entry ${entryId}`);
			return { success: true, message: 'Entry deleted successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to delete commission' });
		}
	}
};
