import { json } from '@sveltejs/kit';
import { FirebaseAdmin } from '$lib/server/firebase';

// Enable CORS for Chatwoot domain
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type'
};

export async function OPTIONS() {
	return new Response(null, { headers: corsHeaders });
}

export async function GET({ params }) {
	const accountId = params.id;
	
	try {
		const subscription = await FirebaseAdmin.getSubscription(accountId);
		
		if (!subscription) {
			return json({ expired: false }, { headers: corsHeaders }); // Default allow if no sub found yet
		}

		const daysRemaining = subscription.daysRemaining || 0;
		const isExpired = daysRemaining <= 0;

		return json({ 
			expired: isExpired,
			daysRemaining: daysRemaining,
			freeze: subscription.freeze || false
		}, { headers: corsHeaders });

	} catch (error) {
		console.error('Error fetching subscription for API:', error);
		// On error, default to not expired to prevent locking out valid users due to DB issues
		return json({ expired: false, error: 'Database error' }, { headers: corsHeaders, status: 500 });
	}
}
