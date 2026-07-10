import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class ClueService {
  constructor({ clueEngine }) {
    this.clueEngine = clueEngine;
  }

  async generateClues({ roomCode, storySeed, world, crime, playersSummary } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    // conservative phase check; allow generation during role_assignment or investigation
    if (game.phase !== 'role_assignment' && game.phase !== 'investigation' && game.phase !== 'introduction') {
      // do not block, but keep conservative
    }

    const rawClues = await this.clueEngine.generateClues({ storySeed, world, crime, playersSummary });

    // Normalize clues to ensure evidenceRefs is always an array and ids exist
    const clues = rawClues.map((c, idx) => ({
      id: c.id || `clue-${idx + 1}`,
      text: c.text || c.description || '',
      location: c.location || c.place || 'unknown',
      evidenceRefs: Array.isArray(c.evidenceRefs) ? c.evidenceRefs : (c.evidenceRefs ? [c.evidenceRefs] : []),
    }));

    const updated = await gameRepository.appendClues(roomCode, clues);

    return { clues, game: updated };
  }
}

export default ClueService;
