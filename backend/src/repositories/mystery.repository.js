import Mystery from '../models/mystery.model.js';

class MysteryRepository {
  async findByGameId(gameId) {
    return Mystery.findOne({ gameId });
  }

  async create(mysteryData) {
    return Mystery.create(mysteryData);
  }

  async updateClueDiscovered(gameId, clueId, playerId) {
    return Mystery.findOneAndUpdate(
      { gameId, 'clues.clueId': clueId },
      {
        $set: {
          'clues.$.discoveredByPlayerId': playerId,
          'clues.$.discoveredAt': new Date(),
        },
        $inc: { discoveredClueCount: 1 },
      },
      { new: true }
    );
  }

  async assignCharacter(gameId, characterId, playerId) {
    return Mystery.findOneAndUpdate(
      { gameId, 'characters.characterId': characterId },
      { $set: { 'characters.$.playerId': playerId } },
      { new: true }
    );
  }

  async updatePhase(gameId, phase) {
    return Mystery.findOneAndUpdate(
      { gameId },
      { $set: { currentPhase: phase, phaseStartTime: new Date() } },
      { new: true }
    );
  }

  async getPlayerCharacter(gameId, playerId) {
    const mystery = await this.findByGameId(gameId);
    if (!mystery) return null;
    const character = mystery.characters.find(c => c.playerId === playerId);
    return { mystery, character };
  }

  async getCharacterByCharacterId(gameId, characterId) {
    const mystery = await this.findByGameId(gameId);
    if (!mystery) return null;
    const character = mystery.characters.find(c => c.characterId === characterId);
    return { mystery, character };
  }

  async deleteByGameId(gameId) {
    return Mystery.deleteOne({ gameId });
  }
}

export default new MysteryRepository();
