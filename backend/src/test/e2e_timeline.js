import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import * as gameService from '../services/game.service.js';
import OllamaService from '../ai/ollama.service.js';
import StoryEngine from '../engine/story/index.js';
import StoryModuleService from '../engine/story/service.js';
import TimelineEngine from '../engine/timeline/index.js';
import TimelineEngineService from '../engine/timeline/service.js';
import gameRepository from '../repositories/game.repository.js';

dotenv.config();

async function run() {
  try {
    console.log('Connecting to DB...');
    await connectDB();

    console.log('Creating game room...');
    const { game, hostId } = await gameService.createGame('E2EHost');
    const roomCode = game.roomCode;
    console.log('Created room:', roomCode, 'hostId:', hostId);

    // Setup AI clients and engines
    const aiClient = new OllamaService();
    const storyEngine = new StoryEngine({ aiClient });
    const storyService = new StoryModuleService({ storyEngine });

    console.log('Generating story via Ollama...');
    const story = await storyService.generate({ theme: 'Victorian Manor', seed: 'e2e-seed-1' });
    console.log('Story generated:', story);

    // Persist story
    const updated = await gameRepository.updateStory(roomCode, {
      theme: 'Victorian Manor',
      difficulty: 'medium',
      storySeed: story.storySeed,
      world: story.world,
      crime: story.crime,
      victim: story.victim,
      murderer: story.murderer,
      phase: 'role_assignment',
    });

    console.log('Story saved to DB. Generating timeline...');

    const timelineAi = new OllamaService();
    const timelineEngine = new TimelineEngine({ aiClient: timelineAi });
    const timelineService = new TimelineEngineService({ timelineEngine });

    const events = await timelineService.generate({ storySeed: story.storySeed, world: story.world, crime: story.crime, playersSummary: [] });

    console.log('Timeline generated:', events);

    const saved = await gameRepository.appendTimeline(roomCode, events);
    console.log('Timeline appended to game:', saved.roomCode);

    console.log('E2E timeline generation completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('E2E test failed:', err);
    process.exit(1);
  }
}

run();
