import { fail } from '@sveltejs/kit';
import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';

export const actions = {
	default: async ({ request, locals }) => {
		const data = await request.formData();
		const companyName = data.get('companyName');
		const email = data.get('email');
		const password = data.get('password');
		const phoneNumber = data.get('phoneNumber');
		const planType = data.get('planType');
		const daysRemaining = parseInt(data.get('daysRemaining') || '0', 10);

		if (!companyName || !email || !password) {
			return fail(400, { error: 'Company Name, Email, and Password are required.' });
		}

		try {
			// 1. Initialize API with the logged-in super admin token
			const chatwoot = new ChatwootAPI();

			// 2. Create the Account and the User in Chatwoot seamlessly
			const accountResult = await chatwoot.createAccount(companyName, email, password);
			const accountId = accountResult.id;

			// 3. Set the "Allow All" limits in Chatwoot
			await chatwoot.updateAccountPlanLimits(accountId, planType);

			// 4. Create the Subscription record in Firebase for the Agent-Lite app to read
			await FirebaseAdmin.updateSubscription(accountId, {
				linkedEmail: email.toLowerCase(),
				phoneNumber: phoneNumber || '',
				planType: planType,
				daysRemaining: daysRemaining,
				status: 'active'
			});

			return { success: true, accountId: accountId };

		} catch (err) {
			console.error("Failed to build account:", err);
			return fail(500, { error: err.message || 'Failed to communicate with Chatwoot or Firebase. Check server logs.' });
		}
	}
};
