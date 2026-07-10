/*
  src/services/role.service.js
  Coordinates role generation and persistence.
*/

import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class RoleService {
  constructor({ roleEngine }) {
    this.roleEngine = roleEngine;
  }

  async assignRole({ roomCode, playerId, playerName, seed, context } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    const player = game.players.find((p) => p.playerId === playerId);
    if (!player) throw new AppError('Player not found in room', 404);

    // Validate phase
    if (game.phase !== 'role_assignment') {
      throw new AppError('Game is not in role assignment phase', 400);
    }

    const character = await this.roleEngine.generateRole({ playerName: playerName || player.name, seed, context });

    // Persist character on player
    const updated = await gameRepository.assignCharacter(roomCode, playerId, character);

    return { character, game: updated };
  }
}

export default RoleService;
