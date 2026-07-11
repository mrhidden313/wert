import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

export async function load() {
	try {
		const expenses = await FirebaseAdmin.getExpenses();
		return { expenses };
	} catch (err) {
		console.error("Expenses Load Error:", err);
		return { expenses: [], error: 'Failed to load expenses' };
	}
}

export const actions = {
	addExpense: async ({ request, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const note = data.get('note') || '';
		const category = data.get('category') || 'VPS';
		const adminEmail = locals.adminEmail || 'Unknown';

		if (amount <= 0) {
			return fail(400, { error: 'Amount must be greater than 0' });
		}

		try {
			await FirebaseAdmin.addExpense(adminEmail, amount, note, category);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Add Expense', `Added an app expense of ${amount} for ${category}`);
			
			return { success: true, message: 'Expense recorded successfully!' };
		} catch (err) {
			console.error('Failed to add expense', err);
			return fail(500, { error: 'Failed to record expense' });
		}
	}
};
