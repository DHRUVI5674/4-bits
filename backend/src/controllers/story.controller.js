import { successResponse } from '../utils/responseFormatter.js';
import gameRepository from '../repositories/game.repository.js';
import StoryModuleService from '../engine/story/service.js';
import StoryEngine from '../engine/story/index.js';
import OllamaService from '../ai/ollama.service.js';
import AppError from '../utils/appError.js';

const aiClient = new OllamaService();
const storyEngine = new StoryEngine({ aiClient });
const storyService = new StoryModuleService({ storyEngine });

export const createStory = async (req, res, next) => {
  try {
    const { roomCode, hostId, theme, difficulty, seed } = req.body;

    const existingGame = roomCode ? await gameRepository.findByCode(roomCode) : null;
    if (!existingGame) {
      throw new AppError('Game not found. Create a room first before generating story.', 404);
    }

    if (existingGame.hostId !== hostId) {
      throw new AppError('Only the host may generate the story.', 403);
    }

    const storyResult = await storyService.generate({ theme: theme || existingGame.theme || 'murder mystery', seed });

    const updatedGame = await gameRepository.updateStory(existingGame.roomCode, {
      theme: theme || existingGame.theme,
      difficulty: difficulty || existingGame.difficulty,
      storySeed: storyResult.storySeed,
      world: storyResult.world,
      crime: storyResult.crime,
      victim: storyResult.victim,
      murderer: storyResult.murderer,
      phase: 'role_assignment',
    });

    successResponse(res, updatedGame, 'Story generated and saved successfully', 201);
  } catch (error) {
    next(error);
  }
};
