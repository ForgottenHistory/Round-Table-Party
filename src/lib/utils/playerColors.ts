// 20 distinct player colors for campaign messages and sidebar
// Each color has a main color and a lighter variant for backgrounds
export const PLAYER_COLORS = [
	{ main: '#ef4444', light: '#ef444420' }, // red
	{ main: '#f97316', light: '#f9731620' }, // orange
	{ main: '#f59e0b', light: '#f59e0b20' }, // amber
	{ main: '#eab308', light: '#eab30820' }, // yellow
	{ main: '#84cc16', light: '#84cc1620' }, // lime
	{ main: '#22c55e', light: '#22c55e20' }, // green
	{ main: '#14b8a6', light: '#14b8a620' }, // teal
	{ main: '#06b6d4', light: '#06b6d420' }, // cyan
	{ main: '#0ea5e9', light: '#0ea5e920' }, // sky
	{ main: '#3b82f6', light: '#3b82f620' }, // blue
	{ main: '#6366f1', light: '#6366f120' }, // indigo
	{ main: '#8b5cf6', light: '#8b5cf620' }, // violet
	{ main: '#a855f7', light: '#a855f720' }, // purple
	{ main: '#d946ef', light: '#d946ef20' }, // fuchsia
	{ main: '#ec4899', light: '#ec489920' }, // pink
	{ main: '#f43f5e', light: '#f43f5e20' }, // rose
	{ main: '#78716c', light: '#78716c20' }, // stone
	{ main: '#0891b2', light: '#0891b220' }, // cyan-600
	{ main: '#059669', light: '#05966920' }, // emerald-600
	{ main: '#7c3aed', light: '#7c3aed20' }, // violet-600
] as const;

export function getPlayerColor(colorIndex: number): { main: string; light: string } {
	return PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
}

export function getNextColorIndex(usedIndexes: number[]): number {
	// Find the first unused color index
	for (let i = 0; i < PLAYER_COLORS.length; i++) {
		if (!usedIndexes.includes(i)) {
			return i;
		}
	}
	// If all colors are used, wrap around
	return usedIndexes.length % PLAYER_COLORS.length;
}
