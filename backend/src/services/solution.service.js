import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class SolutionService {
  constructor({ solutionEngine }) {
    this.solutionEngine = solutionEngine;
  }

  async generateSolution({ roomCode, storySeed, world, crime, playersSummary } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    const solution = await this.solutionEngine.generateSolution({ storySeed, world, crime, playersSummary });
    const updated = await gameRepository.setSolution(roomCode, solution);
    return { solution, game: updated };
  }
}

export default SolutionService;
