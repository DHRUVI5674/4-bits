import ClueValidator from './validator.js';
import { buildCluePrompt } from '../../prompts/clue.prompt.js';

class ClueEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = ClueValidator;
  }

  async generateClues({ storySeed, world, crime, playersSummary } = {}) {
    this.validator.validateInput({ storySeed, world, crime, playersSummary });

    const prompt = buildCluePrompt({ storySeed, world, crime, playersSummary });
    const response = await this.aiClient.generateCompletion(prompt, {
      temperature: 0.7,
      stream: false,
    });

    const payload = this.parseResponse(response);
    this.validator.validateOutput(payload);

    return payload;
  }

  parseResponse(response) {
    if (!response) throw new Error('Empty response from AI client');

    if (typeof response === 'string') return JSON.parse(response);

    if (typeof response === 'object') {
      if (typeof response.response === 'string') {
        return JSON.parse(response.response);
      }
      if (response.result != null) return response.result;
      if (response.output != null) return response.output;
    }

    return response;
  }
}

export default ClueEngine;
