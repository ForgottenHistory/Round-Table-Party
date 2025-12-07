import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export interface Skill {
	name: string;
	description: string;
}

export interface SkillCategory {
	description: string;
	skills: Skill[];
}

export interface SkillTemplate {
	id: string;
	name: string;
	description: string;
	categories: Record<string, SkillCategory>;
}

export interface SkillTemplateSummary {
	id: string;
	name: string;
	description: string;
}

const TEMPLATES_DIR = join(process.cwd(), 'data', 'skill-templates');

// Cache templates in memory
let templatesCache: Map<string, SkillTemplate> | null = null;

/**
 * Load all skill templates from the data directory
 */
async function loadTemplates(): Promise<Map<string, SkillTemplate>> {
	if (templatesCache) {
		return templatesCache;
	}

	templatesCache = new Map();

	try {
		const files = await readdir(TEMPLATES_DIR);
		const jsonFiles = files.filter(f => f.endsWith('.json'));

		for (const file of jsonFiles) {
			try {
				const content = await readFile(join(TEMPLATES_DIR, file), 'utf-8');
				const template = JSON.parse(content) as SkillTemplate;
				templatesCache.set(template.id, template);
			} catch (err) {
				console.error(`Failed to load skill template ${file}:`, err);
			}
		}
	} catch (err) {
		console.error('Failed to read skill templates directory:', err);
	}

	return templatesCache;
}

/**
 * Get list of available skill templates (summary only)
 */
export async function getSkillTemplateList(): Promise<SkillTemplateSummary[]> {
	const templates = await loadTemplates();
	return Array.from(templates.values()).map(t => ({
		id: t.id,
		name: t.name,
		description: t.description
	}));
}

/**
 * Get a specific skill template by ID
 */
export async function getSkillTemplate(id: string): Promise<SkillTemplate | null> {
	const templates = await loadTemplates();
	return templates.get(id) || null;
}

/**
 * Get all skill names from a template (flattened)
 */
export async function getSkillNames(templateId: string): Promise<string[]> {
	const template = await getSkillTemplate(templateId);
	if (!template) return [];

	const names: string[] = [];
	for (const category of Object.values(template.categories)) {
		for (const skill of category.skills) {
			names.push(skill.name);
		}
	}
	return names;
}

/**
 * Clear the template cache (useful for development)
 */
export function clearTemplateCache(): void {
	templatesCache = null;
}
