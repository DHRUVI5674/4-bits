import Game from '../models/game.model.js';
import GameSession from '../models/gameSession.model.js';
import gameRepository from '../repositories/game.repository.js';
import AppError from '../utils/appError.js';
import { getIO } from '../sockets/socket.js';
import { GAME_PHASE, GAME_STATUS } from '../constants/game.constants.js';
import { endRound } from './roundTimer.service.js';
import { buildNpcQuestionPrompt, buildAccuseNpcPrompt, buildFinalRevealPrompt } from '../prompts/investigation.prompt.js';
import OllamaService from '../ai/ollama.service.js';
import GeminiService from '../ai/gemini.service.js';
import { nanoid } from 'nanoid';

let aiClient;
try {
  if (process.env.GEMINI_API_KEY) {
    aiClient = new GeminiService();
    console.log('[AI GM] Initialized Gemini client');
  } else {
    aiClient = new OllamaService();
    console.log('[AI GM] Initialized Ollama client');
  }
} catch (err) {
  console.warn('[AI GM] Failed to initialize AI client. Using mock mode.', err.message);
}

const GENERIC_NPCS = {
  'receptionist': {
    name: 'Mrs. Gable',
    occupation: 'Receptionist',
    personality: 'Observant, gossip-prone, slightly anxious.',
    publicBackground: 'Managed the front desk for ten years. Knows who checked in and when.',
    alibi: 'Was at the desk until 11:30 PM, then went to the staff lounge.',
    motive: 'None. Just doing her job.',
    privateSecret: 'Saw a mysterious figure leaving the east corridor at 11 PM.'
  },
  'security guard': {
    name: 'Officer Vance',
    occupation: 'Security Guard',
    personality: 'Gruff, disciplined, reluctant to speak.',
    publicBackground: 'Ex-military, patrols the building grounds.',
    alibi: 'Was patrolling the outer perimeter during the time of the incident.',
    motive: 'None.',
    privateSecret: 'Forgot to lock the side gate on the night of the murder.'
  },
  'police officer': {
    name: 'Deputy Sterling',
    occupation: 'First Responding Officer',
    personality: 'Professional, busy, relies strictly on evidence.',
    publicBackground: 'Dispatched to secure the scene after the body was reported.',
    alibi: 'Guarding the main entrance.',
    motive: 'None.',
    privateSecret: 'Found a discarded keychain near the body but hasn\'t reported it yet.'
  },
  'doctor': {
    name: 'Dr. Evelyn',
    occupation: 'Medical Examiner',
    personality: 'Clinical, objective, precise.',
    publicBackground: 'Called in to perform the preliminary examination on the body.',
    alibi: 'Performing the examination in the makeshift morgue.',
    motive: 'None.',
    privateSecret: 'Determined that the victim had minor bruises on their wrists, suggesting a brief struggle.'
  },
  'neighbor': {
    name: 'Mr. Abernathy',
    occupation: 'Adjacent Tenant',
    personality: 'Grumpy, light sleeper, easily annoyed.',
    publicBackground: 'Lives next door to the venue.',
    alibi: 'Was in bed reading a book.',
    motive: 'None.',
    privateSecret: 'Heard a loud crash and arguing voices around 11:15 PM.'
  },
  'technician': {
    name: 'Dexter',
    occupation: 'IT and Facilities Manager',
    personality: 'Nerdy, distracted, talks fast.',
    publicBackground: 'Maintains the server racks and building utility systems.',
    alibi: 'Was fixing a circuit breaker in the basement.',
    motive: 'None.',
    privateSecret: 'Noticed a power spike and backup server shutdown at 11:10 PM.'
  },
  'journalist': {
    name: 'Sally Reed',
    occupation: 'Investigative Reporter',
    personality: 'Inquisitive, charming, opportunistic.',
    publicBackground: 'Crashed the event searching for a corporate scandal story.',
    alibi: 'Was mingling in the ballroom taking photos.',
    motive: 'None.',
    privateSecret: 'Saw the victim talking hushedly with their heir in the lounge around 10:30 PM.'
  }
};

const DYNAMIC_EVENTS = [
  'New witness statement arrives',
  'Police report update received',
  'Forensics fingerprint report completed',
  'Phone records recovered',
  'Victim\'s personal diary found',
  'Hidden compartment discovered',
  'CCTV backup restored',
  'Anonymous email tip received',
  'Security camera footage repaired'
];

class InvestigationService {
  async getSession(roomCode) {
    const session = await GameSession.findOne({ roomCode: roomCode.toUpperCase() });
    if (!session) throw new AppError('Game session not found', 404);
    return session;
  }

  async getLogs(roomCode) {
    const session = await this.getSession(roomCode);
    return session.logs || [];
  }

  async submitAction(roomCode, playerId, { type, target, content }) {
    const code = roomCode.toUpperCase();
    const game = await Game.findOne({ roomCode: code });
    if (!game) throw new AppError('Game not found', 404);

    const session = await GameSession.findOne({ roomCode: code });
    if (!session) throw new AppError('Game session not found', 404);

    const player = game.players.find(p => p.playerId === playerId);
    if (!player) throw new AppError('Player not found in room', 404);

    const myChar = session.characters.find(c => c.playerId === playerId);
    if (!myChar) throw new AppError('Player character not found', 404);

    if (session.phase !== GAME_PHASE.INVESTIGATION) {
      throw new AppError('Actions can only be performed during the Investigation Phase', 400);
    }

    if (myChar.actionsRemaining <= 0) {
      throw new AppError('You have no actions remaining in this round', 400);
    }

    myChar.actionsRemaining -= 1;
    const authorName = myChar.name;

    // 1. Build and save the Player Action Message
    const playerMsgText = `[${type.toUpperCase()}] ${target ? '-> ' + target + ' :' : ''} ${content || ''}`;
    const playerMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'player',
      author: authorName,
      text: playerMsgText,
      createdAt: new Date()
    };
    session.logs.push(playerMsg);

    let responseText = '';
    let clueDiscovered = false;

    // 2. Process Action Type
    if (type === 'inspect') {
      const targetLower = (target || '').toLowerCase().trim();
      const foundClue = session.evidence.find(e => 
        !e.discovered && (
          e.name.toLowerCase().includes(targetLower) ||
          e.description.toLowerCase().includes(targetLower) ||
          e.location.toLowerCase().includes(targetLower)
        )
      );

      if (foundClue) {
        foundClue.discovered = true;
        foundClue.discoveredBy = authorName;
        clueDiscovered = true;
        responseText = `[CLUE DISCOVERED] You inspect the "${target}" and find: **${foundClue.name}** - ${foundClue.description} (Location: ${foundClue.location})`;
      } else {
        responseText = `You inspect the "${target}" carefully. While it yields no immediate evidence, you note its placement in the venue.`;
      }
    } 
    else if (type === 'ask') {
      const targetClean = (target || '').trim();
      const targetLower = targetClean.toLowerCase();

      // Check if target is a suspect character
      const suspectChar = session.characters.find(c => c.name.toLowerCase() === targetLower);
      
      if (suspectChar) {
        if (suspectChar.playerId) {
          // Player suspect
          responseText = `[QUESTION TO PLAYER] ${authorName} asks ${suspectChar.name}: "${content}". ${suspectChar.name}, how do you answer?`;
        } else {
          // NPC suspect
          responseText = await this.queryAI(buildNpcQuestionPrompt({
            npc: suspectChar,
            question: content,
            gameContext: session
          }), `[NPC] ${suspectChar.name} declines to answer.`);
        }
      } 
      // Check if target is a generic NPC
      else {
        const genericNpcKey = Object.keys(GENERIC_NPCS).find(k => k === targetLower || GENERIC_NPCS[k].name.toLowerCase() === targetLower);
        if (genericNpcKey) {
          const npc = GENERIC_NPCS[genericNpcKey];
          responseText = await this.queryAI(buildNpcQuestionPrompt({
            npc,
            question: content,
            gameContext: session
          }), `[NPC] ${npc.name} appears busy.`);
        } else {
          responseText = `There is no suspect or staff member named "${targetClean}" currently present at the scene.`;
        }
      }
    } 
    else if (type === 'accuse') {
      const targetClean = (target || '').trim();
      const targetLower = targetClean.toLowerCase();
      const suspectChar = session.characters.find(c => c.name.toLowerCase() === targetLower);

      if (suspectChar) {
        if (suspectChar.playerId) {
          responseText = `[ACCUSATION] ${authorName} points an accusing finger at ${suspectChar.name}! "${content}". ${suspectChar.name}, how do you defend yourself?`;
        } else {
          responseText = await this.queryAI(buildAccuseNpcPrompt({
            npc: suspectChar,
            accusation: content,
            gameContext: session
          }), `[NPC] ${suspectChar.name} exclaims, "This is preposterous!"`);
        }
      } else {
        responseText = `You declare an accusation against "${targetClean}", but they are not among the suspects.`;
      }
    } 
    else if (type === 'request') {
      // E.g. request details/autopsy
      const requestLower = (content || '').toLowerCase();
      const foundClue = session.evidence.find(e => 
        !e.discovered && (
          e.name.toLowerCase().includes(requestLower) ||
          e.description.toLowerCase().includes(requestLower)
        )
      );

      if (foundClue) {
        foundClue.discovered = true;
        foundClue.discoveredBy = authorName;
        clueDiscovered = true;
        responseText = `[REPORT RECIEVED] Forensic request results: **${foundClue.name}** - ${foundClue.description}`;
      } else {
        responseText = `You requested report details for "${content}" from ${target || 'the examiner'}, but the records are still pending.`;
      }
    } 
    else {
      responseText = `Action of type "${type}" logged by the Game Master.`;
    }

    // 3. Build and save the AI Response Message
    const aiMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: responseText,
      createdAt: new Date()
    };
    session.logs.push(aiMsg);

    // 4. Recalculate suspicion scores based on discovered evidence and accusations
    this.recalculateSuspicionScores(session);

    // 5. Dynamic Event Engine
    let eventTriggered = null;
    const progressEvent = await this.checkDynamicEventTrigger(session);
    if (progressEvent) {
      eventTriggered = progressEvent;
    }

    // 6. Save State
    await session.save();

    // Trigger round end early if actions hit 0
    if (myChar.actionsRemaining === 0) {
      setTimeout(() => {
        endRound(code, 'actions');
      }, 1000);
    }

    // 7. Emit update notifications to the Socket room
    const io = getIO();
    io.to(code).emit('log-updated', session.logs);
    if (clueDiscovered || eventTriggered) {
      io.to(code).emit('clues-updated', this.formatClues(session));
    }

    const newEntries = [playerMsg, aiMsg];
    if (eventTriggered) {
      newEntries.push(eventTriggered);
    }

    return {
      success: true,
      newEntries
    };
  }

  async startVoting(roomCode, playerId) {
    const code = roomCode.toUpperCase();
    const game = await Game.findOne({ roomCode: code });
    if (!game) throw new AppError('Game not found', 404);
    if (game.hostId !== playerId) throw new AppError('Only the host can start the voting phase', 403);

    const session = await GameSession.findOne({ roomCode: code });
    if (!session) throw new AppError('Session not found', 404);

    session.phase = GAME_PHASE.VOTING;
    await session.save();

    game.gameState.phase = GAME_PHASE.VOTING;
    await game.save();

    const io = getIO();
    io.to(code).emit('phase-updated', GAME_PHASE.VOTING);
    
    // Log GM message
    const gmMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: `[PHASE CHANGE] The investigation has ended. Voting is now open! All investigators must select the prime suspect from the dossier panel to submit their final vote.`,
      createdAt: new Date()
    };
    session.logs.push(gmMsg);
    await session.save();
    io.to(code).emit('log-updated', session.logs);

    return { success: true };
  }

  async castVote(roomCode, playerId, suspectName) {
    const code = roomCode.toUpperCase();
    const game = await Game.findOne({ roomCode: code });
    if (!game) throw new AppError('Game not found', 404);

    const session = await GameSession.findOne({ roomCode: code });
    if (!session) throw new AppError('Session not found', 404);


    if (session.phase !== GAME_PHASE.VOTING) {
      throw new AppError('Voting has not started yet', 400);
    }

    const player = game.players.find(p => p.playerId === playerId);
    if (!player) throw new AppError('Player not in room', 404);

    // Remove existing vote by this player if any, and record new one
    session.votes = session.votes.filter(v => v.playerId !== playerId);
    session.votes.push({
      playerId,
      playerName: player.name,
      suspectName,
      votedAt: new Date()
    });

    const activePlayers = game.players;
    const votesCount = session.votes.length;


    // Log the vote silently in logs
    const voteMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: `[VOTE CAST] Investigator ${player.name} has submitted their final accusation. (${votesCount} / ${activePlayers.length} votes received)`,
      createdAt: new Date()
    };
    session.logs.push(voteMsg);
    await session.save();

    const io = getIO();
    io.to(code).emit('log-updated', session.logs);

    // If everyone has voted, reveal final result
    if (votesCount >= activePlayers.length) {
      session.phase = GAME_PHASE.RESULT;
      await session.save();

      game.gameState.phase = GAME_PHASE.RESULT;
      game.status = GAME_STATUS.ENDED;
      await game.save();

      // Trigger AI final reveal
      console.log('[AI GM] All votes submitted. Generating final reveal...');
      
      const revealPrompt = buildFinalRevealPrompt({
        gameContext: session,
        votes: session.votes
      });

      const revealText = await this.queryAI(revealPrompt, 'The final reveal was unable to generate.');
      session.finalReveal = revealText;

      const finishMsg = {
        messageId: 'msg_' + nanoid(8),
        type: 'ai',
        author: 'Game Master',
        text: `[REVEAL] The investigation case files are closed. The final reveal has been posted!`,
        createdAt: new Date()
      };
      session.logs.push(finishMsg);
      await session.save();

      io.to(code).emit('phase-updated', GAME_PHASE.RESULT);
      io.to(code).emit('log-updated', session.logs);
    }

    return { success: true };
  }

  // --- Helper Methods ---

  async queryAI(prompt, fallback) {
    if (!aiClient) return fallback;
    try {
      const response = await aiClient.generateCompletion(prompt);
      return response.response || response.result || response;
    } catch (err) {
      console.error('[AI GM Error] Query failed:', err.message);
      return fallback;
    }
  }

  formatClues(session) {
    return (session.evidence || [])
      .filter(e => e.discovered)
      .map(e => ({
        id: e.evidenceId,
        title: e.name,
        description: `${e.type || 'Evidence'} · ${e.description} (Location: ${e.location})`
      }));
  }

  recalculateSuspicionScores(session) {
    const accusationCounts = {};
    
    // Count accusations from player logs
    session.logs.forEach(l => {
      if (l.type === 'player' && l.text.startsWith('[ACCUSE]')) {
        const matches = l.text.match(/->\s*([^:]+)/);
        if (matches && matches[1]) {
          const accName = matches[1].trim().toLowerCase();
          accusationCounts[accName] = (accusationCounts[accName] || 0) + 1;
        }
      }
    });

    session.characters.forEach(char => {
      if (char.isVictim) return;
      const lowerName = char.name.toLowerCase();

      // Base score: 1. Add score for discovered clues linked to them
      const linkedClues = session.evidence.filter(e => e.discovered && e.linkedCharacters.some(c => c.toLowerCase() === lowerName));
      let score = 1 + (linkedClues.length * 2);

      // Add score for accusations
      const accusations = accusationCounts[lowerName] || 0;
      score += (accusations * 2);

      char.suspicionScore = Math.min(Math.max(score, 1), 10);
    });
  }

  async checkDynamicEventTrigger(session) {
    // If no undiscovered clues remain, do nothing
    const undiscoveredClues = session.evidence.filter(e => !e.discovered);
    if (undiscoveredClues.length === 0) return null;

    // Check count of messages since last CLUE DISCOVERED or EVENT
    let messagesSinceProgress = 0;
    for (let i = session.logs.length - 1; i >= 0; i--) {
      const text = session.logs[i].text;
      if (text.includes('[CLUE DISCOVERED]') || text.includes('[EVENT]') || text.includes('[REPORT RECIEVED]')) {
        break;
      }
      if (session.logs[i].type === 'player') {
        messagesSinceProgress++;
      }
    }

    // Trigger event if 6 or more player messages have passed without discovering clues
    if (messagesSinceProgress >= 6) {
      const clue = undiscoveredClues[Math.floor(Math.random() * undiscoveredClues.length)];
      clue.discovered = true;
      clue.discoveredBy = 'Dynamic Event';

      const eventType = DYNAMIC_EVENTS[Math.floor(Math.random() * DYNAMIC_EVENTS.length)];
      const eventText = `[EVENT] **${eventType}**! A critical piece of evidence has surfaced: **${clue.name}** - ${clue.description}`;
      
      const eventMsg = {
        messageId: 'msg_' + nanoid(8),
        type: 'ai',
        author: 'Game Master',
        text: eventText,
        createdAt: new Date()
      };
      
      session.logs.push(eventMsg);
      return eventMsg;
    }

    return null;
  }
}

export default new InvestigationService();
