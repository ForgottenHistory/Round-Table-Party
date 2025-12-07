<script lang="ts">
	interface Props {
		show: boolean;
		campaignName: string;
		premise: string;
		onClose: () => void;
	}

	let { show, campaignName, premise, onClose }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onclick={onClose}>
		<div class="bg-gradient-to-b from-[var(--bg-secondary)] to-[var(--bg-primary)] rounded-2xl border border-[var(--border-primary)] w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden shadow-2xl" onclick={(e) => e.stopPropagation()}>
			<!-- Header with gradient -->
			<div class="relative bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 px-8 py-6 border-b border-[var(--border-primary)]">
				<div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%239C92AC%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>
				<button
					onclick={onClose}
					class="absolute top-4 right-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 rounded-lg transition"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<div class="relative flex items-center gap-4">
					<div class="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center shadow-lg">
						<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<div>
						<p class="text-sm text-[var(--accent-primary)] font-medium uppercase tracking-wide">Campaign Lore</p>
						<h2 class="text-2xl font-bold text-[var(--text-primary)]">{campaignName}</h2>
					</div>
				</div>
			</div>

			<!-- Content -->
			<div class="px-8 py-6 overflow-y-auto max-h-[calc(85vh-120px)]">
				<p class="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed text-base">{premise}</p>
			</div>
		</div>
	</div>
{/if}
