import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class NpcService {
  constructor({ npcEngine }) {
    this.npcEngine = npcEngine;
  }

  async generateNpcs({ roomCode, storySeed, world, crime } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    const npcs = await this.npcEngine.generateNpcs({ storySeed, world, crime });
    const updated = await gameRepository.appendNpcs(roomCode, npcs);
    return { npcs, game: updated };
  }
}

export default NpcService;
