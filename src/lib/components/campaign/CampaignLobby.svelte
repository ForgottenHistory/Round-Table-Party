<script lang="ts">
	import type { CampaignPlayer } from '$lib/server/services/campaignService';
	import { getPlayerColor } from '$lib/utils/playerColors';
	import PremiseModal from './PremiseModal.svelte';

	interface Props {
		campaignName: string;
		inviteCode: string;
		premise: string;
		players: CampaignPlayer[];
		character: { name: string } | null;
		isHost: boolean;
		onCreateCharacter: () => void;
		onStartCampaign: () => void;
		starting: boolean;
	}

	let {
		campaignName,
		inviteCode,
		premise,
		players,
		character,
		isHost,
		onCreateCharacter,
		onStartCampaign,
		starting
	}: Props = $props();

	let copied = $state(false);
	let showPremiseModal = $state(false);

	function copyInviteCode() {
		navigator.clipboard.writeText(inviteCode);
		copied = true;
		setTimeout(() => copied = false, 2000);
	}

	// Check if all players have characters
	let allPlayersReady = $derived(players.every(p => p.characterName));
	let playersWithCharacters = $derived(players.filter(p => p.characterName).length);
</script>

<div class="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
	<div class="max-w-2xl w-full space-y-6">
		<!-- Header -->
		<div class="text-center space-y-2">
			<h1 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
				{campaignName}
			</h1>
			<p class="text-[var(--text-muted)]">Waiting for players to join and create characters...</p>
			{#if premise}
				<button
					onclick={() => showPremiseModal = true}
					class="text-sm text-[var(--accent-primary)] hover:underline"
				>
					About this campaign
				</button>
			{/if}
		</div>

		<!-- Invite Code Card -->
		<div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-primary)]">
			<div class="text-center space-y-3">
				<p class="text-sm text-[var(--text-muted)]">Share this code with your friends</p>
				<div class="flex items-center justify-center gap-3">
					<span class="text-3xl font-mono font-bold tracking-widest text-[var(--accent-primary)]">
						{inviteCode}
					</span>
					<button
						onclick={copyInviteCode}
						class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition"
						title="Copy invite code"
					>
						{#if copied}
							<svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<svg class="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Your Character -->
		<div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-primary)]">
			<h3 class="font-semibold text-[var(--text-primary)] mb-4">Your Character</h3>
			{#if character}
				<div class="flex items-center gap-4">
					<div class="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-white font-bold text-xl">
						{character.name.charAt(0).toUpperCase()}
					</div>
					<div class="flex-1">
						<div class="font-medium text-[var(--text-primary)]">{character.name}</div>
						<div class="text-sm text-green-500">Ready to play</div>
					</div>
					<button
						onclick={onCreateCharacter}
						class="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
					>
						Edit
					</button>
				</div>
			{:else}
				<button
					onclick={onCreateCharacter}
					class="w-full py-4 border-2 border-dashed border-[var(--border-primary)] rounded-xl text-[var(--text-muted)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition"
				>
					+ Create your character
				</button>
			{/if}
		</div>

		<!-- Players List -->
		<div class="bg-[var(--bg-secondary)] rounded-2xl p-6 border border-[var(--border-primary)]">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-[var(--text-primary)]">Party Members</h3>
				<span class="text-sm text-[var(--text-muted)]">{playersWithCharacters}/{players.length} ready</span>
			</div>
			<div class="space-y-3">
				{#each players as player}
					{@const color = getPlayerColor(player.colorIndex)}
					<div
						class="flex items-center gap-3 p-3 rounded-xl"
						style="background: {color.light}; border: 1px solid {color.main}40;"
					>
						<div
							class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
							style="background: {color.main};"
						>
							{(player.characterName || player.displayName).charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							{#if player.characterName}
								<div class="font-medium text-[var(--text-primary)]">{player.characterName}</div>
								<div class="text-xs text-[var(--text-muted)]">
									{player.displayName}
									{#if player.isHost}
										<span style="color: {color.main};"> (Host)</span>
									{/if}
								</div>
							{:else}
								<div class="font-medium text-[var(--text-muted)]">{player.displayName}</div>
								<div class="text-xs text-[var(--text-muted)]">
									Creating character...
									{#if player.isHost}
										<span style="color: {color.main};"> (Host)</span>
									{/if}
								</div>
							{/if}
						</div>
						{#if player.characterName}
							<svg class="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						{:else}
							<div class="w-5 h-5 border-2 border-[var(--text-muted)] rounded-full animate-pulse"></div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Start Button (Host Only) -->
		{#if isHost}
			<button
				onclick={onStartCampaign}
				disabled={!allPlayersReady || starting}
				class="w-full py-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-bold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
			>
				{#if starting}
					<span class="flex items-center justify-center gap-2">
						<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
						Starting Campaign...
					</span>
				{:else if !allPlayersReady}
					Waiting for all players...
				{:else}
					Start Campaign
				{/if}
			</button>
		{:else}
			<div class="text-center py-4 text-[var(--text-muted)]">
				Waiting for the host to start the campaign...
			</div>
		{/if}

		<!-- Back Link -->
		<div class="text-center">
			<a href="/" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
				&larr; Back to Home
			</a>
		</div>
	</div>
</div>

<PremiseModal
	show={showPremiseModal}
	{campaignName}
	{premise}
	onClose={() => showPremiseModal = false}
/>
