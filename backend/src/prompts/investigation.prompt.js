/*
  investigation.prompt.js
  Prompts used by the AI Game Master for dynamic investigation responses.
*/

export function buildNpcQuestionPrompt({ npc, question, gameContext }) {
  return `You are the Game Master and an NPC named "${npc.name}" (${npc.occupation}) in a murder mystery game.
Context of the crime:
- Theme: ${gameContext.theme}
- Victim: ${gameContext.victim}
- Location: ${gameContext.location}
- Time of death: ${gameContext.timeOfDeath}
- Cause of death: ${gameContext.causeOfDeath}

NPC Profile:
- Name: ${npc.name}
- Age: ${npc.age}
- Occupation: ${npc.occupation}
- Personality: ${npc.personality}
- Public Background: ${npc.publicBackground}
- Alibi: ${npc.alibi}
- Motive: ${npc.motive}
- Secret: ${npc.privateSecret} (Note: do not reveal this secret directly unless the player has confronted you with definitive proof or is highly suspicious)

Question asked by the player:
"${question}"

Respond as the NPC in the first person. Be concise, realistic, and do not invent any clues or facts outside this profile. Do not include markdown code blocks. Keep the response under 3 sentences.
`;
}

export function buildAccuseNpcPrompt({ npc, accusation, gameContext }) {
  return `You are "${npc.name}" (${npc.occupation}), who has just been accused of murdering ${gameContext.victim} by an investigator.
The accusation statement is: "${accusation}"

Your Profile:
- Alibi: ${npc.alibi}
- Motive: ${npc.motive}
- Secret: ${npc.privateSecret}
- isMurderer: ${npc.isMurderer}

Respond in the first person, defending yourself. If you are the murderer, act defensive, nervous, or deflect suspicion. If you are innocent, express outrage, offense, and rely on your alibi. Keep it under 3 sentences. Do not include markdown code blocks.
`;
}

export function buildFinalRevealPrompt({ gameContext, votes }) {
  const voteSummary = votes.map(v => `${v.playerName} voted for ${v.suspectName}`).join('\n');
  return `You are the Game Master of a murder mystery game. The investigation is complete and voting has finished.
Votes cast by players:
${voteSummary}

Full details of the crime:
- Theme: ${gameContext.theme}
- Victim: ${gameContext.victim}
- Murderer: ${gameContext.murderer}
- Weapon: ${gameContext.murderWeapon}
- Location: ${gameContext.location}
- Time: ${gameContext.timeOfDeath}
- Motive Summary: ${gameContext.motiveSummary}
- Solution explanation: ${gameContext.solution.fullExplanation}

Timeline of events:
${JSON.stringify(gameContext.timeline)}

Evidence items:
${JSON.stringify(gameContext.evidence)}

Logs of the entire conversation/actions:
${JSON.stringify(gameContext.logs.map(l => `[${l.author}]: ${l.text}`).slice(-50))}

Generate a compelling, atmospheric final reveal summarizing:
1. Who the murderer is and the motive.
2. Complete timeline of how it happened.
3. Which clues mattered and which were ignored.
4. Summary of who lied, who told the truth, and any interesting moments from the logs.
5. Explain who the players voted for and whether they were correct.

Write in a dramatic, mystery-style tone. Do not include markdown code blocks.
`;
}
