<script lang="ts">
	import type { CampaignPlayer } from '$lib/server/services/campaignService';
	import { getPlayerColor } from '$lib/utils/playerColors';

	interface Props {
		players: CampaignPlayer[];
		isHost: boolean;
		canTriggerGM: boolean;
		triggeringGM: boolean;
		onTriggerGM: () => void;
	}

	let { players, isHost, canTriggerGM, triggeringGM, onTriggerGM }: Props = $props();
</script>

<div class="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] flex flex-col">
	<div class="px-6 py-4 border-b border-[var(--border-primary)]">
		<h2 class="text-xl font-bold text-[var(--text-primary)]">Party</h2>
		<p class="text-sm text-[var(--text-muted)]">{players.length} adventurer{players.length !== 1 ? 's' : ''}</p>
	</div>
	<div class="flex-1 overflow-y-auto p-4 space-y-2">
		{#each players as player}
			{@const color = getPlayerColor(player.colorIndex)}
			<div
				class="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)]"
				style="border: 1px solid {color.main}40; background: {color.light};"
			>
				<div
					class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
					style="background: {color.main};"
				>
					{(player.characterName || player.displayName).charAt(0).toUpperCase()}
				</div>
				<div class="flex-1 min-w-0">
					<div class="font-medium text-[var(--text-primary)] truncate">
						{player.characterName || 'No character'}
					</div>
					<div class="text-xs text-[var(--text-muted)] truncate">
						{player.displayName}
						{#if player.isHost}
							<span style="color: {color.main};"> (Host)</span>
						{/if}
					</div>
				</div>
				{#if player.hasSubmittedAction}
					<svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				{/if}
			</div>
		{/each}
	</div>

	{#if isHost && canTriggerGM}
		<div class="p-4 border-t border-[var(--border-primary)]">
			<button
				onclick={onTriggerGM}
				disabled={triggeringGM}
				class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
			>
				{triggeringGM ? 'GM is responding...' : 'Continue Game'}
			</button>
		</div>
	{/if}
</div>
