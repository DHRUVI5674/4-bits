/*
  story/index.js
  Story Engine entry point.
  It delegates story generation and validation.
*/

import StoryValidator from './validator.js';
import { buildStoryPrompt } from '../../prompts/story.prompt.js';

class StoryEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = StoryValidator;
  }

  async generateStory({ theme, seed }) {
    this.validator.validateInput({ theme, seed });

    const prompt = buildStoryPrompt({ theme, seed });
    const response = await this.aiClient.generateCompletion(prompt, {
      model: 'qwen3:8b',
      temperature: 0.7,
      stream: false,
    });

    const storyPayload = this.parseResponse(response);
    this.validator.validateOutput(storyPayload);

    return storyPayload;
  }

  parseResponse(response) {
    if (!response) {
      throw new Error('Empty response from AI client.');
    }

    return response.result ?? response;
  }
}

export default StoryEngine;
