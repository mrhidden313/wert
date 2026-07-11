import { FirebaseAdmin } from '$lib/server/firebase';
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

		for (const [accountId, sub] of Object.entries(allSubs)) {
			// Only process active accounts
			if (sub.status !== 'active') continue;

			let currentDays = sub.daysRemaining || 0;
			
			// 1. Decrement days if > 0
			if (currentDays > 0) {
				currentDays -= 1;
			}

			let updateData = { daysRemaining: currentDays };
			let needsUpdate = true; // We almost always update to decrement the day
			
			// 2. Generate Invoice if days reach exactly 0 (or were already 0)
			if (currentDays <= 0) {
				const monthlyFee = sub.monthly_fee_amount || 0;
				
				// Only generate if there's an actual fee configured
				if (monthlyFee > 0) {
					// We use next month for the label since it's an advance fee, or current month. Let's use current.
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
							admin: 'System (Cron)',
							type: 'invoice_generated'
						};
						updateData.history = FieldValue.arrayUnion(historyEntry);
						logs.push(`Generated invoice for ${accountId}`);
					}
				}
			}

			if (needsUpdate) {
				updateData.updatedAt = new Date().toISOString();
				await db.collection('subscriptions').doc(accountId).set(updateData, { merge: true });
				logs.push(`Updated ${accountId} (Days remaining: ${currentDays})`);
			}
		}

		return json({ success: true, processed: Object.keys(allSubs).length, logs });

	} catch (err) {
		console.error('Cron Error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
}
