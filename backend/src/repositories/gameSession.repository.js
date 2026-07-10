import GameSession from '../models/gameSession.model.js';

class GameSessionRepository {
  async findByRoomCode(roomCode) {
    return GameSession.findOne({ roomCode: roomCode.toUpperCase() });
  }

  async findByGameId(gameId) {
    return GameSession.findOne({ gameId });
  }

  async create(sessionData) {
    return GameSession.create(sessionData);
  }

  async save(session) {
    return session.save();
  }

  async updatePhase(roomCode, phase) {
    return GameSession.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $set: { phase } },
      { new: true }
    );
  }

  async updateStatus(roomCode, status) {
    return GameSession.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $set: { status } },
      { new: true }
    );
  }

  async deleteByRoomCode(roomCode) {
    return GameSession.deleteOne({ roomCode: roomCode.toUpperCase() });
  }

  async assignPlayerToCharacter(roomCode, characterId, playerId) {
    return GameSession.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase(), 'characters.characterId': characterId },
      { $set: { 'characters.$.playerId': playerId } },
      { new: true }
    );
  }
}

export default new GameSessionRepository();
