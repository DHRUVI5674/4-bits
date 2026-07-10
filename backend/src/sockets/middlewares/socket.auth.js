import gameRepository from '../../repositories/game.repository.js';
import { ERROR_CODES } from '../../constants/socket.events.js';
import { emitError } from '../helpers/socket.helpers.js';

/**
 * @file socket.auth.js
 * @description Middleware to authenticate player and room before joining.
 */
export const socketAuth = async (socket, next) => {
  const { roomCode, playerId } = socket.handshake.auth;

  if (!roomCode || !playerId) {
    return next(new Error(JSON.stringify({ 
      code: ERROR_CODES.UNAUTHORIZED, 
      message: 'Room code and Player ID are required' 
    })));
  }

  try {
    const { game, player } = await gameRepository.findByPlayerId(roomCode, playerId);

    if (!game) {
      return next(new Error(JSON.stringify({ 
        code: ERROR_CODES.ROOM_NOT_FOUND, 
        message: 'Room not found' 
      })));
    }

    if (!player) {
      return next(new Error(JSON.stringify({ 
        code: ERROR_CODES.PLAYER_NOT_FOUND, 
        message: 'Player not found in this room' 
      })));
    }

    // Attach verified data to socket object
    socket.data.roomCode = roomCode.toUpperCase();
    socket.data.playerId = playerId;
    socket.data.playerName = player.name;

    next();
  } catch (error) {
    next(new Error(JSON.stringify({ 
      code: ERROR_CODES.INTERNAL_ERROR, 
      message: 'Authentication failed' 
    })));
  }
};
