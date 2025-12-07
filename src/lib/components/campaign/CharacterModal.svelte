<script lang="ts">
	interface GeneratedClass {
		name: string;
		description: string;
		skills: Record<string, number>;
	}

	interface Props {
		show: boolean;
		campaignId: number;
		onSave: (data: { name: string; description: string; className: string; skills: Record<string, number> }) => Promise<void>;
	}

	let { show, campaignId, onSave }: Props = $props();

	// Form state
	let characterName = $state('');
	let characterDescription = $state('');
	let step = $state<'input' | 'generating' | 'select' | 'backstory' | 'review'>('input');
	let generatedClasses = $state<GeneratedClass[]>([]);
	let selectedClass = $state<GeneratedClass | null>(null);
	let backstory = $state('');
	let error = $state('');
	let loading = $state(false);

	function reset() {
		characterName = '';
		characterDescription = '';
		step = 'input';
		generatedClasses = [];
		selectedClass = null;
		backstory = '';
		error = '';
		loading = false;
	}

	async function generateClasses() {
		if (!characterName.trim() || !characterDescription.trim()) {
			error = 'Please enter both name and description';
			return;
		}

		loading = true;
		error = '';
		step = 'generating';

		try {
			const response = await fetch(`/api/campaigns/${campaignId}/generate-classes`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					characterName: characterName.trim(),
					characterDescription: characterDescription.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to generate classes';
				step = 'input';
				loading = false;
				return;
			}

			generatedClasses = result.classes;
			step = 'select';
		} catch (err) {
			error = 'Network error. Please try again.';
			step = 'input';
		} finally {
			loading = false;
		}
	}

	async function generateBackstory() {
		if (!selectedClass) return;

		loading = true;
		error = '';
		step = 'backstory';

		try {
			const response = await fetch(`/api/campaigns/${campaignId}/generate-backstory`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					characterName: characterName.trim(),
					characterDescription: characterDescription.trim(),
					className: selectedClass.name
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to generate backstory';
				step = 'select';
				loading = false;
				return;
			}

			backstory = result.backstory;
			step = 'review';
		} catch (err) {
			error = 'Network error. Please try again.';
			step = 'select';
		} finally {
			loading = false;
		}
	}

	async function saveCharacter() {
		if (!selectedClass) return;

		loading = true;
		error = '';

		try {
			await onSave({
				name: characterName.trim(),
				description: backstory || characterDescription.trim(),
				className: selectedClass.name,
				skills: selectedClass.skills
			});
			reset();
		} catch (err) {
			error = 'Failed to save character';
		} finally {
			loading = false;
		}
	}

	// Get top skills for display (show + for positive, - for negative)
	function getTopSkills(skills: Record<string, number>, count = 4): string[] {
		return Object.entries(skills)
			.sort((a, b) => b[1] - a[1])
			.slice(0, count)
			.map(([name, value]) => `${name} ${value >= 0 ? '+' : ''}${value}`);
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
			{#if step === 'input'}
				<!-- Step 1: Name & Description -->
				<h2 class="text-xl font-bold text-[var(--text-primary)] mb-2">Create Your Character</h2>
				<p class="text-[var(--text-muted)] mb-6">Describe your character and we'll generate class options for you.</p>

				{#if error}
					<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
						{error}
					</div>
				{/if}

				<div class="space-y-4 mb-6">
					<div>
						<label for="charName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							Character Name
						</label>
						<input
							id="charName"
							type="text"
							bind:value={characterName}
							placeholder="e.g., Gandalf, Aria Shadowmend"
							class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
						/>
					</div>

					<div>
						<label for="charDesc" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							Character Description
						</label>
						<textarea
							id="charDesc"
							bind:value={characterDescription}
							placeholder="Describe your character's background, personality, and abilities. What kind of adventurer are they?

Example: 'A wise old wizard who has spent decades studying forbidden magic. Prefers diplomacy over combat but is formidable when provoked. Has a mysterious past connected to the ancient elves.'"
							rows="5"
							class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
						></textarea>
					</div>
				</div>

				<button
					onclick={generateClasses}
					disabled={!characterName.trim() || !characterDescription.trim() || loading}
					class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					Generate Class Options
				</button>

			{:else if step === 'generating'}
				<!-- Step 2: Generating Classes -->
				<div class="text-center py-12">
					<div class="w-16 h-16 mx-auto mb-6 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
					<h2 class="text-xl font-semibold text-[var(--text-primary)] mb-2">Finding Classes</h2>
					<p class="text-[var(--text-muted)]">Matching classes for {characterName}...</p>
				</div>

			{:else if step === 'select'}
				<!-- Step 3: Select Class -->
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-xl font-bold text-[var(--text-primary)]">Choose Your Class</h2>
						<p class="text-[var(--text-muted)]">Select a class for {characterName}</p>
					</div>
					<button
						onclick={() => step = 'input'}
						class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
					>
						&larr; Back
					</button>
				</div>

				{#if error}
					<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
						{error}
					</div>
				{/if}

				<div class="grid gap-3 mb-6">
					{#each generatedClasses as cls}
						<button
							type="button"
							onclick={() => selectedClass = cls}
							class="text-left p-4 rounded-xl border-2 transition {selectedClass === cls
								? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
								: 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'}"
						>
							<div class="font-semibold text-[var(--text-primary)]">{cls.name}</div>
							<div class="text-sm text-[var(--text-muted)] mt-1">{cls.description}</div>
							<div class="flex flex-wrap gap-2 mt-2">
								{#each getTopSkills(cls.skills) as skill}
									<span class="text-xs px-2 py-1 bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)]">
										{skill}
									</span>
								{/each}
							</div>
						</button>
					{/each}
				</div>

				<button
					onclick={generateBackstory}
					disabled={!selectedClass || loading}
					class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					Continue with {selectedClass?.name || 'Class'}
				</button>

			{:else if step === 'backstory'}
				<!-- Step 4: Generating Backstory -->
				<div class="text-center py-12">
					<div class="w-16 h-16 mx-auto mb-6 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
					<h2 class="text-xl font-semibold text-[var(--text-primary)] mb-2">Writing Backstory</h2>
					<p class="text-[var(--text-muted)]">Crafting the tale of {characterName} the {selectedClass?.name}...</p>
				</div>

			{:else if step === 'review'}
				<!-- Step 5: Review & Edit Backstory -->
				<div class="flex items-center justify-between mb-4">
					<div>
						<h2 class="text-xl font-bold text-[var(--text-primary)]">{characterName}</h2>
						<p class="text-[var(--text-muted)]">{selectedClass?.name}</p>
					</div>
					<button
						onclick={() => step = 'select'}
						class="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
					>
						&larr; Change Class
					</button>
				</div>

				{#if error}
					<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
						{error}
					</div>
				{/if}

				<div class="mb-4">
					<label for="backstory" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
						Backstory
					</label>
					<textarea
						id="backstory"
						bind:value={backstory}
						rows="8"
						class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					></textarea>
					<p class="text-xs text-[var(--text-muted)] mt-2">You can edit the backstory before saving.</p>
				</div>

				<div class="flex gap-3">
					<button
						onclick={generateBackstory}
						disabled={loading}
						class="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-primary)] transition font-medium"
					>
						Regenerate
					</button>
					<button
						onclick={saveCharacter}
						disabled={loading}
						class="flex-1 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
					>
						{loading ? 'Creating...' : 'Create Character'}
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
