<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		initSocket,
		joinConversation,
		leaveConversation,
		onNewMessage,
		onPlayerJoined,
		onPlayerLeft,
		onCharacterUpdated,
		removeAllListeners
	} from '$lib/stores/socket';

	let { data }: { data: PageData } = $props();

	let campaign = $state(data.campaign);
	let players = $state(data.players);
	let messages = $state(data.messages);
	let character = $state(data.character);
	let submissionStatus = $state(data.submissionStatus);
	let isHost = $state(data.isHost);

	// Character creation
	let showCharacterModal = $state(!character);
	let characterName = $state(character?.name || '');
	let savingCharacter = $state(false);

	// Action input
	let actionText = $state('');
	let sendingAction = $state(false);

	// GM response
	let gmResponding = $state(campaign.phase === 'gm_responding');
	let triggeringGM = $state(false);

	// Message container ref for scrolling
	let messagesContainer: HTMLDivElement;

	// Check if current user has submitted
	let hasSubmitted = $derived(
		players.find(p => p.userId === data.user.id)?.hasSubmittedAction ?? false
	);

	// Can submit action?
	let canSubmit = $derived(
		!gmResponding && !hasSubmitted && !!character && actionText.trim().length > 0
	);

	// Can trigger GM?
	let canTriggerGM = $derived(
		isHost && !gmResponding && submissionStatus.submitted > 0
	);

	onMount(() => {
		initSocket();
		joinConversation(campaign.id);

		onNewMessage((message: any) => {
			if (!messages.find((m) => m.id === message.id)) {
				messages = [...messages, message];

				// If it's a GM message, reset submission status
				if (message.role === 'gm') {
					gmResponding = false;
					submissionStatus = { submitted: 0, total: submissionStatus.total };
					// Reset local player submission states
					players = players.map(p => ({ ...p, hasSubmittedAction: false }));
				} else if (message.role === 'player') {
					// Update submission status when another player submits
					const playerIndex = players.findIndex(p => p.userId === message.userId);
					if (playerIndex >= 0 && !players[playerIndex].hasSubmittedAction) {
						players = players.map(p =>
							p.userId === message.userId
								? { ...p, hasSubmittedAction: true }
								: p
						);
						submissionStatus = {
							submitted: submissionStatus.submitted + 1,
							total: submissionStatus.total
						};
					}
				}

				scrollToBottom();
			}
		});

		onPlayerJoined((player: any) => {
			// Add new player if not already in list
			if (!players.find(p => p.userId === player.userId)) {
				players = [...players, player];
				submissionStatus = {
					submitted: submissionStatus.submitted,
					total: submissionStatus.total + 1
				};
			}
		});

		onPlayerLeft((data: { userId: number }) => {
			players = players.filter(p => p.userId !== data.userId);
			submissionStatus = {
				submitted: players.filter(p => p.hasSubmittedAction).length,
				total: players.length
			};
		});

		onCharacterUpdated((data: { userId: number; character: any }) => {
			players = players.map(p =>
				p.userId === data.userId
					? { ...p, characterName: data.character.name }
					: p
			);
		});

		scrollToBottom();
	});

	onDestroy(() => {
		leaveConversation(campaign.id);
		removeAllListeners();
	});

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 50);
	}

	async function saveCharacter() {
		if (!characterName.trim()) return;

		savingCharacter = true;
		try {
			const response = await fetch(`/api/campaigns/${campaign.id}/character`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: characterName.trim() })
			});

			if (response.ok) {
				const result = await response.json();
				character = result.character;
				showCharacterModal = false;

				// Update player list with new character name
				players = players.map(p =>
					p.userId === data.user.id
						? { ...p, characterName: result.character.name }
						: p
				);
			}
		} finally {
			savingCharacter = false;
		}
	}

	async function submitAction() {
		if (!canSubmit) return;

		sendingAction = true;
		try {
			const response = await fetch(`/api/campaigns/${campaign.id}/action`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ content: actionText.trim() })
			});

			if (response.ok) {
				const result = await response.json();
				messages = [...messages, result.message];
				submissionStatus = result.submissionStatus;
				actionText = '';

				// Update local player state
				players = players.map(p =>
					p.userId === data.user.id
						? { ...p, hasSubmittedAction: true }
						: p
				);

				scrollToBottom();
			}
		} finally {
			sendingAction = false;
		}
	}

	async function triggerGM() {
		if (!canTriggerGM) return;

		triggeringGM = true;
		gmResponding = true;

		try {
			const response = await fetch(`/api/campaigns/${campaign.id}/continue`, {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				messages = [...messages, result.message];
				submissionStatus = result.submissionStatus;
				gmResponding = false;

				// Reset player submission states
				players = players.map(p => ({ ...p, hasSubmittedAction: false }));

				scrollToBottom();
			} else {
				gmResponding = false;
			}
		} catch {
			gmResponding = false;
		} finally {
			triggeringGM = false;
		}
	}

	function getCharacterName(userId: number | null): string {
		if (!userId) return 'Game Master';
		const player = players.find(p => p.userId === userId);
		return player?.characterName || player?.displayName || 'Unknown';
	}

	function copyInviteCode() {
		navigator.clipboard.writeText(campaign.inviteCode);
	}
</script>

<svelte:head>
	<title>{campaign.name} | Round Table Party</title>
</svelte:head>

<div class="h-screen flex bg-[var(--bg-primary)]">
	<!-- Main Chat Area -->
	<div class="flex-1 flex flex-col">
		<!-- Header -->
		<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a href="/" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</a>
					<div>
						<h1 class="text-xl font-bold text-[var(--text-primary)]">{campaign.name}</h1>
						<p class="text-sm text-[var(--text-muted)]">
							{submissionStatus.submitted}/{submissionStatus.total} players submitted
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={copyInviteCode}
						class="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] transition flex items-center gap-2"
						title="Copy invite code"
					>
						<span class="font-mono">{campaign.inviteCode}</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Messages -->
		<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-6 space-y-4">
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
								<div class="text-[var(--text-primary)] whitespace-pre-wrap">{message.content}</div>
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
		</div>

		<!-- Input Area -->
		<div class="bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] p-4">
			<div class="max-w-3xl mx-auto">
				{#if !character}
					<div class="text-center py-4">
						<button
							onclick={() => showCharacterModal = true}
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
								onclick={triggerGM}
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
							placeholder="What does {character.name} do?"
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
	</div>

	<!-- Party Sidebar -->
	<div class="w-72 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] flex flex-col">
		<div class="p-4 border-b border-[var(--border-primary)]">
			<h2 class="font-semibold text-[var(--text-primary)]">Party</h2>
		</div>
		<div class="flex-1 overflow-y-auto p-4 space-y-2">
			{#each players as player}
				<div class="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
					<div class="w-10 h-10 rounded-full bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-secondary)] font-bold">
						{(player.characterName || player.displayName).charAt(0).toUpperCase()}
					</div>
					<div class="flex-1 min-w-0">
						<div class="font-medium text-[var(--text-primary)] truncate">
							{player.characterName || 'No character'}
						</div>
						<div class="text-xs text-[var(--text-muted)] truncate">
							{player.displayName}
							{#if player.isHost}
								<span class="text-[var(--accent-primary)]"> (Host)</span>
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
					onclick={triggerGM}
					disabled={triggeringGM}
					class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					{triggeringGM ? 'GM is responding...' : 'Continue Game'}
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Character Creation Modal -->
{#if showCharacterModal}
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
				disabled={!characterName.trim() || savingCharacter}
				class="w-full py-3 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
			>
				{savingCharacter ? 'Creating...' : 'Create Character'}
			</button>
		</div>
	</div>
{/if}
