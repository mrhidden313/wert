import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ params, locals }) {
	const adminEmail = params.id;
	const currentAdminEmail = locals.adminEmail || 'Unknown';
	const isMasterAdmin = currentAdminEmail.toLowerCase().includes('mrhidden') || currentAdminEmail.toLowerCase().includes('salar');

	try {
		const profile = await FirebaseAdmin.getAdminProfile(adminEmail);
		return { profile, isMasterAdmin };
	} catch (err) {
		console.error("Admin Profile Load Error:", err);
		return { profile: { email: adminEmail, networth: 0, totalPaid: 0, history: [] }, isMasterAdmin: false, error: 'Failed to load admin profile' };
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
			await FirebaseAdmin.addPendingApproval(senderEmail, receiverEmail, amount, note, txId);
			await FirebaseAdmin.addAuditLog(senderEmail, 'Request Transfer', `Requested to add ${amount} to ${receiverEmail}'s networth`);
			return { success: true, message: `Transfer requested! ${receiverEmail} must approve it.` };
		} catch (err) {
			console.error('Failed to add money', err);
			return fail(500, { error: 'Failed to request transfer' });
		}
	},

	payAdmin: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const note = data.get('note') || '';
		const receiverEmail = params.id;
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail.toLowerCase().includes('mrhidden') || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });

		try {
			await FirebaseAdmin.payAdmin(receiverEmail, amount, note, currentAdminEmail);
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Pay Admin', `Paid ${amount} to ${receiverEmail}`);
			return { success: true, message: 'Payment recorded successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to record payment' });
		}
	},

	editNetworth: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const receiverEmail = params.id;
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = currentAdminEmail.toLowerCase().includes('mrhidden') || currentAdminEmail.toLowerCase().includes('salar');
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		if (amount < 0) return fail(400, { error: 'Amount cannot be negative' });

		try {
			await FirebaseAdmin.editNetworth(receiverEmail, amount, currentAdminEmail);
			await FirebaseAdmin.addAuditLog(currentAdminEmail, 'Edit Networth', `Edited networth of ${receiverEmail} to ${amount}`);
			return { success: true, message: 'Networth overridden successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to edit networth' });
		}
	}
};
