import { env } from '$env/dynamic/private';

const CHATWOOT_BASE_URL = 'https://api.instantflow.online';

export class ChatwootAPI {
	/**
	 * @param {string} token Platform App Access Token or Super Admin Access Token
	 */
	constructor(token) {
		this.token = token || env.CHATWOOT_SUPERADMIN_TOKEN;
		this.headers = {
			'Content-Type': 'application/json',
			'api-access-token': this.token
		};
	}

	async _request(method, endpoint, body = null) {
		const url = `${CHATWOOT_BASE_URL}${endpoint}`;
		const options = {
			method,
			headers: this.headers
		};
		if (body) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		
		if (!response.ok) {
			let errorText = await response.text();
			console.error(`Chatwoot API Error [${method} ${endpoint}]:`, response.status, errorText);
			throw new Error(`Chatwoot API failed: ${response.status} - ${errorText.substring(0, 100)}`);
		}
		
		// Some endpoints return 204 No Content
		if (response.status === 204) return true;
		
		return await response.json();
	}

	async _bridgeRequest(method, endpoint, body = null) {
		const url = `${CHATWOOT_BASE_URL}${endpoint}`;
		// Retrieve secret from environment, default empty if not set
		const secret = env.INSTANTFLOW_ADMIN_SECRET || 'secret123';
		const options = {
			method,
			headers: {
				'Content-Type': 'application/json',
				'X-Admin-Secret': secret,
				'X-Timestamp': Math.floor(Date.now() / 1000).toString()
			}
		};
		if (body) {
			options.body = JSON.stringify(body);
		}

		const response = await fetch(url, options);
		
		if (!response.ok) {
			let errorText = await response.text();
			console.error(`Chatwoot Bridge Error [${method} ${endpoint}]:`, response.status, errorText);
			throw new Error(`Chatwoot Bridge failed: ${response.status} - ${errorText.substring(0, 100)}`);
		}
		
		return await response.json();
	}

	// === BRIDGE API: ACCOUNTS ===

	async listAccounts() {
		// Uses the bridge which returns ALL accounts safely
		return this._bridgeRequest('GET', '/super_admin/bridge/accounts');
	}

	async createAccount(name, email, password) {
		const payload = {
			account_name: name,
			admin_email: email,
			admin_password: password
		};
		// The bridge creates the account and the admin user natively, completely solving the bug!
		const response = await this._bridgeRequest('POST', '/super_admin/bridge/provision_account', payload);
		return { id: response.account_id, ...response };
	}

	async updateAccountPlanLimits(accountId, planName) {
		// For the Bridge, we can either call the Platform API to update features,
		// or if we just want to set Firebase data, we skip.
		// Since we want to update limits/features on the account, we should still use Platform API!
		// Wait, we can still use the Platform API to update the account features!
		const payload = {
			limits: { agents: 100, inboxes: 100 },
			features: { inbound_emails: true, campaigns: true },
			custom_attributes: { plan_name: planName }
		};
		return this._request('PATCH', `/platform/api/v1/accounts/${accountId}`, payload);
	}

	async suspendAccount(accountId) {
		return this._bridgeRequest('POST', '/super_admin/bridge/toggle_suspension', { account_id: accountId, action_type: 'suspend' });
	}

	async reactivateAccount(accountId) {
		return this._bridgeRequest('POST', '/super_admin/bridge/toggle_suspension', { account_id: accountId, action_type: 'active' });
	}

	async destroyAccount(accountId) {
		return this._bridgeRequest('DELETE', '/super_admin/bridge/delete_account', { account_id: accountId });
	}

	// === PLATFORM API: USERS ===
	
	async createOrUpdateUser(accountId, userPayload) {
		return this._request('POST', `/platform/api/v1/accounts/${accountId}/account_users`, userPayload);
	}

}

