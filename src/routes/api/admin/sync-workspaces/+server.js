import { json } from '@sveltejs/kit';
import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';

export async function POST({ locals }) {
	const adminEmail = locals?.adminEmail || 'SuperAdmin';

	try {
		const chatwoot = new ChatwootAPI();

		// 1. Fetch all accounts from Chatwoot
		const accRes = await chatwoot.listAccounts();
		let accounts = [];
		if (accRes && accRes.accounts) accounts = accRes.accounts;
		else if (Array.isArray(accRes)) accounts = accRes;
		else if (accRes && accRes.payload) accounts = accRes.payload;

		// 2. Filter out suspended accounts
		const activeAndExpiredAccounts = accounts.filter(a => a.status !== 'suspended');

		let totalProcessed = 0;
		let phoneCount = 0;
		let logs = [];

		// 3. Process each account
		for (const acc of activeAndExpiredAccounts) {
			const accountId = String(acc.id);
			totalProcessed++;

			try {
				let inboxes = await chatwoot.getAccountInboxes(accountId);

				// Bridge Fallback if standard list is empty
				if (!inboxes || inboxes.length === 0) {
					try {
						const bridgeRes = await chatwoot._bridgeRequest('GET', `/super_admin/bridge/inboxes?account_id=${accountId}`);
						if (Array.isArray(bridgeRes)) inboxes = bridgeRes;
						else if (bridgeRes && Array.isArray(bridgeRes.inboxes)) inboxes = bridgeRes.inboxes;
						else if (bridgeRes && Array.isArray(bridgeRes.payload)) inboxes = bridgeRes.payload;
					} catch (e) {
						// Ignore
					}
				}

				const extractedNumbers = [];
				(inboxes || []).forEach(inbox => {
					const directPhone = inbox.phone_number;
					const channelPhone = inbox.channel?.phone_number;
					const providerPhone = inbox.provider_config?.phone_number || inbox.channel?.provider_config?.phone_number;
					const nameMatch = inbox.name ? String(inbox.name).match(/(\+?[0-9]{10,15})/g) : null;
					const candidates = [directPhone, channelPhone, providerPhone, ...(nameMatch || [])].filter(Boolean);

					candidates.forEach(raw => {
						if (typeof raw === 'string' && raw.trim()) {
							const cleaned = raw.replace(/[^\d+]/g, '').trim();
							if (cleaned.length >= 10 && !extractedNumbers.includes(cleaned)) {
								extractedNumbers.push(cleaned);
							}
						}
					});
				});

				const updatePayload = {
					linkedEmail: acc.admin_email || '',
					updatedAt: new Date().toISOString()
				};

				if (extractedNumbers.length > 0) {
					updatePayload.phoneNumber = extractedNumbers.join(', ');
					phoneCount++;
				}

				const waInboxWithHealth = (inboxes || []).find(i => i.health);
				if (waInboxWithHealth?.health) {
					updatePayload.whatsapp_health = waInboxWithHealth.health;
				}

				await FirebaseAdmin.updateSubscription(accountId, updatePayload);
				logs.push(`Account ${accountId} (${acc.name}): ${updatePayload.phoneNumber || 'No connected inboxes'}`);
			} catch (e) {
				console.error(`Sync error for account ${accountId}:`, e.message);
			}
		}

		await FirebaseAdmin.addAuditLog(adminEmail, 'Bulk Sync Workspaces', `Bulk synced ${totalProcessed} workspaces (${phoneCount} phone numbers updated)`);

		return json({
			success: true,
			totalScanned: activeAndExpiredAccounts.length,
			totalProcessed,
			phoneCount,
			message: `Successfully synced all ${totalProcessed} workspaces (${phoneCount} active WhatsApp numbers found & updated in Firestore)!`
		});
	} catch (err) {
		console.error("Bulk sync error:", err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
