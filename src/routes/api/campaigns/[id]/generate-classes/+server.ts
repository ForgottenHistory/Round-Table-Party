import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { campaignService } from '$lib/server/services/campaignService';
import { decisionEngineSettingsService } from '$lib/server/services/decisionEngineSettingsService';
import { callLlm } from '$lib/server/services/llmCallService';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface ClassTemplate {
	id: string;
	name: string;
	description: string;
	skills: Record<string, number>;
}

interface ClassTemplateFile {
	id: string;
	classes: ClassTemplate[];
}

// POST /api/campaigns/[id]/generate-classes - Recommend classes for a character
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
		const { characterName, characterDescription } = await request.json();

		if (!characterName?.trim()) {
			return json({ error: 'Character name is required' }, { status: 400 });
		}
		if (!characterDescription?.trim()) {
			return json({ error: 'Character description is required' }, { status: 400 });
		}

		// Get campaign to find skill template
		const campaign = await campaignService.getCampaignById(campaignId);
		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		// Load class templates for this skill template
		const templateId = campaign.skillTemplate || 'dnd-5e';
		const templatePath = join(process.cwd(), 'data', 'class-templates', `${templateId}.json`);

		let classTemplates: ClassTemplateFile;
		try {
			const content = await readFile(templatePath, 'utf-8');
			classTemplates = JSON.parse(content);
		} catch {
			return json({ error: 'Class templates not found for this campaign' }, { status: 404 });
		}

		// Build class list for the prompt
		const classList = classTemplates.classes
			.map((c, i) => `${i + 1}. ${c.name}: ${c.description}`)
			.join('\n');

		// Simple prompt for decision LLM
		const prompt = `Character: ${characterName.trim()}
Description: ${characterDescription.trim()}

Available classes:
${classList}

Pick the 6 best matching classes for this character. Output only the numbers separated by commas, best match first.
Example: 3,7,1,12,5,9`;

		const settings = await decisionEngineSettingsService.getUserSettings(parseInt(userId));

		const response = await callLlm({
			messages: [{ role: 'user', content: prompt }],
			settings,
			logType: 'campaign-class-recommendation',
			logCharacterName: 'Class Recommender',
			logUserName: characterName.trim()
		});

		// Parse the response - extract numbers
		const numbers = response.content.match(/\d+/g);
		if (!numbers || numbers.length === 0) {
			// Fallback: return first 6 classes
			const classes = classTemplates.classes.slice(0, 6);
			return json({ classes });
		}

		// Map numbers to classes (1-indexed in prompt)
		const recommendedClasses: ClassTemplate[] = [];
		const seen = new Set<number>();

		for (const numStr of numbers) {
			const idx = parseInt(numStr) - 1; // Convert to 0-indexed
			if (idx >= 0 && idx < classTemplates.classes.length && !seen.has(idx)) {
				recommendedClasses.push(classTemplates.classes[idx]);
				seen.add(idx);
				if (recommendedClasses.length >= 6) break;
			}
		}

		// If we don't have 6, fill with remaining classes
		if (recommendedClasses.length < 6) {
			for (let i = 0; i < classTemplates.classes.length && recommendedClasses.length < 6; i++) {
				if (!seen.has(i)) {
					recommendedClasses.push(classTemplates.classes[i]);
					seen.add(i);
				}
			}
		}

		return json({ classes: recommendedClasses });
	} catch (error) {
		console.error('Failed to recommend classes:', error);
		return json({ error: 'Failed to recommend classes' }, { status: 500 });
	}
};
