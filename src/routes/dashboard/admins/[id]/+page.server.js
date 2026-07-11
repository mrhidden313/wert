import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ params }) {
	const adminEmail = params.id;
	try {
		const profile = await FirebaseAdmin.getAdminProfile(adminEmail);
		return { profile };
	} catch (err) {
		console.error("Admin Profile Load Error:", err);
		return { profile: { email: adminEmail, networth: 0, history: [] }, error: 'Failed to load admin profile' };
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
	}
};
