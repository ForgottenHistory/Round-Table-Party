import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSkillTemplateList } from '$lib/server/services/skillTemplateService';

// GET /api/skill-templates - List available skill templates
export const GET: RequestHandler = async () => {
	try {
		const templates = await getSkillTemplateList();
		return json({ templates });
	} catch (error) {
		console.error('Failed to get skill templates:', error);
		return json({ error: 'Failed to get skill templates' }, { status: 500 });
	}
};
