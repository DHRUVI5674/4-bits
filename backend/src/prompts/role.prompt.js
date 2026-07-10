/*
  role.prompt.js
  Builds the prompt for generating a single player character/role.
  The AI must return strict JSON with the character object only.
*/

export function buildRolePrompt({ playerName, seed, context = {} } = {}) {
  return `You are an AI role generator for a multiplayer murder mystery game.

Generate exactly one character object for a player. Respond with valid JSON only using this exact shape:
{
  "id": "string",
  "name": "string",
  "occupation": "string",
  "background": "string",
  "objective": "string",
  "secret": "string",
  "inventory": ["string"],
  "knownClues": ["string"],
  "motive": "string",
  "alibi": "string",
  "isMurderer": false
}

Rules:
- Use the provided playerName when appropriate.
- Keep fields concise but descriptive.
- Do NOT include any extra fields or explanation.

Context:
- playerName: ${playerName || 'unknown'}
- seed: ${seed || 'none'}
- context: ${JSON.stringify(context)}
`;
}
