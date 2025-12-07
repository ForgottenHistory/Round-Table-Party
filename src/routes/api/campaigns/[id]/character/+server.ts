import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { emitCharacterUpdated } from '$lib/server/socket';

// GET /api/campaigns/[id]/character - Get user's character for campaign
export const GET: RequestHandler = async ({ cookies, params }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const campaignId = parseInt(params.id);
	if (isNaN(campaignId)) {
		return json({ error: 'Invalid campaign ID' }, { status: 400 });
	}

	try {
		const isInCampaign = await campaignService.isUserInCampaign(campaignId, parseInt(userId));
		if (!isInCampaign) {
			return json({ error: 'Not a member of this campaign' }, { status: 403 });
		}

		const character = await campaignService.getCharacter(campaignId, parseInt(userId));
		return json({ character });
	} catch (error) {
		console.error('Failed to get character:', error);
		return json({ error: 'Failed to get character' }, { status: 500 });
	}
};

// POST /api/campaigns/[id]/character - Create/update character for campaign
export const POST: RequestHandler = async ({ cookies, params, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const campaignId = parseInt(params.id);
	if (isNaN(campaignId)) {
		return json({ error: 'Invalid campaign ID' }, { status: 400 });
	}

	try {
		const isInCampaign = await campaignService.isUserInCampaign(campaignId, parseInt(userId));
		if (!isInCampaign) {
			return json({ error: 'Not a member of this campaign' }, { status: 403 });
		}

		const { name, description, className, skills, avatar } = await request.json();

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return json({ error: 'Character name is required' }, { status: 400 });
		}

		const character = await campaignService.upsertCharacter(campaignId, parseInt(userId), {
			name: name.trim(),
			description: description?.trim(),
			className: className?.trim(),
			skills: skills ? JSON.stringify(skills) : undefined,
			avatar
		});

		// Emit character updated event to other players
		emitCharacterUpdated(campaignId, parseInt(userId), character);

		return json({ character }, { status: 201 });
	} catch (error) {
		console.error('Failed to save character:', error);
		return json({ error: 'Failed to save character' }, { status: 500 });
	}
};
