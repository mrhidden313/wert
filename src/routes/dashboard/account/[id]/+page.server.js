import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';
import { fail } from '@sveltejs/kit';

function extractInboxesData(inboxes, ignoredIds = []) {
	const ignoredSet = new Set((ignoredIds || []).map(String));
	
	const allInboxesParsed = (inboxes || []).map(inbox => {
		const directPhone = inbox.phone_number;
		const channelPhone = inbox.channel?.phone_number;
		const providerPhone = inbox.provider_config?.phone_number || inbox.channel?.provider_config?.phone_number;
		const nameMatch = inbox.name ? String(inbox.name).match(/(\+?[0-9]{10,15})/g) : null;
		const candidates = [directPhone, channelPhone, providerPhone, ...(nameMatch || [])].filter(Boolean);

		let phone = null;
		for (const raw of candidates) {
			if (typeof raw === 'string' && raw.trim()) {
				const cleaned = raw.replace(/[^\d+]/g, '').trim();
				if (cleaned.length >= 10) {
					phone = cleaned;
					break;
				}
			}
		}

		return {
			id: String(inbox.id),
			name: inbox.name || `Inbox #${inbox.id}`,
			channel_type: inbox.channel_type || 'Channel::Whatsapp',
			phone_number: phone || inbox.phone_number || null,
			health: inbox.health || null,
			ignored: ignoredSet.has(String(inbox.id))
		};
	});

	// Active inboxes are those NOT ignored
	const activeInboxes = allInboxesParsed.filter(i => !i.ignored);
	const activeNumbers = [];
	activeInboxes.forEach(i => {
		if (i.phone_number && !activeNumbers.includes(i.phone_number)) {
			activeNumbers.push(i.phone_number);
		}
	});

	// 1. If at least ONE active channel is CONNECTED -> Account is considered CONNECTED
	const connectedInbox = activeInboxes.find(i => 
		i.health && (i.health.status === 'CONNECTED' || i.health.health_level === 'HEALTHY' || i.health.health_level === 'WARNING')
	);

	// 2. If no working connected inbox, check if all/any are BANNED
	const bannedInbox = activeInboxes.find(i => 
		i.health && (i.health.status === 'BANNED' || i.health.status === 'RESTRICTED' || i.health.health_level === 'BANNED')
	);

	// 3. Fallback to any health
	const activeHealth = connectedInbox?.health || bannedInbox?.health || activeInboxes[0]?.health || null;

	return {
		allInboxes: allInboxesParsed,
		activeInboxes,
		activeNumbers,
		activeHealth,
		combinedPhone: activeNumbers.length > 0 ? activeNumbers.join(', ') : 'N/A'
	};
}

export async function load({ params }) {
	const accountId = params.id;

	try {
		const chatwoot = new ChatwootAPI();
		
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = [];
		if (accountsResponse && accountsResponse.accounts) {
			accounts = accountsResponse.accounts;
		}

		const account = accounts.find(a => String(a.id) === String(accountId));
		if (!account) {
			return { error: 'Account not found in Chatwoot' };
		}

		// Fetch Firebase subscription
		let subscription = await FirebaseAdmin.getSubscription(accountId);
		
		// Fallback for old Firestore documents using linkedEmail
		if (!subscription && account.admin_email) {
			const allSubs = await FirebaseAdmin.getAllSubscriptions();
			const matchingSubKey = Object.keys(allSubs).find(key => 
				allSubs[key].linkedEmail === account.admin_email
			);
			if (matchingSubKey) {
				subscription = allSubs[matchingSubKey];
			}
		}
		
		subscription = subscription || {};
		const ignoredIds = subscription.ignored_inbox_ids || [];

		// Fetch inboxes for channel manager
		let inboxes = [];
		try {
			inboxes = await chatwoot.getAccountInboxes(accountId);
			if (!inboxes || inboxes.length === 0) {
				const bridgeRes = await chatwoot._bridgeRequest('GET', `/super_admin/bridge/inboxes?account_id=${accountId}`);
				if (Array.isArray(bridgeRes)) inboxes = bridgeRes;
				else if (bridgeRes && Array.isArray(bridgeRes.inboxes)) inboxes = bridgeRes.inboxes;
				else if (bridgeRes && Array.isArray(bridgeRes.payload)) inboxes = bridgeRes.payload;
			}
		} catch (e) {
			// Ignore inboxes fetch error
		}

		const parsedInboxes = extractInboxesData(inboxes, ignoredIds);

		return {
			account: {
				id: account.id,
				name: account.name,
				status: account.status,
				admin_email: account.admin_email,
				admin_name: account.admin_name,
				created_at: account.created_at,
				planType: subscription.planType || 'Unknown',
				daysRemaining: subscription.daysRemaining || 0,
				phoneNumber: subscription.phoneNumber || parsedInboxes.combinedPhone || 'N/A',
				greeting_enabled: subscription.greeting_enabled !== false,
				allowed_inboxes: subscription.allowed_inboxes || {
					whatsapp: true,
					web_widget: false,
					telegram: false,
					api: false,
					facebook: false,
					sms: false,
					email: false,
					instagram: false,
					line: false
				},
				startup_fee: subscription.startup_fee || null,
				monthly_fee_amount: subscription.monthly_fee_amount || 0,
				pending_fees: subscription.pending_fees || [],
				history: subscription.history || [],
				freeze: subscription.freeze || false,
				whatsapp_health: subscription.whatsapp_health || parsedInboxes.activeHealth || null,
				ignored_inbox_ids: ignoredIds,
				inboxes: parsedInboxes.allInboxes
			}
		};

	} catch (err) {
		console.error("Failed to load account details", err);
		return { error: 'Failed to load account details' };
	}
}

export const actions = {
	resetPassword: async ({ request, params, locals }) => {
		const data = await request.formData();
		const newPassword = data.get('newPassword');
		const accountId = params.id;
		const adminEmail = locals.adminEmail || 'Unknown';

		if (!newPassword || newPassword.length < 6) {
			return fail(400, { error: 'Password must be at least 6 characters long' });
		}

		try {
			const chatwoot = new ChatwootAPI();
			const result = await chatwoot.changePassword(accountId, newPassword);
			
			if (result && result.success === false) {
				return fail(400, { error: result.error || 'Failed to update password' });
			}

			await FirebaseAdmin.addAuditLog(adminEmail, 'Reset Password', `Reset password for account ${accountId}`);
			return { success: true, message: 'Password reset successfully!' };
		} catch (error) {
			console.error('Password reset error:', error);
			return fail(500, { error: 'Internal server error while resetting password' });
		}
	},

	forceLogout: async ({ params, locals }) => {
		const accountId = params.id;
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			const chatwoot = new ChatwootAPI();
			const result = await chatwoot.forceLogout(accountId);
			
			if (result && result.success === false) {
				return fail(400, { error: result.error || 'Failed to force logout' });
			}

			await FirebaseAdmin.addAuditLog(adminEmail, 'Force Logout', `Forced logout for account ${accountId}`);
			return { success: true, message: 'User forcefully logged out of all devices!' };
		} catch (error) {
			console.error('Force logout error:', error);
			return fail(500, { error: 'Internal server error while forcing logout' });
		}
	},

	editSubscription: async ({ request, params, locals }) => {
		const data = await request.formData();
		const accountId = params.id;
		const adminEmail = locals.adminEmail || 'Unknown';
		
		const planType = data.get('planType');
		const daysRemaining = parseInt(data.get('daysRemaining'));
		const linkedEmail = data.get('linkedEmail');
		const phoneNumber = data.get('phoneNumber');

		if (!planType || isNaN(daysRemaining) || !linkedEmail) {
			return fail(400, { error: 'Plan Type, Days Remaining, and Linked Email are required' });
		}

		try {
			// Find old document if it exists to delete it (cleanup random IDs)
			const allSubs = await FirebaseAdmin.getAllSubscriptions();
			const matchingSubKey = Object.keys(allSubs).find(key => 
				key !== String(accountId) && allSubs[key].linkedEmail === linkedEmail
			);
			
			if (matchingSubKey) {
				await FirebaseAdmin.deleteSubscription(matchingSubKey);
				console.log(`Deleted old subscription doc: ${matchingSubKey} for email ${linkedEmail}`);
			}

			const isAutoFreeze = daysRemaining <= 0;
			const status = daysRemaining > 0 ? 'active' : 'expired';

			await FirebaseAdmin.updateSubscription(accountId, {
				planType,
				daysRemaining,
				linkedEmail,
				phoneNumber: phoneNumber || 'N/A',
				freeze: isAutoFreeze,
				status
			});

			await FirebaseAdmin.addAuditLog(adminEmail, 'Edit Subscription', `Edited subscription for account ${accountId}. Days: ${daysRemaining}, Plan: ${planType}, Freeze: ${isAutoFreeze}`);
			return { success: true, message: `Subscription updated! ${isAutoFreeze ? '(App Auto-Frozen: 0 Days Left)' : '(App Active & Unfrozen)'}` };
		} catch (error) {
			console.error('Edit subscription error:', error);
			return fail(500, { error: 'Internal server error while updating subscription' });
		}
	},

	toggleIgnoreInbox: async ({ request, params, locals }) => {
		const data = await request.formData();
		const accountId = params.id;
		const inboxId = String(data.get('inboxId'));
		const ignore = data.get('ignore') === 'true' || data.get('ignore') === true;
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			const sub = await FirebaseAdmin.getSubscription(accountId) || {};
			let ignored = (sub.ignored_inbox_ids || []).map(String);

			if (ignore) {
				if (!ignored.includes(inboxId)) ignored.push(inboxId);
			} else {
				ignored = ignored.filter(id => id !== inboxId);
			}

			// Re-evaluate inboxes with new ignored list
			const chatwoot = new ChatwootAPI();
			let inboxes = await chatwoot.getAccountInboxes(accountId);
			if (!inboxes || inboxes.length === 0) {
				const bridgeRes = await chatwoot._bridgeRequest('GET', `/super_admin/bridge/inboxes?account_id=${accountId}`);
				if (Array.isArray(bridgeRes)) inboxes = bridgeRes;
				else if (bridgeRes && Array.isArray(bridgeRes.inboxes)) inboxes = bridgeRes.inboxes;
				else if (bridgeRes && Array.isArray(bridgeRes.payload)) inboxes = bridgeRes.payload;
			}

			const parsed = extractInboxesData(inboxes, ignored);
			const updatePayload = {
				ignored_inbox_ids: ignored,
				phoneNumber: parsed.combinedPhone
			};

			if (parsed.activeHealth) {
				updatePayload.whatsapp_health = parsed.activeHealth;
			}

			await FirebaseAdmin.updateSubscription(accountId, updatePayload);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Toggle Ignore Channel', `${ignore ? 'Ignored' : 'Unignored'} Inbox #${inboxId} for account ${accountId}`);

			return {
				success: true,
				ignored_inbox_ids: ignored,
				inboxes: parsed.allInboxes,
				phoneNumber: parsed.combinedPhone,
				health: parsed.activeHealth,
				message: `Channel #${inboxId} ${ignore ? 'ignored/skipped' : 'activated'} successfully!`
			};
		} catch (err) {
			console.error("Failed to toggle ignore inbox:", err);
			return fail(500, { error: err.message });
		}
	},

	fetchInboxNumbers: async ({ params, locals }) => {
		const accountId = params.id;
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			const chatwoot = new ChatwootAPI();
			let inboxes = await chatwoot.getAccountInboxes(accountId);

			// Fallback: Check bridge if standard inboxes response is empty
			if (!inboxes || inboxes.length === 0) {
				try {
					const bridgeRes = await chatwoot._bridgeRequest('GET', `/super_admin/bridge/inboxes?account_id=${accountId}`);
					if (Array.isArray(bridgeRes)) inboxes = bridgeRes;
					else if (bridgeRes && Array.isArray(bridgeRes.inboxes)) inboxes = bridgeRes.inboxes;
					else if (bridgeRes && Array.isArray(bridgeRes.payload)) inboxes = bridgeRes.payload;
				} catch (e) {
					// Ignore bridge route miss
				}
			}

			const sub = await FirebaseAdmin.getSubscription(accountId) || {};
			const ignoredIds = sub.ignored_inbox_ids || [];

			const parsed = extractInboxesData(inboxes, ignoredIds);

			if (parsed.allInboxes.length === 0) {
				return {
					noNumbers: true,
					message: 'No inboxes found in this Chatwoot workspace yet. Client needs to connect an inbox first.'
				};
			}

			const updatePayload = { 
				phoneNumber: parsed.combinedPhone 
			};
			if (parsed.activeHealth) {
				updatePayload.whatsapp_health = parsed.activeHealth;
			}

			await FirebaseAdmin.updateSubscription(accountId, updatePayload);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Fetch Phone Number & Health', `Auto-fetched ${parsed.combinedPhone} for account ${accountId}`);

			return {
				success: true,
				fetchedPhone: parsed.combinedPhone,
				health: parsed.activeHealth,
				inboxes: parsed.allInboxes,
				count: parsed.activeNumbers.length,
				numbers: parsed.activeNumbers,
				message: `Successfully synced ${parsed.activeNumbers.length} active channel(s) from Chatwoot: ${parsed.combinedPhone} ${parsed.activeHealth ? `(Status: ${parsed.activeHealth.status})` : ''}`
			};
		} catch (err) {
			console.error("Failed to fetch inbox numbers:", err);
			return fail(500, { error: `Failed to fetch from Chatwoot: ${err.message}` });
		}
	},

	setStartupFee: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const adminEmail = locals.adminEmail || 'Unknown';
		try {
			const sub = await FirebaseAdmin.getSubscription(params.id);
			let paid = 0;
			if (sub && sub.startup_fee) {
				paid = sub.startup_fee.paid || 0;
			}
			await FirebaseAdmin.updateSubscription(params.id, {
				startup_fee: {
					total: amount,
					paid: paid
				}
			});
			await FirebaseAdmin.addAuditLog(adminEmail, 'Set Startup Fee', `Set total startup fee to ${amount} for account ${params.id}`);
			return { success: true, message: 'Startup fee updated successfully!' };
		} catch (e) {
			return fail(500, { error: e.message });
		}
	},

	setMonthlyFeeAmount: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const adminEmail = locals.adminEmail || 'Unknown';
		try {
			await FirebaseAdmin.updateSubscription(params.id, {
				monthly_fee_amount: amount
			});
			await FirebaseAdmin.addAuditLog(adminEmail, 'Set Monthly Fee Amount', `Set standard monthly fee amount to ${amount} for account ${params.id}`);
			return { success: true, message: 'Monthly fee rate saved successfully!' };
		} catch (e) {
			return fail(500, { error: e.message });
		}
	},

	addInvoice: async ({ request, params, locals }) => {
		const data = await request.formData();
		const amount = parseInt(data.get('amount') || '0', 10);
		const month = data.get('month') || new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			const sub = await FirebaseAdmin.getSubscription(params.id);
			const pending_fees = sub?.pending_fees || [];
			const newFee = {
				id: 'fee_' + Date.now(),
				month: month,
				total: amount,
				paid: 0,
				status: 'unpaid',
				generatedAt: new Date().toISOString()
			};
			pending_fees.push(newFee);
			await FirebaseAdmin.updateSubscription(params.id, { pending_fees });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Add Invoice', `Manually generated monthly fee invoice of PKR ${amount} for ${month} (Account ${params.id})`);
			return { success: true, message: `Invoice for ${month} generated successfully!` };
		} catch (e) {
			return fail(500, { error: e.message });
		}
	},

	recordPayment: async ({ request, params, locals }) => {
		const data = await request.formData();
		const type = data.get('type');
		const feeId = data.get('feeId');
		const amount = parseInt(data.get('amount') || '0', 10);
		const bankType = data.get('bankType') || 'Cash';
		const txId = data.get('txId') || '';
		const notes = data.get('notes') || '';
		const adminEmail = locals.adminEmail || 'Unknown';

		if (isNaN(amount) || amount <= 0) {
			return fail(400, { error: 'Invalid payment amount' });
		}

		try {
			const sub = await FirebaseAdmin.getSubscription(params.id);
			if (!sub) return fail(404, { error: 'Subscription not found' });

			const history = sub.history || [];
			const paymentRecord = {
				id: 'pay_' + Date.now(),
				type: type === 'startup' ? 'Startup Fee' : 'Monthly Fee',
				amount: amount,
				bankType: bankType,
				txId: txId,
				notes: notes,
				recordedBy: adminEmail,
				date: new Date().toISOString()
			};
			history.unshift(paymentRecord);

			const updatePayload = { history };

			if (type === 'startup') {
				const currentPaid = sub.startup_fee?.paid || 0;
				const total = sub.startup_fee?.total || 0;
				updatePayload.startup_fee = {
					total: total,
					paid: currentPaid + amount
				};
			} else if (type === 'monthly') {
				const pending_fees = sub.pending_fees || [];
				const feeIndex = pending_fees.findIndex(f => f.id === feeId);
				if (feeIndex !== -1) {
					const fee = pending_fees[feeIndex];
					fee.paid = (fee.paid || 0) + amount;
					if (fee.paid >= fee.total) {
						fee.status = 'paid';
					} else {
						fee.status = 'partial';
					}
					updatePayload.pending_fees = pending_fees;
				}
			}

			await FirebaseAdmin.updateSubscription(params.id, updatePayload);
			await FirebaseAdmin.addAuditLog(adminEmail, 'Record Payment', `Recorded ${type} payment of PKR ${amount} via ${bankType} for account ${params.id}`);
			return { success: true, message: 'Payment recorded successfully!' };
		} catch (e) {
			return fail(500, { error: e.message });
		}
	},

	updateAllowedInboxes: async ({ request, params, locals }) => {
		const data = await request.formData();
		const adminEmail = locals.adminEmail || 'Unknown';

		const allowed_inboxes = {
			whatsapp: data.get('whatsapp') === 'on',
			web_widget: data.get('web_widget') === 'on',
			telegram: data.get('telegram') === 'on',
			api: data.get('api') === 'on',
			facebook: data.get('facebook') === 'on',
			sms: data.get('sms') === 'on',
			email: data.get('email') === 'on',
			instagram: data.get('instagram') === 'on',
			line: data.get('line') === 'on'
		};

		try {
			await FirebaseAdmin.updateSubscription(params.id, { allowed_inboxes });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Update Allowed Inboxes', `Updated inbox channel permissions for account ${params.id}`);
			return { success: true, message: 'Inbox permissions updated successfully!' };
		} catch (error) {
			console.error('Update allowed inboxes error:', error);
			return fail(500, { error: 'Internal server error while updating inbox permissions' });
		}
	},

	toggleGreeting: async ({ request, params, locals }) => {
		const data = await request.formData();
		const enabled = data.get('enabled') === 'true';
		const adminEmail = locals.adminEmail || 'Unknown';

		try {
			await FirebaseAdmin.updateSubscription(params.id, { greeting_enabled: enabled });
			await FirebaseAdmin.addAuditLog(adminEmail, 'Toggle Auto Greeting', `${enabled ? 'Enabled' : 'Disabled'} auto greeting for account ${params.id}`);
			return { success: true, message: `Auto greeting ${enabled ? 'enabled' : 'disabled'} successfully!` };
		} catch (error) {
			console.error('Toggle greeting error:', error);
			return fail(500, { error: 'Internal server error while updating greeting preference' });
		}
	}
};
