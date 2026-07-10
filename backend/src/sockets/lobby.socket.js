import * as gameService from '../services/game.service.js';
import { SOCKET_EVENTS, ERROR_CODES } from './events/socket.events.js';
import { broadcastRoom, emitError, joinSocketRoom, leaveSocketRoom } from './helpers/socket.helpers.js';

/**
 * @file lobby.socket.js
 * @description Handles real-time lobby events (joining, readying, starting).
 */
const lobbyHandler = (io, socket) => {
  const { roomCode, playerId, playerName } = socket.data;

  /**
   * Completes the join process after authentication.
   */
  const handleJoinRoom = async () => {
    try {
      console.log(`[Lobby] Player ${playerName} (${playerId}) joining room ${roomCode}`);
      
      // Update DB presence
      const game = await gameService.updatePresence(roomCode, playerId, socket.id, true);
      
      // Join socket room
      joinSocketRoom(socket, roomCode);

      // Acknowledge success to client
      socket.emit(SOCKET_EVENTS.JOIN_SUCCESS, {
        success: true,
        roomCode,
        player: game.players.find(p => p.playerId === playerId),
        players: game.players
      });

      // Notify others
      socket.to(roomCode).emit(SOCKET_EVENTS.PLAYER_JOINED, {
        player: game.players.find(p => p.playerId === playerId)
      });

      // Sync entire lobby
      broadcastRoom(io, game);
    } catch (error) {
      console.error(`[Lobby Error] Join failed: ${error.message}`);
      emitError(socket, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  };

  /**
   * Toggles player ready status.
   */
  const handlePlayerReady = async () => {
    try {
      const game = await gameService.toggleReady(roomCode, playerId);
      const player = game.players.find(p => p.playerId === playerId);

      io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_READY_UPDATED, {
        playerId,
        isReady: player.isReady
      });

      broadcastRoom(io, game);
    } catch (error) {
      emitError(socket, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  };

  /**
   * Starts the game.
   */
  const handleStartGame = async () => {
    try {
      const game = await gameService.startGame(roomCode, playerId);
      
      io.to(roomCode).emit(SOCKET_EVENTS.GAME_STARTED, { status: 'started' });
      
      broadcastRoom(io, game);
    } catch (error) {
      emitError(socket, ERROR_CODES.NOT_HOST, error.message);
    }
  };

  /**
   * Handles manual room leave.
   */
  const handleLeaveRoom = async () => {
    try {
      const result = await gameService.leaveGame(roomCode, playerId);
      leaveSocketRoom(socket, roomCode);

      if (result) {
        io.to(roomCode).emit(SOCKET_EVENTS.PLAYER_LEFT, { playerId });
        
        if (result.wasHost) {
          io.to(roomCode).emit(SOCKET_EVENTS.HOST_CHANGED, { newHostId: result.newHostId });
        }
        
        broadcastRoom(io, result.game);
      }
    } catch (error) {
      emitError(socket, ERROR_CODES.INTERNAL_ERROR, error.message);
    }
  };

  /**
   * Handles player reconnection logic.
   */
  const handleReconnect = async () => {
    await handleJoinRoom();
  };

  // Register listeners
  socket.on(SOCKET_EVENTS.JOIN_ROOM, handleJoinRoom);
  socket.on(SOCKET_EVENTS.PLAYER_READY, handlePlayerReady);
  socket.on(SOCKET_EVENTS.START_GAME, handleStartGame);
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, handleLeaveRoom);
  socket.on(SOCKET_EVENTS.RECONNECT_PLAYER, handleReconnect);
};

export default lobbyHandler;
