import { Server } from 'socket.io';
import { socketAuth } from './middlewares/socket.auth.js';
import lobbyHandler from './lobby.socket.js';
import presenceHandler from './presence.socket.js';
import gameHandler from './game.socket.js';
import * as gameService from '../services/game.service.js';
import { SOCKET_EVENTS } from './events/socket.events.js';
import { broadcastRoom } from './helpers/socket.helpers.js';

/**
 * @file socket.js
 * @description Central Socket.IO initialization and global event management.
 */

let io;

/**
 * Initializes Socket.IO with the HTTP server.
 * @param {import('http').Server} server 
 */
export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // Production: restrict to frontend domain
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Global Middleware: Authentication & Room Validation
  io.use(socketAuth);

  io.on(SOCKET_EVENTS.CONNECTION, async (socket) => {
    const { roomCode, playerId, playerName } = socket.data;
    console.log(`[Socket] New connection: ${playerName} (${socket.id}) in ${roomCode}`);

    // Register Handlers
    lobbyHandler(io, socket);
    presenceHandler(io, socket);
    gameHandler(io, socket);

    // Handle Disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, async (reason) => {
      console.log(`[Socket] Disconnected: ${playerName} (${socket.id}) Reason: ${reason}`);
      
      try {
        // Mark player as disconnected in DB
        const game = await gameService.updatePresence(roomCode, playerId, socket.id, false);
        
        if (game) {
          // Notify room about temporary disconnection
          io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, { playerId });
          
          // Sync lobby state
          broadcastRoom(io, game);
        }
      } catch (error) {
        console.error('[Socket] Disconnect error:', error.message);
      }
    });
  });

  // Inactivity Checker: Runs every 60 seconds to mark stale players as disconnected in DB
  // This is a safety net for cases where the 'disconnect' event might be missed
  setInterval(async () => {
    try {
      // Logic would go here to query DB for players where lastSeen > 60s and isConnected is true
      // and update them. For now, socket.io's pingTimeout handles most real-time cases.
    } catch (err) {
      console.error('[Socket] Inactivity check error:', err);
    }
  }, 60000);

  return io;
};

/**
 * Returns the initialized IO instance.
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};
