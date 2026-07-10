import * as gameService from '../services/game.service.js';
import { successResponse } from '../utils/responseFormatter.js';

/**
 * @file game.controller.js
 * @description REST Controllers for Game Management.
 */

export const createGame = async (req, res, next) => {
  try {
    const { name, mode, maxMembers, hostId, hostName } = req.body;
    const { game } = await gameService.createGame(name, mode, maxMembers, hostId, hostName);
    successResponse(res, { game, playerId: hostId }, 'Game created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getGame = async (req, res, next) => {
  try {
    const game = await gameService.getGameByCode(req.params.code.toUpperCase());
    successResponse(res, game);
  } catch (error) {
    next(error);
  }
};

export const joinGame = async (req, res, next) => {
  try {
    const { playerId, playerName } = req.body;
    const { game } = await gameService.joinGame(req.params.code.toUpperCase(), playerId, playerName);
    successResponse(res, { game, playerId }, 'Joined game successfully');
  } catch (error) {
    next(error);
  }
};

export const leaveGame = async (req, res, next) => {
  try {
    const { playerId } = req.body;
    const result = await gameService.leaveGame(req.params.code.toUpperCase(), playerId);
    
    // Note: If result is null, the game was deleted because it's empty
    successResponse(res, result ? result.game : null, 'Left game successfully');
  } catch (error) {
    next(error);
  }
};

export const getPlayers = async (req, res, next) => {
  try {
    const game = await gameService.getGameByCode(req.params.code.toUpperCase());
    successResponse(res, game.players);
  } catch (error) {
    next(error);
  }
};

export const toggleReady = async (req, res, next) => {
  try {
    const { code, playerId } = req.params;
    const game = await gameService.toggleReady(code.toUpperCase(), playerId);
    successResponse(res, game, 'Ready status updated');
  } catch (error) {
    next(error);
  }
};

export const startGame = async (req, res, next) => {
  try {
    const { hostId } = req.body;
    const game = await gameService.startGame(req.params.code.toUpperCase(), hostId);
    successResponse(res, game, 'Game started successfully');
  } catch (error) {
    next(error);
  }
};

export const getCharacter = async (req, res, next) => {
  try {
    const { code, playerId } = req.params;
    const character = await gameService.getPlayerCharacter(code.toUpperCase(), playerId);
    successResponse(res, character);
  } catch (error) {
    next(error);
  }
};

export const deleteGame = async (req, res, next) => {
  try {
    const { hostId } = req.body;
    await gameService.deleteGame(req.params.code.toUpperCase(), hostId);
    successResponse(res, null, 'Game deleted successfully', 204);
  } catch (error) {
    next(error);
  }
};
