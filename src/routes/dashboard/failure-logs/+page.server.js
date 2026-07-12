import { FirebaseAdmin } from '$lib/server/firebase';

export async function load() {
	try {
		const logs = await FirebaseAdmin.getFailureLogs();
		return { logs };
	} catch (err) {
		console.error("Failure Logs Load Error:", err);
		return { logs: [], error: 'Failed to load failure logs' };
	}
}
