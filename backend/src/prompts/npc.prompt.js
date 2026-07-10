/*
  npc.prompt.js
  Builds the prompt used by the NPC Engine.
  AI must return a JSON array of NPC objects only.
*/

export function buildNpcPrompt({ storySeed, world, crime } = {}) {
  return `You are an AI NPC generator for a multiplayer murder mystery game.

Generate an array of NPCs (non-player characters) relevant to the story. Return valid JSON only: an array of objects with this shape:
{
  "id": "string",
  "name": "string",
  "role": "string", // short role description e.g., 'gardener', 'butler'
  "relationship": "string",
  "knowledge": ["string"] // clues or info NPC can provide
}

Return only the JSON array.

Context:
- storySeed: ${storySeed || 'none'}
- world: ${world || 'unknown'}
- crime: ${crime || 'unknown'}
`;
}
