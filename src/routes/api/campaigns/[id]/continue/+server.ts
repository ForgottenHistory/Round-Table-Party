import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { llmService } from '$lib/server/services/llmService';
import { emitMessage } from '$lib/server/socket';

// POST /api/campaigns/[id]/continue - Trigger GM response (host only)
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
			return json({ error: 'Only the host can continue the game' }, { status: 403 });
		}

		if (campaign.phase !== 'collecting_actions') {
			return json({ error: 'GM is already responding' }, { status: 400 });
		}

		// Set phase to responding
		await campaignService.setPhase(campaignId, 'gm_responding');

		try {
			// Get players and their characters
			const players = await campaignService.getCampaignPlayers(campaignId);

			// Get recent messages for context
			const messages = await campaignService.getMessages(campaignId);

			// Build the GM prompt
			const systemPrompt = buildGMSystemPrompt(campaign.name, players);
			const conversationHistory = buildConversationHistory(messages, players);

			// Build messages array for LLM
			const llmMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
				{ role: 'system', content: systemPrompt },
				...conversationHistory
			];

			// Call LLM (uses host's settings)
			const response = await llmService.createChatCompletion({
				messages: llmMessages,
				userId: parseInt(userId)
			});

			// Add GM narrative
			const gmMessage = await campaignService.addGMNarrative(campaignId, response.content);

			// Emit to all players via Socket.IO
			emitMessage(campaignId, gmMessage);

			// Phase is reset to collecting_actions by addGMNarrative

			return json({
				message: gmMessage,
				submissionStatus: await campaignService.getSubmissionStatus(campaignId)
			});
		} catch (llmError) {
			// Reset phase if LLM fails
			await campaignService.setPhase(campaignId, 'collecting_actions');
			throw llmError;
		}
	} catch (error) {
		console.error('Failed to continue game:', error);
		return json({ error: 'Failed to generate GM response' }, { status: 500 });
	}
};

function buildGMSystemPrompt(
	campaignName: string,
	players: { userId: number; displayName: string; characterName: string | null }[]
): string {
	const playerList = players
		.filter((p) => p.characterName)
		.map((p) => `- ${p.characterName}`)
		.join('\n');

	return `You are the Game Master for a multiplayer roleplay session called "${campaignName}".

## Players
${playerList || '(No characters yet)'}

## Your Role
- Narrate the story and describe the world
- React to player actions fairly and dramatically
- Keep all players engaged - address each player's action
- Create interesting situations and challenges
- Maintain consistency with previous events

## Rules
- Never control player characters - only describe outcomes of their actions
- Be descriptive but concise (2-4 paragraphs typically)
- End your narration with a situation that invites player response
- If a player's action would reasonably fail, describe why
- Keep the tone appropriate to the story being told`;
}

function buildConversationHistory(
	messages: { role: string; content: string; userId: number | null }[],
	players: { userId: number; characterName: string | null }[]
): { role: 'user' | 'assistant'; content: string }[] {
	const playerMap = new Map<number, string>();
	for (const p of players) {
		if (p.characterName) {
			playerMap.set(p.userId, p.characterName);
		}
	}

	return messages.map((msg) => {
		if (msg.role === 'gm') {
			return { role: 'assistant' as const, content: msg.content };
		} else {
			const characterName = msg.userId ? playerMap.get(msg.userId) || 'Unknown' : 'Unknown';
			return {
				role: 'user' as const,
				content: `[${characterName}]: ${msg.content}`
			};
		}
	});
}
