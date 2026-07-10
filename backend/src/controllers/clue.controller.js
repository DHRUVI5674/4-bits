import { successResponse } from '../utils/responseFormatter.js';
import ClueEngine from '../engine/clue/index.js';
import ClueEngineService from '../engine/clue/service.js';
import ClueService from '../services/clue.service.js';
import OllamaService from '../ai/ollama.service.js';

const aiClient = new OllamaService();
const clueEngine = new ClueEngine({ aiClient });
const clueEngineService = new ClueEngineService({ clueEngine });
const clueService = new ClueService({ clueEngine: clueEngineService });

export const generateClues = async (req, res, next) => {
  try {
    const { roomCode, hostId, storySeed } = req.body;

    const result = await clueService.generateClues({ roomCode, storySeed });

    successResponse(res, result.clues, 'Clues generated and saved', 201);
  } catch (error) {
    next(error);
  }
};
