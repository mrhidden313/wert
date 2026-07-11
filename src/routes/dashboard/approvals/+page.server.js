import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		const allApprovals = await FirebaseAdmin.getPendingApprovals();
		// Only show approvals where the logged-in admin is the receiver
		// But Super Admin might want to see all? User said "Pending Approvals tab". 
		// Let's just pass all approvals and filter in the UI so they can see outgoing requests too.
		return { 
			approvals: allApprovals,
			currentUserEmail: locals.adminEmail || 'Unknown'
		};
	} catch (err) {
		console.error("Approvals Load Error:", err);
		return { approvals: [], currentUserEmail: locals.adminEmail, error: 'Failed to load pending approvals' };
	}
}

export const actions = {
	approve: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id');
		const receiverEmail = data.get('receiverEmail');
		const senderEmail = data.get('senderEmail');
		const amount = parseInt(data.get('amount') || '0', 10);
		const note = data.get('note') || '';
		const txId = data.get('txId') || '';
		
		const adminEmail = locals.adminEmail || 'Unknown';

		// Ensure only the receiver or Super Admin can approve it
		if (adminEmail !== receiverEmail && adminEmail !== 'mrhiddenhacker313@gmail.com') {
			return fail(403, { error: 'You are not authorized to approve this transfer.' });
		}

		try {
			// Add to Networth
			await FirebaseAdmin.updateAdminNetworth(receiverEmail, amount, 'add', `Approved: ${note}`, senderEmail, txId);
			// Delete from pending
			await FirebaseAdmin.deletePendingApproval(id);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Approve Transfer', `Approved transfer of ${amount} to ${receiverEmail}`);
			
			return { success: true, message: 'Transfer approved and added to networth.' };
		} catch (err) {
			console.error("Failed to approve", err);
			return fail(500, { error: 'Failed to approve transfer' });
		}
	},

	reject: async ({ request, locals }) => {
		const data = await request.formData();
		const id = data.get('id');
		const amount = data.get('amount');
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			await FirebaseAdmin.deletePendingApproval(id);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Reject Transfer', `Rejected transfer of ${amount}`);
			return { success: true, message: 'Transfer rejected and deleted permanently.' };
		} catch (err) {
			console.error("Failed to reject", err);
			return fail(500, { error: 'Failed to reject transfer' });
		}
	}
};
