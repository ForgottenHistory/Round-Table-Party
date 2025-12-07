<script lang="ts">
	import type { PageData } from './$types';
	import { onMount, onDestroy } from 'svelte';
	import {
		CampaignHeader,
		CampaignMessages,
		CampaignInput,
		PartySidebar,
		PremiseModal,
		CharacterModal,
		CampaignLobby
	} from '$lib/components/campaign';
	import {
		initSocket,
		joinConversation,
		leaveConversation,
		onNewMessage,
		onPlayerJoined,
		onPlayerLeft,
		onCharacterUpdated,
		onGMResponding,
		onCampaignDeleted,
		onCampaignStarted,
		removeAllListeners
	} from '$lib/stores/socket';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Campaign state
	let campaign = $state(data.campaign);
	let players = $state(data.players);
	let messages = $state(data.messages);
	let character = $state(data.character);
	let submissionStatus = $state(data.submissionStatus);
	let isHost = $state(data.isHost);
	let started = $state(data.campaign.started);

	// UI state
	let showCharacterModal = $state(!character && started); // Only auto-show in active game, not lobby
	let showPremiseModal = $state(false);
	// Only show GM responding if phase says so AND last message isn't from GM
	let lastMessageIsGM = messages.length > 0 && messages[messages.length - 1].role === 'gm';
	let gmResponding = $state(campaign.phase === 'gm_responding' && !lastMessageIsGM);
	let triggeringGM = $state(false);
	let startingCampaign = $state(false);

	// Message container ref for scrolling
	let messagesContainer: HTMLDivElement;

	// Derived state
	let hasSubmitted = $derived(
		players.find(p => p.userId === data.user.id)?.hasSubmittedAction ?? false
	);

	let canTriggerGM = $derived(
		isHost && !gmResponding && submissionStatus.submitted > 0
	);

	// Socket event handlers
	onMount(() => {
		initSocket();
		joinConversation(campaign.id);

		onNewMessage((message: any) => {
			if (!messages.find((m) => m.id === message.id)) {
				messages = [...messages, message];

				if (message.role === 'gm') {
					gmResponding = false;
					submissionStatus = { submitted: 0, total: submissionStatus.total };
					players = players.map(p => ({ ...p, hasSubmittedAction: false }));
				} else if (message.role === 'player') {
					const playerIndex = players.findIndex(p => p.userId === message.userId);
					if (playerIndex >= 0 && !players[playerIndex].hasSubmittedAction) {
						players = players.map(p =>
							p.userId === message.userId ? { ...p, hasSubmittedAction: true } : p
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
			if (!players.find(p => p.userId === player.userId)) {
				players = [...players, player];
				submissionStatus = {
					submitted: submissionStatus.submitted,
					total: submissionStatus.total + 1
				};
			}
		});

		onPlayerLeft((eventData: { userId: number }) => {
			players = players.filter(p => p.userId !== eventData.userId);
			submissionStatus = {
				submitted: players.filter(p => p.hasSubmittedAction).length,
				total: players.length
			};
		});

		onCharacterUpdated((eventData: { userId: number; character: any }) => {
			players = players.map(p =>
				p.userId === eventData.userId
					? { ...p, characterName: eventData.character.name }
					: p
			);
		});

		onGMResponding((eventData: { responding: boolean }) => {
			gmResponding = eventData.responding;
		});

		onCampaignDeleted(() => {
			// Campaign was deleted by host, redirect to home
			goto('/');
		});

		onCampaignStarted(() => {
			// Campaign was started by host, refresh to get greeting message
			started = true;
		});

		scrollToBottom();
	});

	onDestroy(() => {
		leaveConversation(campaign.id);
		removeAllListeners();
	});

	// Auto-scroll when messages change
	$effect(() => {
		// Track messages array to trigger on changes
		messages;
		scrollToBottom();
	});

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesContainer) {
				messagesContainer.scrollTop = messagesContainer.scrollHeight;
			}
		}, 50);
	}

	// Action handlers
	async function handleSaveCharacter(charData: { name: string; description: string; className: string; skills: Record<string, number> }) {
		const response = await fetch(`/api/campaigns/${campaign.id}/character`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(charData)
		});

		if (response.ok) {
			const result = await response.json();
			character = result.character;
			showCharacterModal = false;
			players = players.map(p =>
				p.userId === data.user.id
					? { ...p, characterName: result.character.name }
					: p
			);
		}
	}

	async function handleSubmitAction(content: string) {
		const response = await fetch(`/api/campaigns/${campaign.id}/action`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		});

		if (response.ok) {
			const result = await response.json();
			// Add message locally only if not already present (socket might have arrived first)
			if (!messages.find(m => m.id === result.message.id)) {
				messages = [...messages, result.message];
			}
			submissionStatus = result.submissionStatus;
			players = players.map(p =>
				p.userId === data.user.id ? { ...p, hasSubmittedAction: true } : p
			);
			scrollToBottom();
		}
	}

	async function handleTriggerGM() {
		if (!canTriggerGM) return;

		triggeringGM = true;
		gmResponding = true;

		try {
			const response = await fetch(`/api/campaigns/${campaign.id}/continue`, {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				// Add message locally only if not already present (socket might have arrived first)
				if (!messages.find(m => m.id === result.message.id)) {
					messages = [...messages, result.message];
				}
				submissionStatus = result.submissionStatus;
				gmResponding = false;
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

	async function handleEditMessage(messageId: number, content: string) {
		const response = await fetch(`/api/campaigns/${campaign.id}/messages/${messageId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ content })
		});

		if (response.ok) {
			const result = await response.json();
			messages = messages.map(m => m.id === messageId ? { ...m, content: result.message.content } : m);
		}
	}

	async function handleDeleteMessage(messageId: number) {
		const response = await fetch(`/api/campaigns/${campaign.id}/messages/${messageId}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			messages = messages.filter(m => m.id !== messageId);
		}
	}

	async function handleStartCampaign() {
		if (!isHost || startingCampaign) return;

		startingCampaign = true;

		try {
			const response = await fetch(`/api/campaigns/${campaign.id}/start`, {
				method: 'POST'
			});

			if (response.ok) {
				const result = await response.json();
				started = true;
				// Add greeting message if returned
				if (result.message && !messages.find(m => m.id === result.message.id)) {
					messages = [...messages, result.message];
				}
			}
		} catch (error) {
			console.error('Failed to start campaign:', error);
		} finally {
			startingCampaign = false;
		}
	}
</script>

<svelte:head>
	<title>{campaign.name} | Round Table Party</title>
</svelte:head>

{#if !started}
	<!-- Lobby View -->
	<CampaignLobby
		campaignName={campaign.name}
		inviteCode={campaign.inviteCode}
		premise={campaign.premise ?? ''}
		{players}
		{character}
		{isHost}
		onCreateCharacter={() => showCharacterModal = true}
		onStartCampaign={handleStartCampaign}
		starting={startingCampaign}
	/>

	<CharacterModal
		show={showCharacterModal}
		campaignId={campaign.id}
		onSave={handleSaveCharacter}
	/>
{:else}
	<!-- Active Game View -->
	<div class="h-screen flex bg-[var(--bg-primary)]">
		<!-- Main Chat Area -->
		<div class="flex-1 flex flex-col">
			<CampaignHeader
				campaignName={campaign.name}
				inviteCode={campaign.inviteCode}
				premise={campaign.premise}
				submittedCount={submissionStatus.submitted}
				totalCount={submissionStatus.total}
				onShowPremise={() => showPremiseModal = true}
			/>

			<!-- Messages -->
			<div bind:this={messagesContainer} class="flex-1 overflow-y-auto p-6 space-y-4">
				<CampaignMessages
					{messages}
					{players}
					{isHost}
					{gmResponding}
					onEditMessage={handleEditMessage}
					onDeleteMessage={handleDeleteMessage}
				/>
			</div>

			<CampaignInput
				characterName={character?.name ?? null}
				hasCharacter={!!character}
				{hasSubmitted}
				{gmResponding}
				{isHost}
				{canTriggerGM}
				{triggeringGM}
				onCreateCharacter={() => showCharacterModal = true}
				onSubmitAction={handleSubmitAction}
				onTriggerGM={handleTriggerGM}
			/>
		</div>

		<PartySidebar
			{players}
			{isHost}
			{canTriggerGM}
			{triggeringGM}
			onTriggerGM={handleTriggerGM}
		/>
	</div>

	<PremiseModal
		show={showPremiseModal}
		campaignName={campaign.name}
		premise={campaign.premise ?? ''}
		onClose={() => showPremiseModal = false}
	/>

	<CharacterModal
		show={showCharacterModal}
		campaignId={campaign.id}
		onSave={handleSaveCharacter}
	/>
{/if}
