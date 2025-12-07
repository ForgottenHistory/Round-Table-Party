import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { emitPlayerJoined } from '$lib/server/socket';

// POST /api/campaigns/join - Join a campaign via invite code
export const POST: RequestHandler = async ({ cookies, request }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	try {
		const { inviteCode } = await request.json();

		if (!inviteCode || typeof inviteCode !== 'string') {
			return json({ error: 'Invite code is required' }, { status: 400 });
		}

		const campaign = await campaignService.getCampaignByInviteCode(inviteCode.trim());
		if (!campaign) {
			return json({ error: 'Invalid invite code' }, { status: 404 });
		}

		// Check if already in campaign
		const wasAlreadyMember = await campaignService.isUserInCampaign(campaign.id, parseInt(userId));

		await campaignService.joinCampaign(campaign.id, parseInt(userId));

		// Emit player joined event if this is a new join
		if (!wasAlreadyMember) {
			// Get the full player data including colorIndex
			const players = await campaignService.getCampaignPlayers(campaign.id);
			const newPlayer = players.find(p => p.userId === parseInt(userId));
			if (newPlayer) {
				emitPlayerJoined(campaign.id, newPlayer);
			}
		}

		// Check if user has a character for this campaign
		const character = await campaignService.getCharacter(campaign.id, parseInt(userId));

		return json({
			campaign,
			needsCharacter: !character
		});
	} catch (error) {
		console.error('Failed to join campaign:', error);
		return json({ error: 'Failed to join campaign' }, { status: 500 });
	}
};
