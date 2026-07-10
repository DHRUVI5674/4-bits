import NpcValidator from './validator.js';
import { buildNpcPrompt } from '../../prompts/npc.prompt.js';
import { safeParseAIResponse } from '../../ai/parseHelper.js';

class NpcEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = NpcValidator;
  }

  async generateNpcs({ storySeed, world, crime } = {}) {
    this.validator.validateInput({ storySeed, world, crime });
    const prompt = buildNpcPrompt({ storySeed, world, crime });
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

export default NpcEngine;
