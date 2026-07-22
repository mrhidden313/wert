import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load({ locals }) {
	try {
		// 1. Get Total Revenue
		const chatwoot = new ChatwootAPI();
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = accountsResponse?.accounts || [];
		
		const subscriptions = await FirebaseAdmin.getAllSubscriptions();
		let totalRevenue = 0;

		accounts.forEach(acc => {
			let sub = subscriptions[acc.id];
			if (!sub && acc.admin_email) {
				const matchingSubKey = Object.keys(subscriptions).find(key => 
					subscriptions[key].linkedEmail === acc.admin_email
				);
				if (matchingSubKey) sub = subscriptions[matchingSubKey];
			}

			const isSuspended = acc.status === 'suspended' || sub?.status === 'suspended';

			if (sub && !isSuspended) {
				const startupPaid = sub.startup_fee?.paid || 0;
				const paidFees = (sub.pending_fees || []).filter(f => f.paid === true);
				const monthlyPaid = paidFees.reduce((sum, f) => sum + f.amount, 0);
				totalRevenue += startupPaid + monthlyPaid;
			}
		});

		// 2. Get App Expenses
		const expenses = await FirebaseAdmin.getExpenses();
		const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

		// 3. Get Admin Profiles (Dynamic)
		const allProfiles = await FirebaseAdmin.getAdminProfiles();
		const profilesArray = Object.values(allProfiles);
		const adminsList = profilesArray.map(p => ({
			email: p.email,
			networth: p.networth || 0,
			paid: p.totalPaid || 0,
			pending: (p.networth || 0) - (p.totalPaid || 0)
		}));

		// 4. Get Loans
		const loans = await FirebaseAdmin.getLoans();
		const totalLoans = loans.reduce((sum, loan) => sum + loan.amount, 0);

		return {
			isMasterAdmin: true, // Show all UI to everyone
			totalRevenue,
			totalExpenses,
			totalLoans,
			loans,
			adminsList
		};
	} catch (err) {
		console.error("Finance Page Load Error:", err);
		return { error: `Failed to load finance data: ${err.message}` };
	}
}

export const actions = {
	addLoan: async ({ request, locals }) => {
		const data = await request.formData();
		const personName = data.get('personName');
		const amount = parseInt(data.get('amount') || '0', 10);
		const note = data.get('note') || '';
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = Boolean(currentAdminEmail && currentAdminEmail !== 'Unknown');
		
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });
		if (amount <= 0) return fail(400, { error: 'Amount must be greater than 0' });
		if (!personName) return fail(400, { error: 'Person name is required' });

		try {
			await FirebaseAdmin.addLoan(personName, amount, note, currentAdminEmail);
			return { success: true, message: 'Loan entry added successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to add loan' });
		}
	},

	deleteLoan: async ({ request, locals }) => {
		const data = await request.formData();
		const loanId = data.get('loanId');
		
		const currentAdminEmail = locals.adminEmail || 'Unknown';
		const isMasterAdmin = Boolean(currentAdminEmail && currentAdminEmail !== 'Unknown');
		
		if (!isMasterAdmin) return fail(403, { error: 'Unauthorized' });

		try {
			await FirebaseAdmin.deleteLoan(loanId);
			return { success: true, message: 'Loan deleted successfully' };
		} catch (err) {
			console.error(err);
			return fail(500, { error: 'Failed to delete loan' });
		}
	}
};
