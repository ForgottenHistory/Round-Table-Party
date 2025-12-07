import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { campaignMessages, campaigns } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT - Edit a campaign message (host only)
export const PUT: RequestHandler = async ({ params, request, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const campaignId = parseInt(params.id!);
	const messageId = parseInt(params.messageId!);

	if (isNaN(campaignId) || isNaN(messageId)) {
		return json({ error: 'Invalid IDs' }, { status: 400 });
	}

	const body = await request.json();
	const { content } = body;

	if (!content || typeof content !== 'string') {
		return json({ error: 'Content is required' }, { status: 400 });
	}

	try {
		// Verify user is the campaign host
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.id, campaignId))
			.limit(1);

		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		if (campaign.hostUserId !== parseInt(userId)) {
			return json({ error: 'Only the host can edit messages' }, { status: 403 });
		}

		// Verify message belongs to this campaign
		const [existingMessage] = await db
			.select()
			.from(campaignMessages)
			.where(and(
				eq(campaignMessages.id, messageId),
				eq(campaignMessages.campaignId, campaignId)
			))
			.limit(1);

		if (!existingMessage) {
			return json({ error: 'Message not found' }, { status: 404 });
		}

		// Update the message
		const [updatedMessage] = await db
			.update(campaignMessages)
			.set({ content })
			.where(eq(campaignMessages.id, messageId))
			.returning();

		return json({ message: updatedMessage });
	} catch (error) {
		console.error('Failed to edit campaign message:', error);
		return json({ error: 'Failed to edit message' }, { status: 500 });
	}
};

// DELETE - Delete a campaign message (host only)
export const DELETE: RequestHandler = async ({ params, cookies }) => {
	const userId = cookies.get('userId');
	if (!userId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const campaignId = parseInt(params.id!);
	const messageId = parseInt(params.messageId!);

	if (isNaN(campaignId) || isNaN(messageId)) {
		return json({ error: 'Invalid IDs' }, { status: 400 });
	}

	try {
		// Verify user is the campaign host
		const [campaign] = await db
			.select()
			.from(campaigns)
			.where(eq(campaigns.id, campaignId))
			.limit(1);

		if (!campaign) {
			return json({ error: 'Campaign not found' }, { status: 404 });
		}

		if (campaign.hostUserId !== parseInt(userId)) {
			return json({ error: 'Only the host can delete messages' }, { status: 403 });
		}

		// Delete the message
		const result = await db
			.delete(campaignMessages)
			.where(and(
				eq(campaignMessages.id, messageId),
				eq(campaignMessages.campaignId, campaignId)
			));

		if (result.changes === 0) {
			return json({ error: 'Message not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Failed to delete campaign message:', error);
		return json({ error: 'Failed to delete message' }, { status: 500 });
	}
};
