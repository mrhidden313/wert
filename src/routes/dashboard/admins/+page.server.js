import { FirebaseAdmin } from '$lib/server/firebase';

export async function load() {
	try {
		const profiles = await FirebaseAdmin.getAdminProfiles();
		return { profiles: Object.values(profiles) };
	} catch (err) {
		console.error("Admins Load Error:", err);
		return { profiles: [], error: 'Failed to load admin profiles' };
	}
}
