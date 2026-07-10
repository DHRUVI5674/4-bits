import Game from '../models/game.model.js';
import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';
import { nanoid } from 'nanoid';
import { GAME_STATUS, GAME_PHASE } from '../constants/game.constants.js';

/**
 * @file game.service.js
 * @description Business logic for game management.
 */

export const createGame = async (name, mode, maxMembers, hostId, hostName) => {
  const roomCode = nanoid(6).toUpperCase();

  const gameData = {
    roomCode,
    name,
    mode,
    hostId,
    settings: {
      maxPlayers: maxMembers,
      minPlayers: 3,
    },
    players: [{
      playerId: hostId,
      name: hostName,
      isHost: true,
      isReady: true,
      isConnected: false // Socket will connect later
    }]
  };

  const game = await Game.create(gameData);

  return { game, hostId };
};

export const getGameByCode = async (roomCode) => {
  const game = await gameRepository.findByCode(roomCode);
  if (!game) {
    throw new AppError('Game not found', 404);
  }
  return game;
};

export const joinGame = async (roomCode, playerId, playerName) => {
  const game = await gameRepository.findByCode(roomCode);

  if (!game) {
    throw new AppError('Game not found', 404);
  }

  if (game.status !== GAME_STATUS.WAITING) {
    throw new AppError('Game has already started', 400);
  }

  if (game.players.length >= game.settings.maxPlayers) {
    throw new AppError('Game is full', 400);
  }

  const nameExists = game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase() && p.playerId !== playerId);
  if (nameExists) {
    throw new AppError('Player name already taken in this room', 400);
  }

  const existingPlayerIndex = game.players.findIndex(p => p.playerId === playerId);
  if (existingPlayerIndex >= 0) {
    // Player is rejoining, update their name if it changed
    game.players[existingPlayerIndex].name = playerName;
  } else {
    game.players.push({
      playerId,
      name: playerName,
      isHost: false,
      isReady: false,
      isConnected: false
    });
  }

  await gameRepository.save(game);
  return { game, playerId };
};

export const leaveGame = async (roomCode, playerId) => {
  const { game, player } = await gameRepository.findByPlayerId(roomCode, playerId);
  if (!game || !player) {
    throw new AppError('Game or Player not found', 404);
  }

  const wasHost = player.isHost;
  const updatedGame = await gameRepository.removePlayer(roomCode, playerId);

  if (!updatedGame || updatedGame.players.length === 0) {
    await gameRepository.deleteGame(roomCode);
    return null;
  }

  let newHostId = updatedGame.hostId;
  if (wasHost) {
    updatedGame.players[0].isHost = true;
    newHostId = updatedGame.players[0].playerId;
    updatedGame.hostId = newHostId;
    await gameRepository.save(updatedGame);
  }

  return { game: updatedGame, newHostId, wasHost };
};

export const toggleReady = async (roomCode, playerId) => {
  const { game, player } = await gameRepository.findByPlayerId(roomCode, playerId);
  if (!game || !player) {
    throw new AppError('Player not found', 404);
  }

  player.isReady = !player.isReady;
  await gameRepository.save(game);
  return game;
};

export const startGame = async (roomCode, hostId) => {
  const game = await gameRepository.findByCode(roomCode);
  if (!game) {
    throw new AppError('Game not found', 404);
  }

  if (game.hostId !== hostId) {
    throw new AppError('Only the host can start the game', 403);
  }

  if (game.players.length < game.settings.minPlayers) {
    throw new AppError(`Minimum ${game.settings.minPlayers} players required to start`, 400);
  }

  const allReady = game.players.every(p => p.isReady);
  if (!allReady) {
    throw new AppError('All players must be ready to start', 400);
  }

  game.status = GAME_STATUS.STARTED;
  game.gameState.phase = GAME_PHASE.INVESTIGATION;
  
  await gameRepository.save(game);
  return game;
};

export const updatePresence = async (roomCode, playerId, socketId, isConnected) => {
  return gameRepository.updatePlayer(roomCode, playerId, {
    socketId: isConnected ? socketId : null,
    isConnected,
    lastSeen: new Date()
  });
};

export const handleHeartbeat = async (socketId) => {
  const result = await gameRepository.findBySocketId(socketId);
  if (!result) return null;

  const player = result.players.find(p => p.socketId === socketId);
  return gameRepository.updatePlayer(result.roomCode, player.playerId, {
    lastSeen: new Date(),
    isConnected: true
  });
};

export const getPlayerBySocketId = async (socketId) => {
  const game = await gameRepository.findBySocketId(socketId);
  if (!game) return null;
  const player = game.players.find(p => p.socketId === socketId);
  return { game, player };
};

export const getPlayerCharacter = async (roomCode, playerId) => {
  const { game, player } = await gameRepository.findByPlayerId(roomCode, playerId);
  if (!game || !player) {
    throw new AppError('Game or Player not found', 404);
  }

  if (game.status === GAME_STATUS.WAITING) {
    throw new AppError('Game has not started yet', 400);
  }

  return player.character;
};
