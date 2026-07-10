import Game from '../models/game.model.js';

/**
 * @file game.repository.js
 * @description Encapsulates database access for Game and Player entities.
 */

class GameRepository {
  async findByCode(roomCode) {
    return Game.findOne({ roomCode: roomCode.toUpperCase() });
  }

  async findBySocketId(socketId) {
    return Game.findOne({ 'players.socketId': socketId });
  }

  async findByPlayerId(roomCode, playerId) {
    const game = await this.findByCode(roomCode);
    if (!game) return null;
    const player = game.players.find((p) => p.playerId === playerId);
    return { game, player };
  }

  async updatePlayer(roomCode, playerId, updateData) {
    const updateQuery = {};
    for (const [key, value] of Object.entries(updateData)) {
      updateQuery[`players.$.${key}`] = value;
    }

    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase(), 'players.playerId': playerId },
      { $set: updateQuery },
      { new: true }
    );
  }

  async assignCharacter(roomCode, playerId, character) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase(), 'players.playerId': playerId },
      { $set: { 'players.$.character': character } },
      { new: true }
    );
  }

  async removePlayer(roomCode, playerId) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $pull: { players: { playerId } } },
      { new: true }
    );
  }

  async deleteGame(roomCode) {
    return Game.deleteOne({ roomCode: roomCode.toUpperCase() });
  }

  async save(game) {
    return game.save();
  }

  async updateStory(roomCode, storyData) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $set: storyData },
      { new: true }
    );
  }

  async appendTimeline(roomCode, timelineEvents) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $push: { timeline: { $each: timelineEvents } } },
      { new: true }
    );
  }

  async appendClues(roomCode, clues) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $push: { 'gameState.mystery.clues': { $each: clues } } },
      { new: true }
    );
  }

  async appendEvents(roomCode, events) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $push: { 'gameState.mystery.timeline': { $each: events } } },
      { new: true }
    );
  }

  async appendNpcs(roomCode, npcs) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $push: { 'gameState.mystery.npcs': { $each: npcs } } },
      { new: true }
    );
  }

  async setSolution(roomCode, solution) {
    return Game.findOneAndUpdate(
      { roomCode: roomCode.toUpperCase() },
      { $set: { 'gameState.mystery.solution': solution } },
      { new: true }
    );
  }
}

export default new GameRepository();
