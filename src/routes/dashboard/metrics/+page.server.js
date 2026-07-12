import { ChatwootAPI } from '$lib/server/chatwoot';
import { FirebaseAdmin } from '$lib/server/firebase';

export async function load() {
	try {
		const chatwoot = new ChatwootAPI();
		const accountsResponse = await chatwoot.listAccounts();
		let accounts = accountsResponse?.accounts || [];

		const subscriptions = await FirebaseAdmin.getAllSubscriptions();

		// Fetch metrics in parallel for all accounts
		const clientMetrics = await Promise.all(
			accounts.map(async (acc) => {
				let sub = subscriptions[acc.id] || {};
				const report = await chatwoot.getAccountReports(acc.id);

				// Extract counts safely
				let incomingCount = 0;
				let outgoingCount = 0;
				let conversationsCount = 0;

				if (report) {
					incomingCount = Number(report.incoming_messages_count || 0);
					outgoingCount = Number(report.outgoing_messages_count || 0);
					conversationsCount = Number(report.conversations_count || 0);
				}

				return {
					id: acc.id,
					name: acc.name,
					email: acc.admin_email || sub.linkedEmail || 'N/A',
					status: acc.status || 'active',
					planType: sub.planType || 'Unknown',
					incomingCount,
					outgoingCount,
					totalMessages: incomingCount + outgoingCount,
					conversationsCount
				};
			})
		);

		// Calculate global system totals
		const totalIncoming = clientMetrics.reduce((sum, c) => sum + c.incomingCount, 0);
		const totalOutgoing = clientMetrics.reduce((sum, c) => sum + c.outgoingCount, 0);
		const totalMessages = totalIncoming + totalOutgoing;
		const totalConversations = clientMetrics.reduce((sum, c) => sum + c.conversationsCount, 0);

		return {
			clientMetrics,
			totals: {
				incoming: totalIncoming,
				outgoing: totalOutgoing,
				messages: totalMessages,
				conversations: totalConversations
			}
		};
	} catch (err) {
		console.error("Metrics Page Load Error:", err);
		return {
			error: `Failed to load usage metrics: ${err.message}`,
			clientMetrics: [],
			totals: { incoming: 0, outgoing: 0, messages: 0, conversations: 0 }
		};
	}
}
