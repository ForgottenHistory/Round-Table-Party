<script lang="ts">
	interface Props {
		campaignName: string;
		inviteCode: string;
		premise: string | null;
		submittedCount: number;
		totalCount: number;
		onShowPremise: () => void;
	}

	let { campaignName, inviteCode, premise, submittedCount, totalCount, onShowPremise }: Props = $props();

	function copyInviteCode() {
		navigator.clipboard.writeText(inviteCode);
	}
</script>

<div class="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] px-6 py-4">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a href="/" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<div>
				<h1 class="text-xl font-bold text-[var(--text-primary)]">{campaignName}</h1>
				<p class="text-sm text-[var(--text-muted)]">
					{submittedCount}/{totalCount} players submitted
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if premise}
				<button
					onclick={onShowPremise}
					class="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] transition flex items-center gap-2"
					title="View campaign premise"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<span>About</span>
				</button>
			{/if}
			<button
				onclick={copyInviteCode}
				class="px-3 py-1.5 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:border-[var(--accent-primary)] transition flex items-center gap-2"
				title="Copy invite code"
			>
				<span class="font-mono">{inviteCode}</span>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
				</svg>
			</button>
		</div>
	</div>
</div>
