import { db } from '../db';
import {
	campaigns,
	campaignPlayers,
	campaignCharacters,
	campaignMessages,
	users
} from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type {
	Campaign,
	CampaignPlayer as CampaignPlayerRecord,
	CampaignCharacter,
	CampaignMessage
} from '../db/schema';

/**
 * Generate a random 6-character invite code
 */
function generateInviteCode(): string {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar chars like 0/O, 1/I
	let code = '';
	for (let i = 0; i < 6; i++) {
		code += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return code;
}

export type CampaignWithHost = Campaign & {
	hostDisplayName: string;
	playerCount: number;
};

export type CampaignPlayer = {
	userId: number;
	displayName: string;
	characterName: string | null;
	hasSubmittedAction: boolean;
	isHost: boolean;
};

class CampaignService {
	/**
	 * Create a new campaign
	 */
	async createCampaign(hostUserId: number, name: string): Promise<Campaign> {
		// Generate unique invite code
		let inviteCode = generateInviteCode();
		let attempts = 0;
		while (attempts < 10) {
			const existing = await db
				.select()
				.from(campaigns)
				.where(eq(campaigns.inviteCode, inviteCode))
				.limit(1);
			if (existing.length === 0) break;
			inviteCode = generateInviteCode();
			attempts++;
		}

		// Create campaign
		const [campaign] = await db
			.insert(campaigns)
			.values({
				name,
				inviteCode,
				hostUserId,
				phase: 'collecting_actions'
			})
			.returning();

		// Add host as first player
		await db.insert(campaignPlayers).values({
			campaignId: campaign.id,
			userId: hostUserId,
			hasSubmittedAction: false
		});

		return campaign;
	}

	/**
	 * Get campaign by ID
	 */
	async getCampaignById(campaignId: number): Promise<Campaign | null> {
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.id, campaignId))
			.limit(1);

		return campaign || null;
	}

	/**
	 * Get campaign by invite code
	 */
	async getCampaignByInviteCode(inviteCode: string): Promise<Campaign | null> {
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.inviteCode, inviteCode.toUpperCase()))
			.limit(1);

		return campaign || null;
	}

	/**
	 * Get all campaigns for a user (as host or player)
	 */
	async getUserCampaigns(userId: number): Promise<CampaignWithHost[]> {
		// Get campaigns where user is a player
		const playerCampaigns = await db
			.select({
				campaign: campaigns,
				hostDisplayName: users.displayName
			})
			.from(campaignPlayers)
			.innerJoin(campaigns, eq(campaignPlayers.campaignId, campaigns.id))
			.innerJoin(users, eq(campaigns.hostUserId, users.id))
			.where(eq(campaignPlayers.userId, userId))
			.orderBy(desc(campaigns.createdAt));

		// Get player counts for each campaign
		const results: CampaignWithHost[] = [];
		for (const row of playerCampaigns) {
			const playerCount = await db
				.select()
				.from(campaignPlayers)
				.where(eq(campaignPlayers.campaignId, row.campaign.id));

			results.push({
				...row.campaign,
				hostDisplayName: row.hostDisplayName,
				playerCount: playerCount.length
			});
		}

		return results;
	}

	/**
	 * Check if user is in a campaign
	 */
	async isUserInCampaign(campaignId: number, userId: number): Promise<boolean> {
		const [player] = await db
			.select()
			.from(campaignPlayers)
			.where(and(eq(campaignPlayers.campaignId, campaignId), eq(campaignPlayers.userId, userId)))
			.limit(1);

		return !!player;
	}

	/**
	 * Join a campaign
	 */
	async joinCampaign(campaignId: number, userId: number): Promise<CampaignPlayerRecord> {
		// Check if already in campaign
		const existing = await db
			.select()
			.from(campaignPlayers)
			.where(and(eq(campaignPlayers.campaignId, campaignId), eq(campaignPlayers.userId, userId)))
			.limit(1);

		if (existing.length > 0) {
			return existing[0];
		}

		const [player] = await db
			.insert(campaignPlayers)
			.values({
				campaignId,
				userId,
				hasSubmittedAction: false
			})
			.returning();

		return player;
	}

	/**
	 * Leave a campaign
	 */
	async leaveCampaign(campaignId: number, userId: number): Promise<boolean> {
		// Delete character first
		await db
			.delete(campaignCharacters)
			.where(
				and(eq(campaignCharacters.campaignId, campaignId), eq(campaignCharacters.userId, userId))
			);

		// Delete player entry
		const result = await db
			.delete(campaignPlayers)
			.where(and(eq(campaignPlayers.campaignId, campaignId), eq(campaignPlayers.userId, userId)));

		return result.changes > 0;
	}

	/**
	 * Get all players in a campaign with their character names
	 */
	async getCampaignPlayers(campaignId: number): Promise<CampaignPlayer[]> {
		const campaign = await this.getCampaignById(campaignId);
		if (!campaign) return [];

		const players = await db
			.select({
				userId: campaignPlayers.userId,
				hasSubmittedAction: campaignPlayers.hasSubmittedAction,
				displayName: users.displayName
			})
			.from(campaignPlayers)
			.innerJoin(users, eq(campaignPlayers.userId, users.id))
			.where(eq(campaignPlayers.campaignId, campaignId))
			.orderBy(campaignPlayers.joinedAt);

		// Get character names
		const characters = await db
			.select()
			.from(campaignCharacters)
			.where(eq(campaignCharacters.campaignId, campaignId));

		const charMap = new Map<number, string>();
		for (const char of characters) {
			charMap.set(char.userId, char.name);
		}

		return players.map((p) => ({
			userId: p.userId,
			displayName: p.displayName,
			characterName: charMap.get(p.userId) || null,
			hasSubmittedAction: p.hasSubmittedAction,
			isHost: p.userId === campaign.hostUserId
		}));
	}

	/**
	 * Get or create character for user in campaign
	 */
	async getCharacter(campaignId: number, userId: number): Promise<CampaignCharacter | null> {
		const [character] = await db
			.select()
			.from(campaignCharacters)
			.where(
				and(eq(campaignCharacters.campaignId, campaignId), eq(campaignCharacters.userId, userId))
			)
			.limit(1);

		return character || null;
	}

	/**
	 * Create or update character for user in campaign
	 */
	async upsertCharacter(
		campaignId: number,
		userId: number,
		data: { name: string; description?: string; avatar?: string }
	): Promise<CampaignCharacter> {
		const existing = await this.getCharacter(campaignId, userId);

		if (existing) {
			const [updated] = await db
				.update(campaignCharacters)
				.set({
					name: data.name,
					description: data.description ?? existing.description,
					avatar: data.avatar ?? existing.avatar
				})
				.where(eq(campaignCharacters.id, existing.id))
				.returning();

			return updated;
		}

		const [character] = await db
			.insert(campaignCharacters)
			.values({
				campaignId,
				userId,
				name: data.name,
				description: data.description || '',
				avatar: data.avatar || ''
			})
			.returning();

		return character;
	}

	/**
	 * Get campaign messages
	 */
	async getMessages(campaignId: number, limit = 100): Promise<CampaignMessage[]> {
		return await db
			.select()
			.from(campaignMessages)
			.where(eq(campaignMessages.campaignId, campaignId))
			.orderBy(campaignMessages.createdAt)
			.limit(limit);
	}

	/**
	 * Add a player action message
	 */
	async addPlayerAction(
		campaignId: number,
		userId: number,
		content: string
	): Promise<CampaignMessage> {
		const [message] = await db
			.insert(campaignMessages)
			.values({
				campaignId,
				userId,
				role: 'player',
				messageType: 'action',
				content
			})
			.returning();

		// Mark player as having submitted action
		await db
			.update(campaignPlayers)
			.set({ hasSubmittedAction: true })
			.where(and(eq(campaignPlayers.campaignId, campaignId), eq(campaignPlayers.userId, userId)));

		return message;
	}

	/**
	 * Add a GM narrative message
	 */
	async addGMNarrative(campaignId: number, content: string): Promise<CampaignMessage> {
		const [message] = await db
			.insert(campaignMessages)
			.values({
				campaignId,
				userId: null,
				role: 'gm',
				messageType: 'narrative',
				content
			})
			.returning();

		// Reset all players' action submission status
		await db
			.update(campaignPlayers)
			.set({ hasSubmittedAction: false })
			.where(eq(campaignPlayers.campaignId, campaignId));

		return message;
	}

	/**
	 * Update campaign phase
	 */
	async setPhase(
		campaignId: number,
		phase: 'collecting_actions' | 'gm_responding'
	): Promise<void> {
		await db.update(campaigns).set({ phase }).where(eq(campaigns.id, campaignId));
	}

	/**
	 * Get submission status for a campaign
	 */
	async getSubmissionStatus(
		campaignId: number
	): Promise<{ submitted: number; total: number }> {
		const players = await db
			.select({ hasSubmittedAction: campaignPlayers.hasSubmittedAction })
			.from(campaignPlayers)
			.where(eq(campaignPlayers.campaignId, campaignId));

		return {
			submitted: players.filter((p) => p.hasSubmittedAction).length,
			total: players.length
		};
	}

	/**
	 * Delete a campaign (host only)
	 */
	async deleteCampaign(campaignId: number, hostUserId: number): Promise<boolean> {
		const campaign = await this.getCampaignById(campaignId);
		if (!campaign || campaign.hostUserId !== hostUserId) {
			return false;
		}

		// Cascade delete will handle players, characters, and messages
		const result = await db.delete(campaigns).where(eq(campaigns.id, campaignId));

		return result.changes > 0;
	}
}

export const campaignService = new CampaignService();
