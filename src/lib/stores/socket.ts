import { writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';

let socket: Socket | null = null;

/**
 * Initialize Socket.IO client connection
 */
export function initSocket() {
	if (!browser) return null;

	// Return existing socket if connected or connecting
	if (socket) {
		if (socket.connected) return socket;
		// If disconnected, try to reconnect
		if (socket.disconnected) {
			socket.connect();
			return socket;
		}
		return socket;
	}

	// Connect to current window location (handles port changes)
	socket = io(window.location.origin, {
		path: '/socket.io',
		transports: ['polling', 'websocket'], // Try polling first (more reliable in dev)
		reconnection: true,
		reconnectionAttempts: 5,
		reconnectionDelay: 1000,
		timeout: 20000
	});

	socket.on('connect', () => {
		console.log('✅ Socket.IO connected to', window.location.origin);
	});

	socket.on('disconnect', (reason) => {
		console.log('❌ Socket.IO disconnected:', reason);
	});

	socket.on('connect_error', (err) => {
		console.error('❌ Socket.IO connection error:', err.message);
	});

	return socket;
}

/**
 * Get Socket.IO client instance
 */
export function getSocket(): Socket | null {
	return socket;
}

/**
 * Join a conversation room
 */
export function joinConversation(conversationId: number) {
	if (!socket) return;
	socket.emit('join-conversation', conversationId);
	console.log(`🔌 Joined conversation ${conversationId}`);
}

/**
 * Leave a conversation room
 */
export function leaveConversation(conversationId: number) {
	if (!socket) return;
	socket.emit('leave-conversation', conversationId);
	console.log(`🔌 Left conversation ${conversationId}`);
}

/**
 * Listen for new messages
 */
export function onNewMessage(callback: (message: any) => void) {
	if (!socket) return;
	socket.on('new-message', callback);
}

/**
 * Listen for typing indicator
 */
export function onTyping(callback: (isTyping: boolean) => void) {
	if (!socket) return;
	socket.on('typing', callback);
}

/**
 * Listen for player joined events
 */
export function onPlayerJoined(callback: (player: any) => void) {
	if (!socket) return;
	socket.on('player-joined', callback);
}

/**
 * Listen for player left events
 */
export function onPlayerLeft(callback: (data: { userId: number }) => void) {
	if (!socket) return;
	socket.on('player-left', callback);
}

/**
 * Listen for character updated events
 */
export function onCharacterUpdated(callback: (data: { userId: number; character: any }) => void) {
	if (!socket) return;
	socket.on('character-updated', callback);
}

/**
 * Listen for GM responding state changes
 */
export function onGMResponding(callback: (data: { responding: boolean }) => void) {
	if (!socket) return;
	socket.on('gm-responding', callback);
}

/**
 * Listen for campaign deleted event
 */
export function onCampaignDeleted(callback: (data: { campaignId: number }) => void) {
	if (!socket) return;
	socket.on('campaign-deleted', callback);
}

/**
 * Listen for campaign started event
 */
export function onCampaignStarted(callback: (data: { campaignId: number }) => void) {
	if (!socket) return;
	socket.on('campaign-started', callback);
}

/**
 * Remove all listeners
 */
export function removeAllListeners() {
	if (!socket) return;
	socket.off('new-message');
	socket.off('typing');
	socket.off('player-joined');
	socket.off('player-left');
	socket.off('character-updated');
	socket.off('gm-responding');
	socket.off('campaign-deleted');
	socket.off('campaign-started');
}
