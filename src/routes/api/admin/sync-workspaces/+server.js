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

		let phoneCount = 0;
		let totalProcessed = 0;

		// 3. Process accounts in parallel (Ultra-Fast SWR Backend Pattern)
		const syncPromises = activeAndExpiredAccounts.map(async (acc) => {
			const accountId = String(acc.id);
			totalProcessed++;

			try {
				let inboxes = await chatwoot.getAccountInboxes(accountId);

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

				// Check for admin ignored/muted channels in Firestore
				const sub = await FirebaseAdmin.getSubscription(accountId) || {};
				const ignoredIds = new Set((sub.ignored_inbox_ids || []).map(String));

				// Filter out ignored inboxes
				const activeInboxes = (inboxes || []).filter(i => !ignoredIds.has(String(i.id)));

				const extractedNumbers = [];
				activeInboxes.forEach(inbox => {
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

				const waInboxWithHealth = activeInboxes.find(i => i.health);
				if (waInboxWithHealth?.health) {
					updatePayload.whatsapp_health = waInboxWithHealth.health;
				}

				await FirebaseAdmin.updateSubscription(accountId, updatePayload);
			} catch (e) {
				console.error(`Sync error for account ${accountId}:`, e.message);
			}
		});

		await Promise.allSettled(syncPromises);

		await FirebaseAdmin.addAuditLog(adminEmail, 'Bulk Sync Workspaces', `Bulk synced ${activeAndExpiredAccounts.length} workspaces (${phoneCount} active WhatsApp numbers found)`);

		return json({
			success: true,
			totalScanned: activeAndExpiredAccounts.length,
			totalProcessed,
			phoneCount,
			message: `Successfully synced all ${activeAndExpiredAccounts.length} workspaces (${phoneCount} active WhatsApp numbers updated, ignored channels skipped)!`
		});
	} catch (err) {
		console.error("Bulk sync error:", err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
