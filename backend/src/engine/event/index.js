import EventValidator from './validator.js';
import { buildEventPrompt } from '../../prompts/event.prompt.js';
import { safeParseAIResponse } from '../../ai/parseHelper.js';

class EventEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = EventValidator;
  }

  async generateEvents({ storySeed, world, crime, playersSummary } = {}) {
    this.validator.validateInput({ storySeed, world, crime, playersSummary });

    const prompt = buildEventPrompt({ storySeed, world, crime, playersSummary });
    const response = await this.aiClient.generateCompletion(prompt, { temperature: 0.7, stream: false });
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

export default EventEngine;
