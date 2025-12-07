<script lang="ts">
	interface Character {
		id: number;
		name: string;
		description: string | null;
		className: string | null;
		skills: string | null;
		avatar: string | null;
	}

	interface SkillTemplate {
		id: string;
		name: string;
		categories: Record<string, {
			description: string;
			skills: Array<{ name: string; description: string }>;
		}>;
	}

	interface Props {
		character: Character | null;
		skillTemplate: SkillTemplate | null;
	}

	let { character, skillTemplate }: Props = $props();

	// Tab state
	let activeTab = $state<'character' | 'skills'>('character');

	// Parse skills from JSON string
	let skills = $derived.by<Record<string, number>>(() => {
		if (!character?.skills) return {};
		try {
			return JSON.parse(character.skills);
		} catch {
			return {};
		}
	});

	// Group skills by category from template
	let skillsByCategory = $derived.by(() => {
		if (!skillTemplate?.categories) {
			// Fallback: just show all skills sorted by value
			return [{
				name: 'Skills',
				skills: Object.entries(skills).sort((a, b) => b[1] - a[1])
			}];
		}

		const categories: Array<{ name: string; skills: Array<[string, number]> }> = [];

		for (const [categoryName, category] of Object.entries(skillTemplate.categories)) {
			const categorySkills: Array<[string, number]> = [];
			for (const skill of category.skills) {
				if (skill.name in skills) {
					categorySkills.push([skill.name, skills[skill.name]]);
				}
			}
			if (categorySkills.length > 0) {
				categories.push({ name: categoryName, skills: categorySkills });
			}
		}

		return categories;
	});

	// Get skill color based on value
	function getSkillColor(value: number): string {
		if (value >= 4) return 'text-green-400';
		if (value >= 2) return 'text-green-300';
		if (value >= 1) return 'text-emerald-300';
		if (value === 0) return 'text-[var(--text-muted)]';
		if (value >= -1) return 'text-orange-300';
		if (value >= -3) return 'text-orange-400';
		return 'text-red-400';
	}

	// Format skill value with + or -
	function formatValue(value: number): string {
		return value >= 0 ? `+${value}` : `${value}`;
	}
</script>

<div class="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-primary)] flex flex-col">
	{#if character}
		<!-- Tabs -->
		<div class="flex border-b border-[var(--border-primary)]">
			<button
				onclick={() => activeTab = 'character'}
				class="flex-1 py-3 text-sm font-medium transition {activeTab === 'character'
					? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
					: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
			>
				Character
			</button>
			<button
				onclick={() => activeTab = 'skills'}
				class="flex-1 py-3 text-sm font-medium transition {activeTab === 'skills'
					? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
					: 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}"
			>
				Skills
			</button>
		</div>

		<!-- Tab Content -->
		<div class="flex-1 overflow-y-auto">
			{#if activeTab === 'character'}
				<!-- Character Info Tab -->
				<div class="p-4 border-b border-[var(--border-primary)]">
					<div class="flex items-center gap-3">
						{#if character.avatar}
							<img
								src={character.avatar}
								alt={character.name}
								class="w-12 h-12 rounded-full object-cover"
							/>
						{:else}
							<div class="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
								<span class="text-white text-lg font-bold">{character.name.charAt(0)}</span>
							</div>
						{/if}
						<div class="flex-1 min-w-0">
							<h2 class="font-bold text-[var(--text-primary)] truncate">{character.name}</h2>
							<p class="text-sm text-[var(--accent-primary)]">{character.className || 'Adventurer'}</p>
						</div>
					</div>
				</div>

				{#if character.description}
					<div class="p-4">
						<h3 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">Backstory</h3>
						<p class="text-sm text-[var(--text-secondary)]">{character.description}</p>
					</div>
				{/if}
			{:else}
				<!-- Skills Tab -->
				<div class="p-4 space-y-4">
					{#each skillsByCategory as category}
						<div>
							<h4 class="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">{category.name}</h4>
							<div class="space-y-1">
								{#each category.skills as [skillName, value]}
									<div class="flex items-center justify-between py-0.5">
										<span class="text-sm text-[var(--text-secondary)] truncate">{skillName}</span>
										<span class="text-sm font-mono font-medium {getSkillColor(value)}">{formatValue(value)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Character -->
		<div class="flex-1 flex flex-col items-center justify-center p-4 text-center">
			<div class="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
				<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
			</div>
			<p class="text-[var(--text-muted)] text-sm">No character created</p>
		</div>
	{/if}
</div>
