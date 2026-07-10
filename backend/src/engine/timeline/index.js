/*
  timeline/index.js
  Timeline Engine: generates an array of timeline events using the AI client.
*/

import TimelineValidator from './validator.js';
import { buildTimelinePrompt } from '../../prompts/timeline.prompt.js';

class TimelineEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = TimelineValidator;
  }

  async generateTimeline({ storySeed, world, crime, playersSummary } = {}) {
    this.validator.validateInput({ storySeed, world, crime, playersSummary });

    const prompt = buildTimelinePrompt({ storySeed, world, crime, playersSummary });
    const response = await this.aiClient.generateCompletion(prompt, {
      model: 'qwen3:8b',
      temperature: 0.7,
      stream: false,
    });

    const payload = this.parseResponse(response);
    this.validator.validateOutput(payload);

    return payload;
  }

  parseResponse(response) {
    if (!response) throw new Error('Empty response from AI client');
    return response.result ?? response;
  }
}

export default TimelineEngine;
