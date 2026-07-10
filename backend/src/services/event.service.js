import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';

class EventService {
  constructor({ eventEngine }) {
    this.eventEngine = eventEngine;
  }

  async generateEvents({ roomCode, storySeed, world, crime, playersSummary } = {}) {
    const game = await gameRepository.findByCode(roomCode);
    if (!game) throw new AppError('Game not found', 404);

    const events = await this.eventEngine.generateEvents({ storySeed, world, crime, playersSummary });
    const updated = await gameRepository.appendEvents(roomCode, events);
    return { events, game: updated };
  }
}

export default EventService;
