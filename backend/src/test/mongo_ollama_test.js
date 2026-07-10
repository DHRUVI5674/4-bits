import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import { buildStoryPrompt } from '../prompts/story.prompt.js';
import mongoose from 'mongoose';

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Creating Ollama client...');
    console.log('Environment OLLAMA_MODEL=', process.env.OLLAMA_MODEL);
    const { default: OllamaService } = await import('../ai/ollama.service.js');
    const aiClient = new OllamaService();

    const prompt = buildStoryPrompt({ theme: 'Test Ping', seed: 'mongo-ollama-test' });
    console.log('Sending prompt to Ollama...');

    let response;
    try {
      response = await aiClient.generateCompletion(prompt);
    } catch (err) {
      console.warn('generateCompletion failed, retrying without model field:', err.message);
      // Fallback: some Ollama endpoints accept payloads without explicit `model` key
      response = await aiClient.request({ prompt, temperature: 0.7 });
    }

    console.log('Received response from Ollama. Saving to DB...');

    const db = mongoose.connection.db;
    const result = await db.collection('ai_test_runs').insertOne({ prompt, response, createdAt: new Date() });

    console.log('Saved AI response to ai_test_runs with _id:', result.insertedId);
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

run();
