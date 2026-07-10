import { SOCKET_EVENTS } from '../../constants/socket.events.js';

/**
 * @file socket.helpers.js
 * @description Helper functions for common Socket.IO operations.
 */

/**
 * Broadcasts the current room state to all players in the room.
 * @param {import('socket.io').Server} io 
 * @param {Object} game 
 */
export const broadcastRoom = (io, game) => {
  const payload = {
    roomCode: game.roomCode,
    hostId: game.hostId,
    status: game.status,
    phase: game.gameState.phase,
    players: game.players.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      isHost: p.isHost,
      isReady: p.isReady,
      isConnected: p.isConnected,
    })),
  };
  io.to(game.roomCode).emit(SOCKET_EVENTS.ROOM_UPDATED, payload);
};

/**
 * Emits a structured error to a specific socket.
 * @param {import('socket.io').Socket} socket 
 * @param {string} code 
 * @param {string} message 
 */
export const emitError = (socket, code, message) => {
  socket.emit(SOCKET_EVENTS.ERROR, {
    success: false,
    code,
    message,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Joins a socket to a specific room.
 */
export const joinSocketRoom = (socket, roomCode) => {
  socket.join(roomCode);
  console.log(`[Socket] ${socket.id} joined room ${roomCode}`);
};

/**
 * Leaves a socket from a specific room.
 */
export const leaveSocketRoom = (socket, roomCode) => {
  socket.leave(roomCode);
  console.log(`[Socket] ${socket.id} left room ${roomCode}`);
};

/**
 * Gets all sockets in a room.
 */
export const getSocketsInRoom = async (io, roomCode) => {
  const sockets = await io.in(roomCode).fetchSockets();
  return sockets;
};
