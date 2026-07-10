/*
  timeline.prompt.js
  Builds the prompt used by the Timeline Engine.
  The AI must return strict JSON: an array of timeline events.
*/

export function buildTimelinePrompt({ storySeed, world, crime, playersSummary = [] } = {}) {
  return `You are an AI timeline generator for a murder mystery game.

Produce an array of investigation timeline events that are directly relevant to the crime.
Each event must be an object with the shape:
{
  "time": "string",        // concise time label or sequence like 'T-2 hours'
  "description": "string",
  "evidenceRefs": ["string"] // ids or short refs to clues/evidence
}

Return a JSON array only.

Context (use but do not invent player roles):
- storySeed: ${storySeed || 'none'}
- world: ${world || 'unknown'}
- crime: ${crime || 'unknown'}
- playersSummary: ${JSON.stringify(playersSummary)}

Do not include any extra explanation or fields.`;
}
