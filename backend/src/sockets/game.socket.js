import * as gameService from '../services/game.service.js';
import { SOCKET_EVENTS, ERROR_CODES } from './events/socket.events.js';

const gameHandler = (io, socket) => {
  const { roomCode, playerId } = socket.data;

  const handleGetSession = async () => {
    try {
      const session = await gameService.getGameSession(roomCode);
      socket.emit(SOCKET_EVENTS.GAME_INITIALIZED, {
        gameId: session.gameId,
        phase: session.phase,
        theme: session.theme,
        location: session.location,
        victim: session.victim,
        timeOfDeath: session.timeOfDeath,
        causeOfDeath: session.causeOfDeath,
        suspectCount: session.suspects.length,
      });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: ERROR_CODES.SESSION_NOT_FOUND,
        message: error.message,
      });
    }
  };

  const handleGetMyCharacter = async () => {
    try {
      const character = await gameService.getPlayerGameCharacter(roomCode, playerId);
      socket.emit(SOCKET_EVENTS.CHARACTER_ASSIGNED, character);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: ERROR_CODES.PLAYER_NOT_FOUND,
        message: error.message,
      });
    }
  };

  const handlePlayerMoved = (data) => {
    socket.to(roomCode).emit('player-moved', data);
  };

  socket.on('get-session', handleGetSession);
  socket.on('get-my-character', handleGetMyCharacter);
  socket.on('player-moved', handlePlayerMoved);
};

export default gameHandler;
