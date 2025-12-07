import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';

// GET /api/campaigns - List user's campaigns
export const GET: RequestHandler = async ({ cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const campaigns = await campaignService.getUserCampaigns(parseInt(userId));
		return json({ campaigns });
	} catch (error) {
		console.error('Failed to get campaigns:', error);
		return json({ error: 'Failed to get campaigns' }, { status: 500 });
	}
};

// POST /api/campaigns - Create a new campaign
export const POST: RequestHandler = async ({ cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { name } = await request.json();

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Campaign name is required' }, { status: 400 });
		}

		const campaign = await campaignService.createCampaign(parseInt(userId), name.trim());
		return json({ campaign }, { status: 201 });
	} catch (error) {
		console.error('Failed to create campaign:', error);
		return json({ error: 'Failed to create campaign' }, { status: 500 });
	}
};
