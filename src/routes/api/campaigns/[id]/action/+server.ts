import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { emitMessage } from '$lib/server/socket';

// POST /api/campaigns/[id]/action - Submit player action
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
		// Check if user is in campaign
		const isInCampaign = await campaignService.isUserInCampaign(campaignId, parseInt(userId));
		if (!isInCampaign) {
			return json({ error: 'Not a member of this campaign' }, { status: 403 });
		}

		// Check campaign phase
		const campaign = await campaignService.getCampaignById(campaignId);
		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		if (campaign.phase !== 'collecting_actions') {
			return json({ error: 'Cannot submit action - GM is responding' }, { status: 400 });
		}

		// Check if user has a character
		const character = await campaignService.getCharacter(campaignId, parseInt(userId));
		if (!character) {
			return json({ error: 'You must create a character first' }, { status: 400 });
		}

		const { content } = await request.json();

		if (!content || typeof content !== 'string' || content.trim().length === 0) {
			return json({ error: 'Action content is required' }, { status: 400 });
		}

		const message = await campaignService.addPlayerAction(
			campaignId,
			parseInt(userId),
			content.trim()
		);

		// Emit to other players via Socket.IO
		emitMessage(campaignId, message);

		const submissionStatus = await campaignService.getSubmissionStatus(campaignId);

		return json({ message, submissionStatus }, { status: 201 });
	} catch (error) {
		console.error('Failed to submit action:', error);
		return json({ error: 'Failed to submit action' }, { status: 500 });
	}
};
