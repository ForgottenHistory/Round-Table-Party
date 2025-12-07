import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { contentLlmSettingsService } from '$lib/server/services/contentLlmSettingsService';
import { callLlm } from '$lib/server/services/llmCallService';

// POST /api/campaigns/[id]/generate-backstory - Generate character backstory
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
		const { characterName, characterDescription, className } = await request.json();

		if (!characterName?.trim()) {
			return json({ error: 'Character name is required' }, { status: 400 });
		}
		if (!characterDescription?.trim()) {
			return json({ error: 'Character description is required' }, { status: 400 });
		}
		if (!className?.trim()) {
			return json({ error: 'Class name is required' }, { status: 400 });
		}

		// Get campaign for premise context
		const campaign = await campaignService.getCampaignById(campaignId);
		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		const prompt = `Write a short backstory (2-3 paragraphs) for this RPG character:

Name: ${characterName.trim()}
Class: ${className.trim()}
Description: ${characterDescription.trim()}
${campaign.premise ? `\nCampaign Setting: ${campaign.premise}` : ''}

Write in third person. Focus on:
- Their origin and how they became a ${className}
- A defining moment or motivation
- Why they might be joining this adventure

Keep it concise and engaging. No headers or formatting.`;

		const settings = await contentLlmSettingsService.getUserSettings(parseInt(userId));

		const response = await callLlm({
			messages: [{ role: 'user', content: prompt }],
			settings,
			logType: 'campaign-backstory-generation',
			logCharacterName: characterName.trim(),
			logUserName: 'System'
		});

		return json({ backstory: response.content.trim() });
	} catch (error) {
		console.error('Failed to generate backstory:', error);
		return json({ error: 'Failed to generate backstory' }, { status: 500 });
	}
};
