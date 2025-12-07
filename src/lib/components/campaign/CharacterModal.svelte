<script lang="ts">
	interface Props {
		show: boolean;
		onSave: (name: string) => Promise<void>;
	}

	let { show, onSave }: Props = $props();

	let characterName = $state('');
	let saving = $state(false);

	async function saveCharacter() {
		if (!characterName.trim() || saving) return;

		saving = true;
		try {
			await onSave(characterName.trim());
			characterName = '';
		} finally {
			saving = false;
		}
	}
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 w-full max-w-md mx-4">
			<h2 class="text-xl font-bold text-[var(--text-primary)] mb-4">Create Your Character</h2>
			<p class="text-[var(--text-muted)] mb-4">Enter a name for your character in this campaign.</p>

			<div class="mb-4">
				<label for="charName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Character Name
				</label>
				<input
					id="charName"
					type="text"
					bind:value={characterName}
					placeholder="Enter character name..."
					class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
					onkeydown={(e) => e.key === 'Enter' && saveCharacter()}
				/>
			</div>

			<button
				onclick={saveCharacter}
				disabled={!characterName.trim() || saving}
				class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
			>
				{saving ? 'Creating...' : 'Create Character'}
			</button>
		</div>
	</div>
{/if}
