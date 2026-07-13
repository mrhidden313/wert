import { json } from '@sveltejs/kit';
import { FirebaseAdmin } from '$lib/server/firebase.js';

export async function GET() {
	const active = await FirebaseAdmin.getGlobalMaintenance();
	return json({ active });
}

export async function POST({ request }) {
	try {
		const { active } = await request.json();
		await FirebaseAdmin.setGlobalMaintenance(active);
		return json({ success: true, active: Boolean(active) });
	} catch (err) {
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
