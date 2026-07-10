/*
  solution.prompt.js
  Builds the prompt used by the Solution Engine.
  AI must return a JSON object detailing the solution.
*/

export function buildSolutionPrompt({ storySeed, world, crime, playersSummary = [] } = {}) {
  return `You are an AI solution generator for a multiplayer murder mystery game.

Return a single JSON object with the exact shape:
{
  "culprit": "string",        // name or id of the murderer
  "method": "string",         // how the murder was committed
  "motive": "string",
  "explanation": "string"     // short explanation tying clues to culprit
}

Return only the JSON object.

Context:
- storySeed: ${storySeed || 'none'}
- world: ${world || 'unknown'}
- crime: ${crime || 'unknown'}
- playersSummary: ${JSON.stringify(playersSummary)}
`;
}
