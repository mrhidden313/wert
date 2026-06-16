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
			throw new Error(`Chatwoot API failed: ${response.status}`);
		}
		
		// Some endpoints return 204 No Content
		if (response.status === 204) return true;
		
		return await response.json();
	}

	// === PLATFORM API: ACCOUNTS ===

	async listAccounts() {
		return this._request('GET', '/platform/api/v1/accounts');
	}

	async getAccount(accountId) {
		return this._request('GET', `/platform/api/v1/accounts/${accountId}`);
	}

	async createAccount(name, email, password) {
		const payload = {
			name: name,
			custom_attributes: { created_via: 'instantflow-admin' }
		};
		
		// The Platform API requires creating an account first, 
		// then we might need to create an Admin user for it
		const accountResponse = await this._request('POST', '/platform/api/v1/accounts', payload);
		
		// Let's create an Admin User for this account
		const userPayload = {
			name: name,
			email: email,
			password: password,
			role: 'administrator'
		};
		
		try {
			await this._request('POST', `/platform/api/v1/accounts/${accountResponse.id}/account_users`, userPayload);
		} catch (e) {
			console.error("Failed to create user for account", e);
			// Rollback account could be needed here
		}
		
		return accountResponse;
	}

	async updateAccountPlanLimits(accountId, planName) {
		// As requested: all allow, default all.
		// We just pass custom limits or keep it open.
		const payload = {
			limits: {
				agents: 100, // virtually unlimited
				inboxes: 100
			},
			features: {
				api_channel: true,
				inbound_emails: true,
				campaigns: true
			},
			custom_attributes: {
				plan_name: planName
			}
		};
		
		return this._request('PATCH', `/platform/api/v1/accounts/${accountId}`, payload);
	}

	async suspendAccount(accountId) {
		return this._request('PATCH', `/platform/api/v1/accounts/${accountId}`, { status: 'suspended' });
	}

	async reactivateAccount(accountId) {
		return this._request('PATCH', `/platform/api/v1/accounts/${accountId}`, { status: 'active' });
	}

	// === PLATFORM API: USERS ===
	
	async createOrUpdateUser(accountId, userPayload) {
		return this._request('POST', `/platform/api/v1/accounts/${accountId}/account_users`, userPayload);
	}

}
