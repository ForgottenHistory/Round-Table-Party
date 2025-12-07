<script lang="ts">
	interface Props {
		characterName: string | null;
		hasCharacter: boolean;
		hasSubmitted: boolean;
		gmResponding: boolean;
		isHost: boolean;
		canTriggerGM: boolean;
		triggeringGM: boolean;
		onCreateCharacter: () => void;
		onSubmitAction: (action: string) => void;
		onTriggerGM: () => void;
	}

	let {
		characterName,
		hasCharacter,
		hasSubmitted,
		gmResponding,
		isHost,
		canTriggerGM,
		triggeringGM,
		onCreateCharacter,
		onSubmitAction,
		onTriggerGM
	}: Props = $props();

	let actionText = $state('');
	let sendingAction = $state(false);

	let canSubmit = $derived(
		!gmResponding && !hasSubmitted && hasCharacter && actionText.trim().length > 0
	);

	async function submitAction() {
		if (!canSubmit || sendingAction) return;

		sendingAction = true;
		try {
			await onSubmitAction(actionText.trim());
			actionText = '';
		} finally {
			sendingAction = false;
		}
	}
</script>

<div class="bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] p-4">
	<div class="max-w-3xl mx-auto">
		{#if !hasCharacter}
			<div class="text-center py-4">
				<button
					onclick={onCreateCharacter}
					class="px-6 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 transition"
				>
					Create Your Character
				</button>
			</div>
		{:else if gmResponding}
			<div class="text-center py-4 text-[var(--text-muted)]">
				Waiting for the Game Master...
			</div>
		{:else if hasSubmitted}
			<div class="text-center py-4 text-[var(--text-muted)]">
				Action submitted. Waiting for other players...
				{#if isHost && canTriggerGM}
					<button
						onclick={onTriggerGM}
						disabled={triggeringGM}
						class="ml-4 px-4 py-2 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
					>
						{triggeringGM ? 'Processing...' : 'Continue'}
					</button>
				{/if}
			</div>
		{:else}
			<div class="flex gap-3">
				<input
					type="text"
					bind:value={actionText}
					placeholder="What does {characterName} do?"
					class="flex-1 px-4 py-3 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
					onkeydown={(e) => e.key === 'Enter' && !e.shiftKey && submitAction()}
					disabled={sendingAction}
				/>
				<button
					onclick={submitAction}
					disabled={!canSubmit || sendingAction}
					class="px-6 py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					{sendingAction ? 'Sending...' : 'Submit'}
				</button>
			</div>
		{/if}
	</div>
</div>
