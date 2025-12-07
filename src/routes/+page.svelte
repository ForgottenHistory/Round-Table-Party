<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let campaigns = $state(data.campaigns);
	let showCreateModal = $state(false);
	let showJoinModal = $state(false);
	let newCampaignName = $state('');
	let inviteCode = $state('');
	let error = $state('');
	let loading = $state(false);

	async function createCampaign() {
		if (!newCampaignName.trim()) {
			error = 'Please enter a campaign name';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newCampaignName.trim() })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to create campaign';
				loading = false;
				return;
			}

			// Navigate to the new campaign
			goto(`/campaign/${result.campaign.id}`);
		} catch (err) {
			error = 'Network error. Please try again.';
			loading = false;
		}
	}

	async function joinCampaign() {
		if (!inviteCode.trim()) {
			error = 'Please enter an invite code';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/campaigns/join', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ inviteCode: inviteCode.trim() })
			});

			const result = await response.json();

			if (!response.ok) {
				error = result.error || 'Failed to join campaign';
				loading = false;
				return;
			}

			// Navigate to the campaign
			goto(`/campaign/${result.campaign.id}`);
		} catch (err) {
			error = 'Network error. Please try again.';
			loading = false;
		}
	}

	function closeModals() {
		showCreateModal = false;
		showJoinModal = false;
		showLeaveModal = false;
		selectedCampaign = null;
		newCampaignName = '';
		inviteCode = '';
		error = '';
	}

	// Leave/Delete campaign
	let showLeaveModal = $state(false);
	let selectedCampaign = $state<typeof campaigns[0] | null>(null);
	let leaving = $state(false);

	function openLeaveModal(campaign: typeof campaigns[0], e: Event) {
		e.preventDefault();
		e.stopPropagation();
		selectedCampaign = campaign;
		showLeaveModal = true;
	}

	async function leaveCampaign() {
		if (!selectedCampaign) return;

		leaving = true;
		error = '';

		const isHost = selectedCampaign.hostUserId === data.user.id;
		const endpoint = isHost
			? `/api/campaigns/${selectedCampaign.id}`
			: `/api/campaigns/${selectedCampaign.id}/leave`;

		try {
			const response = await fetch(endpoint, {
				method: isHost ? 'DELETE' : 'POST'
			});

			if (!response.ok) {
				const result = await response.json();
				error = result.error || 'Failed to leave campaign';
				leaving = false;
				return;
			}

			// Remove from local list
			campaigns = campaigns.filter(c => c.id !== selectedCampaign!.id);
			closeModals();
		} catch (err) {
			error = 'Network error. Please try again.';
		} finally {
			leaving = false;
		}
	}
</script>

<svelte:head>
	<title>Round Table Party</title>
</svelte:head>

<div class="min-h-screen bg-[var(--bg-primary)]">
	<!-- Header -->
	<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-4">
		<div class="max-w-4xl mx-auto flex items-center justify-between">
			<h1 class="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)]">
				Round Table Party
			</h1>
			<div class="flex items-center gap-3">
				<span class="text-[var(--text-secondary)]">{data.user.displayName}</span>
				<form method="POST" action="/api/auth/logout">
					<button
						type="submit"
						class="p-2 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--bg-tertiary)] rounded-lg transition"
						title="Logout"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</button>
				</form>
			</div>
		</div>
	</div>

	<!-- Main Content -->
	<div class="max-w-4xl mx-auto px-6 py-8">
		<!-- Action Buttons -->
		<div class="flex gap-4 mb-8">
			<button
				onclick={() => showCreateModal = true}
				class="flex-1 py-4 px-6 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
				</svg>
				Create Campaign
			</button>
			<button
				onclick={() => showJoinModal = true}
				class="flex-1 py-4 px-6 bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl font-semibold hover:border-[var(--accent-primary)] transition flex items-center justify-center gap-2"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
				</svg>
				Join Campaign
			</button>
		</div>

		<!-- Campaigns List -->
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] overflow-hidden">
			<div class="px-6 py-4 border-b border-[var(--border-primary)]">
				<h2 class="text-lg font-semibold text-[var(--text-primary)]">Your Campaigns</h2>
			</div>

			{#if campaigns.length === 0}
				<div class="py-16 text-center">
					<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center">
						<svg class="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
						</svg>
					</div>
					<p class="text-[var(--text-secondary)] mb-2">No campaigns yet</p>
					<p class="text-[var(--text-muted)] text-sm">Create a new campaign or join one with an invite code</p>
				</div>
			{:else}
				<div class="divide-y divide-[var(--border-primary)]">
					{#each campaigns as campaign}
						<div class="flex items-center px-6 py-4 hover:bg-[var(--bg-tertiary)] transition group">
							<a
								href="/campaign/{campaign.id}"
								class="flex-1 min-w-0"
							>
								<h3 class="font-semibold text-[var(--text-primary)]">{campaign.name}</h3>
								<p class="text-sm text-[var(--text-muted)]">
									Hosted by {campaign.hostDisplayName} · {campaign.playerCount} player{campaign.playerCount === 1 ? '' : 's'}
									{#if campaign.hostUserId === data.user.id}
										<span class="text-[var(--accent-primary)]">(You)</span>
									{/if}
								</p>
							</a>
							<button
								onclick={(e) => openLeaveModal(campaign, e)}
								class="p-2 text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--error)]/10 rounded-lg transition opacity-0 group-hover:opacity-100"
								title={campaign.hostUserId === data.user.id ? 'Delete campaign' : 'Leave campaign'}
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									{#if campaign.hostUserId === data.user.id}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									{:else}
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
									{/if}
								</svg>
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Campaign Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeModals}>
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-xl font-bold text-[var(--text-primary)] mb-4">Create Campaign</h2>

			{#if error}
				<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
					{error}
				</div>
			{/if}

			<div class="mb-4">
				<label for="campaignName" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Campaign Name
				</label>
				<input
					id="campaignName"
					type="text"
					bind:value={newCampaignName}
					placeholder="Enter campaign name..."
					class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
					onkeydown={(e) => e.key === 'Enter' && createCampaign()}
				/>
			</div>

			<div class="flex gap-3">
				<button
					onclick={closeModals}
					class="flex-1 py-2 px-4 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-primary)] transition"
				>
					Cancel
				</button>
				<button
					onclick={createCampaign}
					disabled={loading}
					class="flex-1 py-2 px-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					{loading ? 'Creating...' : 'Create'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Join Campaign Modal -->
{#if showJoinModal}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeModals}>
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-xl font-bold text-[var(--text-primary)] mb-4">Join Campaign</h2>

			{#if error}
				<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
					{error}
				</div>
			{/if}

			<div class="mb-4">
				<label for="inviteCode" class="block text-sm font-medium text-[var(--text-secondary)] mb-2">
					Invite Code
				</label>
				<input
					id="inviteCode"
					type="text"
					bind:value={inviteCode}
					placeholder="Enter invite code..."
					class="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] uppercase"
					onkeydown={(e) => e.key === 'Enter' && joinCampaign()}
				/>
			</div>

			<div class="flex gap-3">
				<button
					onclick={closeModals}
					class="flex-1 py-2 px-4 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-primary)] transition"
				>
					Cancel
				</button>
				<button
					onclick={joinCampaign}
					disabled={loading}
					class="flex-1 py-2 px-4 bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					{loading ? 'Joining...' : 'Join'}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Leave/Delete Campaign Modal -->
{#if showLeaveModal && selectedCampaign}
	{@const isHost = selectedCampaign.hostUserId === data.user.id}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={closeModals}>
		<div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 w-full max-w-md mx-4" onclick={(e) => e.stopPropagation()}>
			<h2 class="text-xl font-bold text-[var(--text-primary)] mb-4">
				{isHost ? 'Delete Campaign' : 'Leave Campaign'}
			</h2>

			{#if error}
				<div class="bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)] px-4 py-3 rounded-xl mb-4">
					{error}
				</div>
			{/if}

			<p class="text-[var(--text-secondary)] mb-6">
				{#if isHost}
					Are you sure you want to delete <strong class="text-[var(--text-primary)]">{selectedCampaign.name}</strong>? This will remove the campaign for all players and cannot be undone.
				{:else}
					Are you sure you want to leave <strong class="text-[var(--text-primary)]">{selectedCampaign.name}</strong>?
				{/if}
			</p>

			<div class="flex gap-3">
				<button
					onclick={closeModals}
					class="flex-1 py-2 px-4 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--bg-primary)] transition"
				>
					Cancel
				</button>
				<button
					onclick={leaveCampaign}
					disabled={leaving}
					class="flex-1 py-2 px-4 bg-[var(--error)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition"
				>
					{leaving ? (isHost ? 'Deleting...' : 'Leaving...') : (isHost ? 'Delete' : 'Leave')}
				</button>
			</div>
		</div>
	</div>
{/if}
