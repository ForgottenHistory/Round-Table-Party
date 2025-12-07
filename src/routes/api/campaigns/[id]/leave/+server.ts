import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { emitPlayerLeft } from '$lib/server/socket';

// POST /api/campaigns/[id]/leave - Leave a campaign
export const POST: RequestHandler = async ({ cookies, params }) => {
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

		// Check if user is the host - hosts can't leave, they must delete the campaign
		const campaign = await campaignService.getCampaignById(campaignId);
		if (campaign && campaign.hostUserId === parseInt(userId)) {
			return json({ error: 'Host cannot leave. Delete the campaign instead.' }, { status: 400 });
		}

		const left = await campaignService.leaveCampaign(campaignId, parseInt(userId));

		if (left) {
			// Emit player left event to other players
			emitPlayerLeft(campaignId, parseInt(userId));
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to leave campaign:', error);
		return json({ error: 'Failed to leave campaign' }, { status: 500 });
	}
};
