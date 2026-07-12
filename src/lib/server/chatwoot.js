import { env } from '$env/dynamic/private';
import { FirebaseAdmin } from '$lib/server/firebase';

const CHATWOOT_BASE_URL = env.INSTANTFLOW_BASE_URL || 'https://api.instantflow.online';

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
			FirebaseAdmin.addFailureLog(response.status, `${method} ${endpoint}`, errorText, JSON.stringify(body || {}));
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
			FirebaseAdmin.addFailureLog(response.status, `${method} ${endpoint}`, errorText, JSON.stringify(body || {}));
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
		const payload = {
			account_id: accountId,
			limits: { agents: 100, inboxes: 100 },
			features: { inbound_emails: true, campaigns: true },
			custom_attributes: { plan_name: planName }
		};
		return this._bridgeRequest('POST', '/super_admin/bridge/update_limits', payload);
	}

	async suspendAccount(accountId) {
		return this._bridgeRequest('POST', '/super_admin/bridge/toggle_suspension', { account_id: accountId, action_type: 'suspend' });
	}

	async reactivateAccount(accountId) {
		return this._bridgeRequest('POST', '/super_admin/bridge/toggle_suspension', { account_id: accountId, action_type: 'active' });
	}

	async destroyAccount(accountId) {
		return this._bridgeRequest('DELETE', `/super_admin/bridge/delete_account?account_id=${accountId}`, { account_id: accountId });
	}

	async changePassword(accountId, newPassword) {
		return this._bridgeRequest('POST', '/super_admin/bridge/change_password', {
			account_id: accountId,
			new_password: newPassword
		});
	}

	async forceLogout(accountId) {
		return this._bridgeRequest('POST', '/super_admin/bridge/force_logout', {
			account_id: accountId
		});
	}

	// === PLATFORM API: USERS ===

	async createOrUpdateUser(accountId, userPayload) {
		return this._request('POST', `/platform/api/v1/accounts/${accountId}/account_users`, userPayload);
	}

	// === INBOX APIs ===

	async getInboxes(accountId) {
		const response = await this._request('GET', `/api/v1/accounts/${accountId}/inboxes`);
		// Chatwoot returns { payload: [...] } for inboxes usually, but let's just return the whole thing
		return response;
	}

	async toggleInboxGreeting(accountId, inboxId, isEnabled) {
		return this._request('PATCH', `/api/v1/accounts/${accountId}/inboxes/${inboxId}`, {
			greeting_enabled: isEnabled
		});
	}

	// === REPORTS & METRICS API ===

	async getAccountReports(accountId) {
		try {
			const now = Math.floor(Date.now() / 1000);
			const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
			const response = await this._request('GET', `/api/v2/accounts/${accountId}/reports/summary?since=${thirtyDaysAgo}&until=${now}`);
			return response;
		} catch (err) {
			console.error(`Failed to fetch reports for account ${accountId}:`, err.message);
			return null;
		}
	}

}

