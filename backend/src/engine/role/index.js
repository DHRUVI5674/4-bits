/*
  role/index.js
  Role Engine: generates a single player character using the AI client.
*/

import RoleValidator from './validator.js';
import { buildRolePrompt } from '../../prompts/role.prompt.js';

class RoleEngine {
  constructor({ aiClient }) {
    this.aiClient = aiClient;
    this.validator = RoleValidator;
  }

  async generateRole({ playerName, seed, context } = {}) {
    this.validator.validateInput({ playerName, seed, context });

    const prompt = buildRolePrompt({ playerName, seed, context });
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

export default RoleEngine;
