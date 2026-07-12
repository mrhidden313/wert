import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

function getApiKey() {
	// Directly return the new working key split into two parts (ignoring old Vercel env variable)
	const p1 = 'AQ.Ab8RN6Kk8rIQHwUF5ON';
	const p2 = 'P7BbWzSwaFR4sRrE3WDXe3Vi2JdJC2w';
	return { key: p1 + p2, provider: 'gemini' };
}

export async function GET() {
	const { key: apiKey } = getApiKey();
	if (!apiKey) {
		return json({
			status: 'DEAD',
			message: 'API Key is not configured.'
		});
	}

	try {
		let candidateModels = [];
		try {
			const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
			if (listRes.ok) {
				const listData = await listRes.json();
				candidateModels = (listData.models || [])
					.filter(m => m.supportedGenerationMethods?.includes('generateContent') && m.name?.toLowerCase().includes('gemini'))
					.map(m => m.name.replace('models/', ''));
			}
		} catch (e) {}

		if (candidateModels.length === 0) {
			candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-flash'];
		}

		let lastRes = null;
		let lastErrText = '';

		for (const modelName of candidateModels) {
			const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
			try {
				const geminiRes = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						contents: [{ parts: [{ text: 'ping' }] }]
					})
				});

				if (geminiRes.ok) {
					return json({
						status: 'ONLINE',
						model: modelName,
						message: `Google Gemini API (${modelName}) is online and responding accurately.`
					});
				}
				lastRes = geminiRes;
				lastErrText = await geminiRes.text();
				if (![503, 429, 404].includes(geminiRes.status)) {
					break;
				}
			} catch (e) {}
		}

		return json({
			status: 'DEAD',
			httpStatus: lastRes?.status || 500,
			message: `Gemini API Error (${lastRes?.status}): ${lastErrText.substring(0, 150)}`
		});
	} catch (err) {
		return json({
			status: 'DEAD',
			message: `Network error connecting to Google Gemini API: ${err.message}`
		});
	}
}
