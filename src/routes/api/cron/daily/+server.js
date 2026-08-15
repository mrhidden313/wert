import { FirebaseAdmin } from '$lib/server/firebase';
import { ChatwootAPI } from '$lib/server/chatwoot';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET({ request }) {
	// Security check: Either valid Vercel cron header or a secret token
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${env.CRON_SECRET || 'secret123'}` && request.headers.get('x-vercel-cron') !== '1') {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		const allSubs = await FirebaseAdmin.getAllSubscriptions();
		let logs = [];
		const { FieldValue } = await import('firebase-admin/firestore');
		const { db } = await import('$lib/server/firebase');
		const chatwoot = new ChatwootAPI();

		for (const [accountId, sub] of Object.entries(allSubs)) {
			// Skip only explicitly suspended accounts
			if (sub.status === 'suspended') continue;

			let currentDays = sub.daysRemaining !== undefined ? Number(sub.daysRemaining) : 0;
			
			// 1. Decrement days if > 0
			if (currentDays > 0) {
				currentDays -= 1;
			}

			let updateData = { 
				daysRemaining: currentDays,
				status: currentDays > 0 ? 'active' : 'expired'
			};
			
			// 2. AUTO-FREEZE and Generate Invoice if days reach 0 or below
			if (currentDays <= 0) {
				updateData.freeze = true; // Auto-freeze client interface!
				const monthlyFee = Number(sub.monthly_fee_amount || 0);
				
				// Only generate if there's an actual fee configured
				if (monthlyFee > 0) {
					const monthLabel = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
					
					// Prevent duplicate invoices for the same month
					const pendingFees = sub.pending_fees || [];
					const alreadyGenerated = pendingFees.some(f => f.month_label === monthLabel && f.type === 'monthly');
					
					if (!alreadyGenerated) {
						const newFee = { 
							id: Date.now().toString() + Math.floor(Math.random()*1000), 
							type: 'monthly', 
							amount: monthlyFee, 
							remaining: monthlyFee, 
							paid: false, 
							month_label: monthLabel 
						};
						updateData.pending_fees = FieldValue.arrayUnion(newFee);
						
						// Add a history log
						const historyEntry = {
							date: new Date().toISOString(),
							action: `Auto-generated Invoice for ${monthLabel} (Rs ${monthlyFee})`,
							admin: 'System (Midnight Cron)',
							type: 'invoice_generated'
						};
						updateData.history = FieldValue.arrayUnion(historyEntry);
						logs.push(`Generated invoice for ${accountId}`);
					}
				}
			}

			// 3. Daily 24h WhatsApp Phone & Health Sync (Skipping Ignored Inboxes)
			try {
				let inboxes = await chatwoot.getAccountInboxes(accountId);
				if (!inboxes || inboxes.length === 0) {
					try {
						const bridgeRes = await chatwoot._bridgeRequest('GET', `/super_admin/bridge/inboxes?account_id=${accountId}`);
						if (Array.isArray(bridgeRes)) inboxes = bridgeRes;
						else if (bridgeRes && Array.isArray(bridgeRes.inboxes)) inboxes = bridgeRes.inboxes;
					} catch (e) {}
				}

				const ignoredIds = new Set((sub.ignored_inbox_ids || []).map(String));
				const activeInboxes = (inboxes || []).filter(i => !ignoredIds.has(String(i.id)));

				if (activeInboxes.length > 0) {
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

					if (extractedNumbers.length > 0) {
						updateData.phoneNumber = extractedNumbers.join(', ');
					}

					const connectedInbox = activeInboxes.find(i => 
						i.health && (i.health.status === 'CONNECTED' || i.health.health_level === 'HEALTHY' || i.health.health_level === 'WARNING')
					);
					const bannedInbox = activeInboxes.find(i => 
						i.health && (i.health.status === 'BANNED' || i.health.status === 'RESTRICTED' || i.health.health_level === 'BANNED')
					);
					const waInboxWithHealth = connectedInbox || bannedInbox || activeInboxes.find(i => i.health);

					if (waInboxWithHealth?.health) {
						updateData.whatsapp_health = waInboxWithHealth.health;
					}
				}
			} catch (e) {
				console.error(`Daily cron phone sync failed for ${accountId}:`, e.message);
			}

			updateData.updatedAt = new Date().toISOString();
			await db.collection('subscriptions').doc(accountId).set(updateData, { merge: true });
			logs.push(`Processed ${accountId} (Days: ${currentDays}, Freeze: ${updateData.freeze ? 'YES' : 'NO'})`);
		}

		return json({ success: true, processed: Object.keys(allSubs).length, logs });

	} catch (err) {
		console.error('Cron Error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
