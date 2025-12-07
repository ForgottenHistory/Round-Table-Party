import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { contentLlmService } from '$lib/server/services/contentLlmService';

// POST /api/campaigns/generate - Generate campaign premise only (greeting generated on start)
export const POST: RequestHandler = async ({ cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { name, description } = await request.json();

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Campaign name is required' }, { status: 400 });
		}

		if (!description || typeof description !== 'string' || description.trim().length === 0) {
			return json({ error: 'Campaign description is required' }, { status: 400 });
		}

		// Generate premise from description (greeting is generated on campaign start)
		const premise = await contentLlmService.generateCampaignPremise({
			userId: parseInt(userId),
			description: description.trim()
		});

		return json({ premise });
	} catch (error) {
		console.error('Failed to generate campaign content:', error);
		return json({ error: 'Failed to generate campaign content' }, { status: 500 });
	}
};
