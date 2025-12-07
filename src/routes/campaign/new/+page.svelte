<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	interface SkillTemplate {
		id: string;
		name: string;
		description: string;
	}

	let campaignName = $state('');
	let campaignDescription = $state('');
	let selectedTemplate = $state('dnd-5e');
	let skillTemplates = $state<SkillTemplate[]>([]);
	let generatedPremise = $state('');
	let step = $state<'input' | 'generating' | 'review'>('input');
	let error = $state('');
	let loading = $state(false);

	onMount(async () => {
		try {
			const response = await fetch('/api/skill-templates');
			if (response.ok) {
				const data = await response.json();
				skillTemplates = data.templates;
			}
		} catch (err) {
			console.error('Failed to load skill templates:', err);
		}
	});

	async function generateContent() {
		if (!campaignName.trim()) {
			error = 'Please enter a campaign name';
			return;
		}
		if (!campaignDescription.trim()) {
			error = 'Please describe your campaign';
			return;
		}

		loading = true;
		error = '';
		step = 'generating';

		try {
			const response = await fetch('/api/campaigns/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: campaignName.trim(),
					description: campaignDescription.trim()
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to generate campaign content';
				step = 'input';
				loading = false;
				return;
			}

			generatedPremise = result.premise;
			step = 'review';
			loading = false;
		} catch (err) {
			error = 'Network error. Please try again.';
			step = 'input';
			loading = false;
		}
	}

	async function createCampaign() {
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: campaignName.trim(),
					premise: generatedPremise,
					skillTemplate: selectedTemplate
				})
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to create campaign';
				loading = false;
				return;
			}

			goto(`/campaign/${result.campaign.id}`);
		} catch (err) {
			error = 'Network error. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Create Campaign | Round Table Party</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg-primary)]">
	<!-- Header -->
	<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-4">
		<div class="max-w-4xl mx-auto flex items-center gap-4">
			<a href="/" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="text-xl font-bold text-[var(--text-primary)]">Create Campaign</h1>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-4xl mx-auto px-6 py-8">
		{#if error}
			<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-6">
				{error}
			</div>
		{/if}

		{#if step === 'input'}
			<!-- Step 1: Input -->
			<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-8">
				<div class="mb-6">
					<h2 class="text-lg font-semibold text-[var(--text-primary)] mb-2">Campaign Details</h2>
					<p class="text-[var(--text-muted)]">Give your campaign a name and describe the kind of roleplay you want.</p>
				</div>

				<div class="space-y-6">
					<div>
						<label for="campaignName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							Campaign Name
						</label>
						<input
							id="campaignName"
							type="text"
							bind:value={campaignName}
							placeholder="e.g., The Dragon's Curse, Shadows of Nevermore"
							class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-lg"
						/>
					</div>

					<div>
						<label for="campaignDescription" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							Describe Your Campaign
						</label>
						<textarea
							id="campaignDescription"
							bind:value={campaignDescription}
							placeholder="Write a few sentences about the kind of roleplay you want. Include the setting, tone, themes, and any specific elements you'd like.

Example: 'A dark fantasy adventure where heroes explore a haunted castle to break an ancient curse. Gritty and dangerous, with moral dilemmas and gothic horror elements. Players are mercenaries hired by a desperate noble.'"
							rows="8"
							class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
						></textarea>
						<p class="text-sm text-[var(--text-muted)] mt-2">
							The AI will expand this into a full campaign premise and opening scene.
						</p>
					</div>

					<div>
						<label class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
							Skill System
						</label>
						<div class="grid gap-3">
							{#each skillTemplates as template}
								<button
									type="button"
									onclick={() => selectedTemplate = template.id}
									class="text-left p-4 rounded-xl border-2 transition {selectedTemplate === template.id
										? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
										: 'border-[var(--border-primary)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'}"
								>
									<div class="font-medium text-[var(--text-primary)]">{template.name}</div>
									<div class="text-sm text-[var(--text-muted)] mt-1">{template.description}</div>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<div class="flex gap-4 mt-8">
					<a
						href="/"
						class="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-primary)] transition font-medium"
					>
						Cancel
					</a>
					<button
						onclick={generateContent}
						disabled={loading || !campaignName.trim() || !campaignDescription.trim()}
						class="flex-1 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
					>
						Generate Campaign
					</button>
				</div>
			</div>

		{:else if step === 'generating'}
			<!-- Step 2: Generating -->
			<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-12">
				<div class="text-center">
					<div class="w-16 h-16 mx-auto mb-6 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"></div>
					<h2 class="text-xl font-semibold text-[var(--text-primary)] mb-2">Generating Your Campaign</h2>
					<p class="text-[var(--text-muted)]">Creating the campaign premise...</p>
				</div>
			</div>

		{:else if step === 'review'}
			<!-- Step 3: Review Premise -->
			<div class="space-y-6">
				<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-8">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h2 class="text-lg font-semibold text-[var(--text-primary)]">Campaign Premise</h2>
							<p class="text-sm text-[var(--text-muted)]">This will be shown to players when they join. The opening scene will be generated when you start the campaign.</p>
						</div>
					</div>
					<textarea
						bind:value={generatedPremise}
						rows="12"
						class="w-full px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none"
					></textarea>
				</div>

				<div class="flex gap-4">
					<button
						onclick={() => step = 'input'}
						class="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] transition font-medium"
					>
						Back
					</button>
					<button
						onclick={generateContent}
						disabled={loading}
						class="px-6 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-secondary)] transition font-medium"
					>
						Regenerate
					</button>
					<button
						onclick={createCampaign}
						disabled={loading}
						class="flex-1 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
					>
						{loading ? 'Creating...' : 'Create Campaign'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
