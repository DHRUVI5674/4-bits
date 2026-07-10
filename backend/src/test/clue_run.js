import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import OllamaService from '../ai/ollama.service.js';
import ClueEngine from '../engine/clue/index.js';
import ClueEngineService from '../engine/clue/service.js';
import ClueService from '../services/clue.service.js';

dotenv.config();

async function run() {
  await connectDB();

  const aiClient = new OllamaService();
  const engine = new ClueEngine({ aiClient });
  const engineService = new ClueEngineService({ clueEngine: engine });
  const service = new ClueService({ clueEngine: engineService });

  const roomCode = process.env.TEST_ROOM_CODE || '';
  if (!roomCode) {
    console.error('Set TEST_ROOM_CODE in .env to an existing roomCode to append clues');
    process.exit(1);
  }

  const result = await service.generateClues({ roomCode, storySeed: null });
  console.log('Clues generated and saved:', result.clues.length);
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
