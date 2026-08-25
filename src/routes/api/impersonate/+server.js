import { json } from '@sveltejs/kit';
import { ChatwootAPI } from '$lib/server/chatwoot';
import { env } from '$env/dynamic/private';

export async function POST({ request, locals }) {
	try {
		const { accountId } = await request.json();

		if (!accountId) {
			return json({ success: false, error: 'Account ID is required' }, { status: 400 });
		}

		const chatwoot = new ChatwootAPI();
		const response = await chatwoot.impersonateAccount(accountId);

		if (!response || !response.success || !response.auth_data) {
			return json({ 
				success: false, 
				error: response?.error || 'Failed to generate impersonation token from Chatwoot engine' 
			}, { status: 422 });
		}

		const authData = response.auth_data;
		const appBaseUrl = env.AGENT_LITE_URL || 'https://user.instantflow.online';

		// Encode authData to base64 for URL hash transfer
		const base64Data = Buffer.from(JSON.stringify(authData)).toString('base64');
		const ssoUrl = `${appBaseUrl}/auth/impersonate#data=${encodeURIComponent(base64Data)}`;

		return json({
			success: true,
			ssoUrl,
			accountName: authData.account_name,
			agentName: authData.agent_name,
			email: authData.email
		});
	} catch (error) {
		console.error('Error in /api/impersonate:', error);
		return json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
	}
}
