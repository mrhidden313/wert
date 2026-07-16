import { json } from '@sveltejs/kit';
import { FirebaseAdmin } from '$lib/server/firebase.js';

export async function GET() {
	const status = await FirebaseAdmin.getUpgradeCelebration();
	return json(status);
}

export async function POST({ request }) {
	try {
		const { active, durationHours } = await request.json();
		const result = await FirebaseAdmin.setUpgradeCelebration(active, Number(durationHours) || 0);
		return json({ success: true, ...result });
	} catch (err) {
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
