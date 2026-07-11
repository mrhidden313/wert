import { FirebaseAdmin } from '$lib/server/firebase';

export async function load() {
	try {
		const logs = await FirebaseAdmin.getAuditLogs();
		return { logs };
	} catch (err) {
		console.error("Audit Logs Load Error:", err);
		return { logs: [], error: 'Failed to load audit logs' };
	}
}
