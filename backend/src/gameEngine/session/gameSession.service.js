import gameSessionRepository from '../../repositories/gameSession.repository.js';
import AppError from '../../utils/appError.js';

class GameSessionService {
  async createSession(sessionData) {
    const existing = await gameSessionRepository.findByRoomCode(sessionData.roomCode);
    if (existing) {
      throw new AppError('A game session already exists for this room', 409);
    }
    return gameSessionRepository.create(sessionData);
  }

  async getSessionByRoomCode(roomCode) {
    const session = await gameSessionRepository.findByRoomCode(roomCode);
    if (!session) {
      throw new AppError('Game session not found', 404);
    }
    return session;
  }

  async getSessionByGameId(gameId) {
    const session = await gameSessionRepository.findByGameId(gameId);
    if (!session) {
      throw new AppError('Game session not found', 404);
    }
    return session;
  }

  async updatePhase(roomCode, phase) {
    const session = await gameSessionRepository.updatePhase(roomCode, phase);
    if (!session) {
      throw new AppError('Game session not found', 404);
    }
    return session;
  }

  async updateStatus(roomCode, status) {
    const session = await gameSessionRepository.updateStatus(roomCode, status);
    if (!session) {
      throw new AppError('Game session not found', 404);
    }
    return session;
  }

  async assignPlayerToCharacter(roomCode, characterId, playerId) {
    const session = await gameSessionRepository.assignPlayerToCharacter(roomCode, characterId, playerId);
    if (!session) {
      throw new AppError('Game session or character not found', 404);
    }
    return session;
  }

  async getCharacterForPlayer(roomCode, playerId) {
    const session = await this.getSessionByRoomCode(roomCode);
    const character = session.characters.find(c => c.playerId === playerId);
    if (!character) {
      throw new AppError('No character assigned to this player', 404);
    }
    return character;
  }

  async deleteSession(roomCode) {
    return gameSessionRepository.deleteByRoomCode(roomCode);
  }

  async sessionExists(roomCode) {
    const session = await gameSessionRepository.findByRoomCode(roomCode);
    return !!session;
  }

  toPublicStory(session) {
    return {
      theme: session.theme,
      location: session.location,
      victim: session.victim,
      timeOfDeath: session.timeOfDeath,
      causeOfDeath: session.causeOfDeath,
      suspectCount: session.suspects.length,
    };
  }

  toPlayerCharacter(playerId, session) {
    const character = session.characters.find(c => c.playerId === playerId);
    if (!character) return null;

    return {
      characterId: character.characterId,
      name: character.name,
      age: character.age,
      occupation: character.occupation,
      personality: character.personality,
      publicBackground: character.publicBackground,
      privateSecret: character.privateSecret,
      objective: character.objective,
      inventory: character.inventory,
      alibi: character.alibi,
      motive: character.motive,
      knownClues: character.knownClues,
      relationships: character.relationships.filter(r => r.visibility === 'public'),
      isMurderer: character.isMurderer,
    };
  }

  toInvestigatorSummary(session) {
    return {
      characters: session.characters
        .filter(c => !c.isVictim)
        .map(c => ({
          characterId: c.characterId,
          name: c.name,
          occupation: c.occupation,
          publicBackground: c.publicBackground,
        })),
      evidence: session.evidence.map(e => ({
        evidenceId: e.evidenceId,
        name: e.name,
        description: e.description,
        type: e.type,
        location: e.location,
      })),
      timeline: session.timeline
        .filter(t => !t.hidden)
        .map(t => ({
          timestamp: t.timestamp,
          location: t.location,
          actor: t.actor,
          action: t.action,
        })),
    };
  }

  toFullState(session) {
    return {
      gameId: session.gameId,
      roomCode: session.roomCode,
      status: session.status,
      phase: session.phase,
      theme: session.theme,
      location: session.location,
      victim: session.victim,
      murderer: session.murderer,
      murderWeapon: session.murderWeapon,
      causeOfDeath: session.causeOfDeath,
      timeOfDeath: session.timeOfDeath,
      motiveSummary: session.motiveSummary,
      suspects: session.suspects,
      characters: session.characters,
      evidence: session.evidence,
      timeline: session.timeline,
      solution: session.solution,
      createdAt: session.createdAt,
    };
  }
}

export default new GameSessionService();
