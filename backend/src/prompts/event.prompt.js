/*
  event.prompt.js
  Builds the prompt used by the Event Engine.
  AI must return a JSON array of event objects only.
*/

export function buildEventPrompt({ storySeed, world, crime, playersSummary = [] } = {}) {
  return `You are an AI event generator for a multiplayer murder mystery game.

Produce a JSON array of chronological events (investigation, interactions, revelations) relevant to the crime.
Each event must be an object of the shape:
{
  "time": "string",
  "description": "string",
  "participants": ["string"] // optional player ids or names
}

Return only the JSON array. Do not include extra fields or explanation.

Context:
- storySeed: ${storySeed || 'none'}
- world: ${world || 'unknown'}
- crime: ${crime || 'unknown'}
- playersSummary: ${JSON.stringify(playersSummary)}
`;
}
