/*
  story.prompt.js
  Builds the prompt used by the Story Engine.
  No execution logic is included here.
*/

export function buildStoryPrompt({ theme, seed }) {
  return `You are an AI story engine for a multiplayer murder mystery game.

Generate story content using the following structure only:
- world: A short description of the setting and atmosphere.
- crime: A concise description of the crime.
- victim: The name of the victim.
- murderer: The name of the murderer.
- storySeed: A unique seed for the game session.

Respond with valid JSON only using the following schema:
{
  "world": "string",
  "crime": "string",
  "victim": "string",
  "murderer": "string",
  "storySeed": "string"
}

Do not include any markdown, explanation, or extra fields.

Context:
- theme: ${theme || 'murder mystery'}
- seed: ${seed || 'none'}
`;
}
