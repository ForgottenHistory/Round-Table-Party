<script lang="ts">
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import type { CampaignPlayer } from '$lib/server/services/campaignService';
	import { getPlayerColor } from '$lib/utils/playerColors';

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
		onEditMessage?: (messageId: number, content: string) => Promise<void>;
		onDeleteMessage?: (messageId: number) => Promise<void>;
	}

	let { messages, players, isHost, gmResponding, onEditMessage, onDeleteMessage }: Props = $props();

	// Edit state
	let editingMessageId = $state<number | null>(null);
	let editContent = $state('');
	let saving = $state(false);
	let textareaRef = $state<HTMLTextAreaElement | null>(null);

	function autoResizeTextarea() {
		if (textareaRef) {
			textareaRef.style.height = 'auto';
			textareaRef.style.height = textareaRef.scrollHeight + 'px';
		}
	}

	function getCharacterName(userId: number | null): string {
		if (!userId) return 'Game Master';
		const player = players.find(p => p.userId === userId);
		return player?.characterName || player?.displayName || 'Unknown';
	}

	function getPlayerByUserId(userId: number | null): CampaignPlayer | undefined {
		if (!userId) return undefined;
		return players.find(p => p.userId === userId);
	}

	function startEditing(message: CampaignMessage) {
		editingMessageId = message.id;
		editContent = message.content;
		// Auto-resize after the textarea is rendered
		setTimeout(() => autoResizeTextarea(), 0);
	}

	function cancelEditing() {
		editingMessageId = null;
		editContent = '';
	}

	async function saveEdit() {
		if (!editingMessageId || !onEditMessage || saving) return;

		saving = true;
		try {
			await onEditMessage(editingMessageId, editContent);
			editingMessageId = null;
			editContent = '';
		} finally {
			saving = false;
		}
	}

	async function handleDelete(messageId: number) {
		if (!onDeleteMessage || !confirm('Delete this message?')) return;
		await onDeleteMessage(messageId);
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
		<div class="max-w-3xl mx-auto group">
			{#if message.role === 'gm'}
				<!-- GM Message -->
				<div class="bg-gradient-to-r from-[var(--accent-primary)]/10 to-[var(--accent-secondary)]/10 border border-[var(--accent-primary)]/30 rounded-2xl p-4">
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<div class="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
								<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
								</svg>
							</div>
							<span class="font-semibold text-[var(--accent-primary)]">Game Master</span>
						</div>
						{#if isHost && onEditMessage}
							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
								<button
									onclick={() => startEditing(message)}
									class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition"
									title="Edit message"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
									</svg>
								</button>
								{#if onDeleteMessage}
									<button
										onclick={() => handleDelete(message.id)}
										class="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition"
										title="Delete message"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
										</svg>
									</button>
								{/if}
							</div>
						{/if}
					</div>
					{#if editingMessageId === message.id}
						<div class="space-y-2">
							<textarea
								bind:this={textareaRef}
								bind:value={editContent}
								oninput={autoResizeTextarea}
								class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none overflow-hidden"
								style="min-height: 60px;"
							></textarea>
							<div class="flex justify-end gap-2">
								<button
									onclick={cancelEditing}
									class="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
								>
									Cancel
								</button>
								<button
									onclick={saveEdit}
									disabled={saving}
									class="px-3 py-1.5 text-sm bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
								>
									{saving ? 'Saving...' : 'Save'}
								</button>
							</div>
						</div>
					{:else}
						<div class="text-[var(--text-primary)]">
							<ChatMessage content={message.content} role="assistant" charName="Game Master" />
						</div>
					{/if}
				</div>
			{:else}
				<!-- Player Message -->
				{@const player = getPlayerByUserId(message.userId)}
				{@const color = player ? getPlayerColor(player.colorIndex) : { main: '#71717a', light: '#71717a20' }}
				<div
					class="rounded-2xl p-4"
					style="background: {color.light}; border: 1px solid {color.main}40;"
				>
					<div class="flex items-center justify-between mb-2">
						<div class="flex items-center gap-2">
							<div
								class="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
								style="background: {color.main};"
							>
								{getCharacterName(message.userId)?.charAt(0).toUpperCase()}
							</div>
							<span class="font-semibold" style="color: {color.main};">{getCharacterName(message.userId)}</span>
						</div>
						{#if isHost && onEditMessage}
							<div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
								<button
									onclick={() => startEditing(message)}
									class="p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition"
									title="Edit message"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
									</svg>
								</button>
								{#if onDeleteMessage}
									<button
										onclick={() => handleDelete(message.id)}
										class="p-1.5 text-[var(--text-muted)] hover:text-[var(--error)] transition"
										title="Delete message"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
										</svg>
									</button>
								{/if}
							</div>
						{/if}
					</div>
					{#if editingMessageId === message.id}
						<div class="space-y-2">
							<textarea
								bind:this={textareaRef}
								bind:value={editContent}
								oninput={autoResizeTextarea}
								class="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] resize-none overflow-hidden"
								style="min-height: 40px;"
							></textarea>
							<div class="flex justify-end gap-2">
								<button
									onclick={cancelEditing}
									class="px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
								>
									Cancel
								</button>
								<button
									onclick={saveEdit}
									disabled={saving}
									class="px-3 py-1.5 text-sm bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
								>
									{saving ? 'Saving...' : 'Save'}
								</button>
							</div>
						</div>
					{:else}
						<div class="text-[var(--text-secondary)]">{message.content}</div>
					{/if}
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
