import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { emitCampaignDeleted } from '$lib/server/socket';

// GET /api/campaigns/[id] - Get campaign details with players and messages
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
		// Check if user is in campaign
		const isInCampaign = await campaignService.isUserInCampaign(campaignId, parseInt(userId));
		if (!isInCampaign) {
			return json({ error: 'Not a member of this campaign' }, { status: 403 });
		}

		const campaign = await campaignService.getCampaignById(campaignId);
		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		const players = await campaignService.getCampaignPlayers(campaignId);
		const messages = await campaignService.getMessages(campaignId);
		const character = await campaignService.getCharacter(campaignId, parseInt(userId));
		const submissionStatus = await campaignService.getSubmissionStatus(campaignId);

		return json({
			campaign,
			players,
			messages,
			character,
			submissionStatus,
			isHost: campaign.hostUserId === parseInt(userId)
		});
	} catch (error) {
		console.error('Failed to get campaign:', error);
		return json({ error: 'Failed to get campaign' }, { status: 500 });
	}
};

// DELETE /api/campaigns/[id] - Delete campaign (host only)
export const DELETE: RequestHandler = async ({ cookies, params }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const campaignId = parseInt(params.id);
	if (isNaN(campaignId)) {
		return json({ error: 'Invalid campaign ID' }, { status: 400 });
	}

	try {
		// Emit deletion event BEFORE deleting (so users are still in the room)
		emitCampaignDeleted(campaignId);

		const deleted = await campaignService.deleteCampaign(campaignId, parseInt(userId));
		if (!deleted) {
			return json({ error: 'Campaign not found or not authorized' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete campaign:', error);
		return json({ error: 'Failed to delete campaign' }, { status: 500 });
	}
};
