/*
  clue.prompt.js
  Builds the prompt used by the Clue Engine.
  AI must return a JSON array of clue objects only.
*/

export function buildCluePrompt({ storySeed, world, crime, playersSummary = [] } = {}) {
  return `You are an AI clue generator for a multiplayer murder mystery game.

Generate an array of clues that are relevant to the crime. Respond with valid JSON only: an array of objects with this exact shape:
[
  {
    "id": "string",          // short unique id for the clue
    "text": "string",        // concise clue description
    "location": "string",    // where the clue is found
    "evidenceRefs": ["string"] // optional references to evidence ids
  }
]

Rules:
- Return only the JSON array, no markdown, explanation, or extra fields.
- Generate 3-6 concise clues.
- Do not invent player internal narration or temporary notes — clues only.

Context:
- storySeed: ${storySeed || 'none'}
- world: ${world || 'unknown'}
- crime: ${crime || 'unknown'}
- playersSummary: ${JSON.stringify(playersSummary)}
`;
}
