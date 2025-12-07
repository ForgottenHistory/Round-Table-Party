import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { contentLlmService } from '$lib/server/services/contentLlmService';
import { emitMessage, emitCampaignStarted } from '$lib/server/socket';
import { db } from '$lib/server/db';
import { campaignCharacters } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/campaigns/[id]/start - Start the campaign (host only)
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
		// Check if user is host
		const campaign = await campaignService.getCampaignById(campaignId);
		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		if (campaign.hostUserId !== parseInt(userId)) {
			return json({ error: 'Only the host can start the campaign' }, { status: 403 });
		}

		if (campaign.started) {
			return json({ error: 'Campaign already started' }, { status: 400 });
		}

		// Get all players and their full character details
		const players = await campaignService.getCampaignPlayers(campaignId);

		// Get full character data for all players
		const characters = await db
			.select()
			.from(campaignCharacters)
			.where(eq(campaignCharacters.campaignId, campaignId));

		if (characters.length === 0) {
			return json({ error: 'At least one player must have a character' }, { status: 400 });
		}

		// Build detailed character info for the prompt
		const characterDetails = characters.map(char => {
			const skills = char.skills ? JSON.parse(char.skills) : {};
			const skillList = Object.entries(skills)
				.map(([skill, value]) => `${skill}: ${value}`)
				.join(', ');

			return `- **${char.name}** (${char.className || 'Adventurer'})
  Description: ${char.description || 'No description provided'}
  Skills: ${skillList || 'None'}`;
		}).join('\n');

		// Generate greeting using contentLlmService
		const greeting = await contentLlmService.generateCampaignGreeting({
			userId: parseInt(userId),
			campaignName: campaign.name,
			premise: campaign.premise || '',
			characters: characterDetails
		});

		// Start the campaign
		await campaignService.startCampaign(campaignId, parseInt(userId));

		// Set greeting and add as first message
		await campaignService.setGreeting(campaignId, greeting);

		// Get the greeting message to emit
		const messages = await campaignService.getMessages(campaignId, 1);
		const greetingMessage = messages[0];

		// Emit events to all players
		emitCampaignStarted(campaignId);
		if (greetingMessage) {
			emitMessage(campaignId, greetingMessage);
		}

		return json({
			success: true,
			greeting,
			message: greetingMessage
		});
	} catch (error) {
		console.error('Failed to start campaign:', error);
		return json({ error: 'Failed to start campaign' }, { status: 500 });
	}
};
