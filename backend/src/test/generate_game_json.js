import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Game from '../models/game.model.js';
import OllamaService from '../ai/ollama.service.js';
import { buildStoryPrompt } from '../prompts/story.prompt.js';
import { buildRolePrompt } from '../prompts/role.prompt.js';
import { buildTimelinePrompt } from '../prompts/timeline.prompt.js';

dotenv.config();

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

async function parseAiResponse(response) {
  if (response == null) {
    throw new Error('Empty AI response');
  }

  if (typeof response === 'string') {
    return JSON.parse(response);
  }

  if (typeof response === 'object') {
    if (typeof response.response === 'string') {
      const candidate = response.response.trim();
      try {
        return JSON.parse(candidate);
      } catch (err) {
        throw new Error(`Failed to parse nested AI response string: ${err.message}`);
      }
    }

    if (response.result != null) {
      if (typeof response.result === 'string') {
        return JSON.parse(response.result);
      }
      return response.result;
    }

    if (response.output != null) {
      const output = response.output;
      if (typeof output === 'string') {
        return JSON.parse(output);
      }
      return output;
    }
  }

  return response;
}

async function generateStory(aiClient, theme, seed) {
  const prompt = buildStoryPrompt({ theme, seed });
  const response = await aiClient.generateCompletion(prompt);
  return parseAiResponse(response);
}

async function generateRole(aiClient, playerName, seed, context) {
  const prompt = buildRolePrompt({ playerName, seed, context });
  const response = await aiClient.generateCompletion(prompt);
  return parseAiResponse(response);
}

async function generateTimeline(aiClient, storySeed, world, crime, playersSummary) {
  const prompt = buildTimelinePrompt({ storySeed, world, crime, playersSummary });
  const response = await aiClient.generateCompletion(prompt);
  return parseAiResponse(response);
}

function makePlayersContext(story, roles) {
  return {
    storySeed: story.storySeed,
    world: story.world,
    crime: story.crime,
    victim: story.victim,
    murderer: story.murderer,
    existingPlayers: roles.map((role) => ({
      id: role.id,
      name: role.name,
      occupation: role.occupation,
      motive: role.motive,
    })),
  };
}

import fs from 'fs';
import path from 'path';

async function run() {
  await connectDB();
  const aiClient = new OllamaService();
  const theme = 'Victorian Manor murder mystery';
  const storySeed = `game-json-${Date.now()}`;

  console.error('Generating story...');
  const story = await generateStory(aiClient, theme, storySeed);

  const playerNames = ['Astra', 'Beck', 'Cira'];
  const roles = [];

  for (let i = 0; i < playerNames.length; i += 1) {
    const playerName = playerNames[i];
    const seed = `${storySeed}-player-${i + 1}`;
    const context = makePlayersContext(story, roles);
    console.error(`Generating role for ${playerName}...`);

    const role = await generateRole(aiClient, playerName, seed, context);
    roles.push(role);
  }

  const playersSummary = roles.map((role) => ({
    id: role.id,
    name: role.name,
    occupation: role.occupation,
    objective: role.objective,
    motive: role.motive,
    isMurderer: role.isMurderer,
  }));

  console.error('Generating timeline...');
  const timeline = await generateTimeline(aiClient, story.storySeed, story.world, story.crime, playersSummary);

  const output = {
    game: {
      theme,
      storySeed: story.storySeed,
      world: story.world,
      crime: story.crime,
      victim: story.victim,
      murderer: story.murderer,
    },
    players: roles,
    timeline,
  };

  const newGame = await Game.create({
    hostId: story.storySeed,
    phase: 'waiting',
    theme,
    storySeed: story.storySeed,
    world: story.world,
    crime: story.crime,
    victim: story.victim,
    murderer: story.murderer,
    players: roles.map((role, index) => ({
      playerId: `${story.storySeed}-p${index + 1}`,
      name: role.name,
      isHost: index === 0,
      isReady: true,
      isConnected: false,
      character: {
        name: role.name,
        background: role.background,
        objective: role.objective,
        hiddenInfo: role.secret,
        relationships: null,
        isMurderer: role.isMurderer,
      }
    })),
    gameState: {
      phase: 'role_assignment',
      mystery: {
        victim: story.victim,
        location: story.world,
        solution: story.murderer,
        timeline,
        clues: [],
        events: [],
        npcs: []
      }
    }
  });

  const filePath = path.resolve('src/test/generated_game_output.json');
  fs.writeFileSync(filePath, prettyJson(output), 'utf8');
  console.error(`Game JSON written to ${filePath}`);
  console.error(`Game document saved to MongoDB with roomCode ${newGame.roomCode}`);
  // Now generate clues, events, npcs, and solution via services
  const aiClient2 = new OllamaService();

  // Clues (use existing engine/service)
  const ClueEngine = (await import('../engine/clue/index.js')).default;
  const ClueEngineService = (await import('../engine/clue/service.js')).default;
  const ClueService = (await import('../services/clue.service.js')).default;
  const clueEngine = new ClueEngine({ aiClient: aiClient2 });
  const clueEngineService = new ClueEngineService({ clueEngine });
  const clueService = new ClueService({ clueEngine: clueEngineService });
  await clueService.generateClues({ roomCode: newGame.roomCode, storySeed: story.storySeed, world: story.world, crime: story.crime });

  // Events
  const EventEngine = (await import('../engine/event/index.js')).default;
  const EventEngineService = (await import('../engine/event/service.js')).default;
  const EventService = (await import('../services/event.service.js')).default;
  const eventEngine = new EventEngine({ aiClient: aiClient2 });
  const eventEngineService = new EventEngineService({ eventEngine });
  const eventService = new EventService({ eventEngine: eventEngineService });
  await eventService.generateEvents({ roomCode: newGame.roomCode, storySeed: story.storySeed, world: story.world, crime: story.crime });

  // NPCs
  const NpcEngine = (await import('../engine/npc/index.js')).default;
  const NpcEngineService = (await import('../engine/npc/service.js')).default;
  const NpcService = (await import('../services/npc.service.js')).default;
  const npcEngine = new NpcEngine({ aiClient: aiClient2 });
  const npcEngineService = new NpcEngineService({ npcEngine });
  const npcService = new NpcService({ npcEngine: npcEngineService });
  await npcService.generateNpcs({ roomCode: newGame.roomCode, storySeed: story.storySeed, world: story.world, crime: story.crime });

  // Solution
  const SolutionEngine = (await import('../engine/solution/index.js')).default;
  const SolutionEngineService = (await import('../engine/solution/service.js')).default;
  const SolutionService = (await import('../services/solution.service.js')).default;
  const solutionEngine = new SolutionEngine({ aiClient: aiClient2 });
  const solutionEngineService = new SolutionEngineService({ solutionEngine });
  const solutionService = new SolutionService({ solutionEngine: solutionEngineService });
  await solutionService.generateSolution({ roomCode: newGame.roomCode, storySeed: story.storySeed, world: story.world, crime: story.crime });
}

run().catch((error) => {
  console.error('Failed to generate game JSON:', error);
  process.exit(1);
});
