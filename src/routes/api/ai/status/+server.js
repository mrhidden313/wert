import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET() {
	const apiKey = env.GEMINI_API_KEY;
	if (!apiKey) {
		return json({
			status: 'DEAD',
			message: 'GEMINI_API_KEY is not configured in Vercel environment variables.'
		});
	}

	try {
		// Test ping Gemini API with minimal prompt to verify validity
		const geminiRes = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: [{ parts: [{ text: 'ping' }] }]
				})
			}
		);

		if (geminiRes.ok) {
			return json({
				status: 'ONLINE',
				model: 'gemini-1.5-flash',
				message: 'Google Gemini API is online and responding accurately.'
			});
		} else {
			const errText = await geminiRes.text();
			return json({
				status: 'DEAD',
				httpStatus: geminiRes.status,
				message: `Gemini API responded with HTTP ${geminiRes.status}: ${errText.substring(0, 150)}`
			});
		}
	} catch (err) {
		return json({
			status: 'DEAD',
			message: `Network error connecting to Google Gemini API: ${err.message}`
		});
	}
}
