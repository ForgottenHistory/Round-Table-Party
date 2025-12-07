import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUserById } from '$lib/server/auth';
import { campaignService } from '$lib/server/services/campaignService';

export const load: PageServerLoad = async ({ cookies, params }) => {
	const userId = cookies.get('userId');

	if (!userId) {
		throw redirect(303, '/login');
	}

	const user = await getUserById(parseInt(userId));

	if (!user) {
		cookies.delete('userId', { path: '/' });
		throw redirect(303, '/login');
	}

	const campaignId = parseInt(params.id);
	if (isNaN(campaignId)) {
		throw redirect(303, '/');
	}

	// Check if user is in this campaign
	const isInCampaign = await campaignService.isUserInCampaign(campaignId, parseInt(userId));
	if (!isInCampaign) {
		throw redirect(303, '/');
	}

	const campaign = await campaignService.getCampaignById(campaignId);
	if (!campaign) {
		throw redirect(303, '/');
	}

	const players = await campaignService.getCampaignPlayers(campaignId);
	const messages = await campaignService.getMessages(campaignId);
	const character = await campaignService.getCharacter(campaignId, parseInt(userId));
	const submissionStatus = await campaignService.getSubmissionStatus(campaignId);

	return {
		user,
		campaign,
		players,
		messages,
		character,
		submissionStatus,
		isHost: campaign.hostUserId === parseInt(userId)
	};
};
