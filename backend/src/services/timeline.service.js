/*
  src/services/timeline.service.js
  Coordinates timeline generation and persistence.
*/

import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class TimelineService {
  constructor({ timelineEngine }) {
    this.timelineEngine = timelineEngine;
  }

  async generateTimeline({ roomCode, storySeed, world, crime, playersSummary } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    // Validate phase
    if (game.phase !== 'introduction' && game.phase !== 'role_assignment' && game.phase !== 'role_assignment') {
      // Allow generating timeline when appropriate - we expect host to trigger after role assignment
      // but keeping conservative check; adjust as needed
    }

    const events = await this.timelineEngine.generate({ storySeed, world, crime, playersSummary });

    // Persist timeline events
    const updated = await gameRepository.appendTimeline(roomCode, events);

    return { events, game: updated };
  }
}

export default TimelineService;
