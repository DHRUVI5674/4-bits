import SolutionValidator from './validator.js';
import { buildSolutionPrompt } from '../../prompts/solution.prompt.js';
import { safeParseAIResponse } from '../../ai/parseHelper.js';

class SolutionEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = SolutionValidator;
  }

  async generateSolution({ storySeed, world, crime, playersSummary } = {}) {
    this.validator.validateInput({ storySeed, world, crime, playersSummary });
    const prompt = buildSolutionPrompt({ storySeed, world, crime, playersSummary });
    const response = await this.aiClient.generateCompletion(prompt, { temperature: 0.7 });
    const payload = this.parseResponse(response);
    this.validator.validateOutput(payload);
    return payload;
  }

  parseResponse(response) {
    if (!response) throw new Error('Empty response from AI client');
    try {
      if (typeof response === 'string') return safeParseAIResponse(response);
      if (typeof response === 'object') {
        if (typeof response.response === 'string') return safeParseAIResponse(response.response);
        if (response.result != null) return response.result;
        if (response.output != null) return response.output;
      }
      return response;
    } catch (err) {
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  }
}

export default SolutionEngine;
