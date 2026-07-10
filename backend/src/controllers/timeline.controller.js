import { successResponse } from '../utils/responseFormatter.js';
import TimelineEngine from '../engine/timeline/index.js';
import TimelineEngineService from '../engine/timeline/service.js';
import TimelineService from '../services/timeline.service.js';
import OllamaService from '../ai/ollama.service.js';

const aiClient = new OllamaService();
const timelineEngine = new TimelineEngine({ aiClient });
const timelineEngineService = new TimelineEngineService({ timelineEngine });
const timelineService = new TimelineService({ timelineEngine: timelineEngineService });

export const generateTimeline = async (req, res, next) => {
  try {
    const { roomCode, hostId, storySeed } = req.body;

    const result = await timelineService.generateTimeline({ roomCode, storySeed });

    successResponse(res, result.events, 'Timeline generated and saved', 201);
  } catch (error) {
    next(error);
  }
};
