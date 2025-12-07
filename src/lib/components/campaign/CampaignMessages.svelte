<script lang="ts">
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import type { CampaignPlayer } from '$lib/server/services/campaignService';

	interface CampaignMessage {
		id: number;
		campaignId: number;
		userId: number | null;
		role: string;
		messageType: string;
		content: string;
		createdAt: Date;
	}

	interface Props {
		messages: CampaignMessage[];
		players: CampaignPlayer[];
		isHost: boolean;
		gmResponding: boolean;
	}

	let { messages, players, isHost, gmResponding }: Props = $props();

	function getCharacterName(userId: number | null): string {
		if (!userId) return 'Game Master';
		const player = players.find(p => p.userId === userId);
		return player?.characterName || player?.displayName || 'Unknown';
	}
</script>

{#if messages.length === 0}
	<div class="text-center py-12">
		<p class="text-[var(--text-muted)]">No messages yet. The adventure awaits!</p>
		{#if isHost}
			<p class="text-sm text-[var(--text-muted)] mt-2">Submit an action to get started, then click "Continue" to have the GM respond.</p>
		{/if}
	</div>
{:else}
	{#each messages as message}
		<div class="max-w-3xl mx-auto">
			{#if message.role === 'gm'}
				<!-- GM Message -->
				<div class="bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl p-4">
					<div class="flex items-center gap-2 mb-2">
						<div class="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
						</div>
						<span class="font-semibold text-[var(--accent-primary)]">Game Master</span>
					</div>
					<div class="text-[var(--text-primary)]">
						<ChatMessage content={message.content} role="assistant" charName="Game Master" />
					</div>
				</div>
			{:else}
				<!-- Player Message -->
				<div class="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-2xl p-4">
					<div class="flex items-center gap-2 mb-2">
						<div class="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] font-bold">
							{getCharacterName(message.userId)?.charAt(0).toUpperCase()}
						</div>
						<span class="font-semibold text-[var(--text-primary)]">{getCharacterName(message.userId)}</span>
					</div>
					<div class="text-[var(--text-secondary)]">{message.content}</div>
				</div>
			{/if}
		</div>
	{/each}
{/if}

{#if gmResponding}
	<div class="max-w-3xl mx-auto">
		<div class="bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl p-4">
			<div class="flex items-center gap-2">
				<div class="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
					<svg class="w-4 h-4 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<span class="text-[var(--accent-primary)]">Game Master is writing...</span>
			</div>
		</div>
	</div>
{/if}
