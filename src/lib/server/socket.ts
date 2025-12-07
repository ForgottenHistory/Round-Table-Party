import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import { logger } from './utils/logger';

// Use global to persist Socket.IO instance across hot reloads
declare global {
	var __socketio: SocketIOServer | undefined;
}

let io: SocketIOServer | null = global.__socketio || null;

/**
 * Initialize Socket.IO server
 */
export function initSocketServer(httpServer: Server) {
	if (io) {
		logger.warn('Socket.IO server already initialized');
		return io;
	}

	io = new SocketIOServer(httpServer, {
		cors: {
			origin: '*',
			methods: ['GET', 'POST']
		}
	});

	// Store in global for persistence across hot reloads
	global.__socketio = io;

	io.on('connection', (socket) => {
		logger.info(`Socket connected: ${socket.id}`);

		socket.on('disconnect', () => {
			logger.info(`Socket disconnected: ${socket.id}`);
		});

		// Join a conversation room
		socket.on('join-conversation', (conversationId: number) => {
			socket.join(`conversation-${conversationId}`);
			logger.debug(`Socket ${socket.id} joined conversation ${conversationId}`);
		});

		// Leave a conversation room
		socket.on('leave-conversation', (conversationId: number) => {
			socket.leave(`conversation-${conversationId}`);
			logger.debug(`Socket ${socket.id} left conversation ${conversationId}`);
		});
	});

	logger.success('Socket.IO server initialized');
	console.log('🔍 Socket.IO instance stored in global:', global.__socketio ? 'YES' : 'NO');
	return io;
}

/**
 * Get Socket.IO server instance
 */
export function getSocketServer(): SocketIOServer | null {
	return io;
}

/**
 * Emit a new message to a conversation room
 */
export function emitMessage(conversationId: number, message: any) {
	// Try to get from global if not set
	if (!io && global.__socketio) {
		io = global.__socketio;
		console.log('🔍 Retrieved Socket.IO from global');
	}

	console.log('🔍 emitMessage called, io instance:', io ? 'EXISTS' : 'NULL');
	console.log('🔍 global.__socketio:', global.__socketio ? 'EXISTS' : 'NULL');

	if (!io) {
		logger.warn('Socket.IO not initialized, cannot emit message');
		return;
	}

	io.to(`conversation-${conversationId}`).emit('new-message', message);
	logger.info(`Emitted message to conversation ${conversationId}`);
}

/**
 * Emit typing indicator to a conversation room
 */
export function emitTyping(conversationId: number, isTyping: boolean) {
	// Try to get from global if not set
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) return;
	io.to(`conversation-${conversationId}`).emit('typing', isTyping);
	logger.debug(`Emitted typing=${isTyping} to conversation ${conversationId}`);
}

/**
 * Emit player joined event to a campaign room
 */
export function emitPlayerJoined(campaignId: number, player: any) {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) return;
	io.to(`conversation-${campaignId}`).emit('player-joined', player);
	logger.info(`Emitted player-joined to campaign ${campaignId}`);
}

/**
 * Emit player left event to a campaign room
 */
export function emitPlayerLeft(campaignId: number, userId: number) {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) return;
	io.to(`conversation-${campaignId}`).emit('player-left', { userId });
	logger.info(`Emitted player-left to campaign ${campaignId}`);
}

/**
 * Emit character created/updated event to a campaign room
 */
export function emitCharacterUpdated(campaignId: number, userId: number, character: any) {
	if (!io && global.__socketio) {
		io = global.__socketio;
	}

	if (!io) return;
	io.to(`conversation-${campaignId}`).emit('character-updated', { userId, character });
	logger.info(`Emitted character-updated to campaign ${campaignId}`);
}
