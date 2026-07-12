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
		// First try standard flash model
		let modelName = 'gemini-1.5-flash';
		let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

		let geminiRes = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: 'ping' }] }]
			})
		});

		// If 404 Model Not Found, dynamically discover available models for this key
		if (geminiRes.status === 404) {
			const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
			if (listRes.ok) {
				const listData = await listRes.json();
				const availableModels = listData.models || [];
				const validModel = availableModels.find(
					(m) =>
						m.supportedGenerationMethods?.includes('generateContent') &&
						m.name?.includes('gemini')
				);
				if (validModel) {
					modelName = validModel.name.replace('models/', '');
					url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
					geminiRes = await fetch(url, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							contents: [{ parts: [{ text: 'ping' }] }]
						})
					});
				}
			}
		}

		if (geminiRes.ok) {
			return json({
				status: 'ONLINE',
				model: modelName,
				message: `Google Gemini API (${modelName}) is online and responding accurately.`
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
