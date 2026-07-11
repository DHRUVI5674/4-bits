import GameSession from '../models/gameSession.model.js';
import Game from '../models/game.model.js';
import { getIO } from '../sockets/socket.js';
import { GAME_PHASE } from '../constants/game.constants.js';
import { nanoid } from 'nanoid';

const activeTimers = {}; // roomCode -> { roundTimeout, discussionTimeout }

async function endGameWithKillerWin(code, session, game, message) {
  session.phase = GAME_PHASE.RESULT;
  
  const msgObj = {
    messageId: 'msg_' + nanoid(8),
    type: 'ai',
    author: 'Game Master',
    text: message,
    createdAt: new Date()
  };
  session.logs.push(msgObj);
  await session.save();

  game.gameState.phase = GAME_PHASE.RESULT;
  game.phase = GAME_PHASE.RESULT;
  game.status = 'ended';
  await game.save();

  const murdererChar = session.characters.find(c => c.isMurderer);
  const murdererPlayerId = murdererChar?.playerId;
  const allPlayers = game.players.map(player => {
    const char = session.characters.find(c => c.playerId === player.playerId);
    return {
      playerId: player.playerId,
      name: player.name,
      characterName: char?.name || player.name,
      occupation: char?.occupation || '',
      isMurderer: char?.isMurderer || false,
      isEliminated: char ? (char.emergencyMeetingsRemaining === 0) : false,
    };
  });

  const basePayload = {
    accusedId: null,
    actualKillerId: murdererPlayerId,
    killerName: murdererChar?.name || 'Unknown',
    killerOccupation: murdererChar?.occupation || 'Unknown',
    killerMotive: session.motiveSummary || session.solution?.motive || '',
    murderWeapon: session.murderWeapon || '',
    victim: session.victim || '',
    location: session.location || '',
    causeOfDeath: session.causeOfDeath || '',
    timeOfDeath: session.timeOfDeath || '',
    roundNumber: session.roundNumber,
    allPlayers,
    outcome: 'killer_wins'
  };

  const io = getIO();
  io.to(code).emit('phase-updated', GAME_PHASE.RESULT);
  io.to(code).emit('log-updated', session.logs);
  io.to(code).emit('session-updated', session);
  
  // Generate AI story in background with 5s timeout
  setTimeout(async () => {
      try {
        const { buildFinalRevealPrompt } = await import('../prompts/investigation.prompt.js');
        const aiService = await import('./ai.service.js');
        const revealPrompt = buildFinalRevealPrompt({
          gameContext: session,
          votes: [] 
        });
        
        let finalText = "The investigators failed to reach a conclusion in time. The killer slipped away into the night, leaving the case unresolved forever.";
        
        if (aiService.aiClient) {
          const aiPromise = aiService.aiClient.generateCompletion(revealPrompt);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000));
          const res = await Promise.race([aiPromise, timeoutPromise]);
          finalText = res.response || res.result || res;
        }
        
        session.finalReveal = finalText;
        await session.save();
      } catch(e) {
        console.error("[AI Final Reveal Error/Timeout]", e.message);
        session.finalReveal = "The investigators failed to reach a conclusion in time. The killer slipped away into the night, leaving the case unresolved forever.";
        await session.save();
      }
      io.to(code).emit('game:ended', basePayload);
  }, 100);
}

export const startRound = async (roomCode) => {
  const code = roomCode.toUpperCase();
  clearTimers(code);

  try {
    const session = await GameSession.findOne({ roomCode: code });
    const game = await Game.findOne({ roomCode: code });
    if (!session || !game) return;

    // Reset player actions to 3 and increment round number
    session.phase = GAME_PHASE.INVESTIGATION;
    if (session.status === 'setup') {
      session.status = 'active';
    }
    
    // Only increment round number if this is not the very first round initialization
    if (session.roundTimerEnd !== null) {
      if (session.roundNumber >= (session.maxRounds || 3)) {
        await endGameWithKillerWin(code, session, game, `[INVESTIGATION FAILED] Time has run out. The killer has escaped!`);
        return;
      }
      session.roundNumber += 1;
    }
    
    const durationMs = (session.roundDurationMinutes || 3) * 60 * 1000;
    session.roundTimerEnd = new Date(Date.now() + durationMs);
    session.discussionTimerEnd = null;

    session.characters.forEach(c => {
      if (c.playerId) {
        c.actionsRemaining = 3;
      }
    });

    const roundMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: `[ROUND START] Round ${session.roundNumber} of ${session.maxRounds || 3} has begun. Actions replenished. You have ${session.roundDurationMinutes || 3} minutes to investigate.`,
      createdAt: new Date()
    };
    session.logs.push(roundMsg);
    await session.save();

    game.gameState.phase = GAME_PHASE.INVESTIGATION;
    game.phase = GAME_PHASE.INVESTIGATION;
    await game.save();

    // Broadcast to sockets
    const io = getIO();
    io.to(code).emit('phase-updated', GAME_PHASE.INVESTIGATION);
    io.to(code).emit('timer-updated', {
      phase: GAME_PHASE.INVESTIGATION,
      endTime: session.roundTimerEnd,
      roundNumber: session.roundNumber
    });
    io.to(code).emit('log-updated', session.logs);
    io.to(code).emit('session-updated', session);

    // Set round timeout based on config
    activeTimers[code] = {
      roundTimeout: setTimeout(() => {
        endRound(code, 'timer');
      }, durationMs)
    };
    console.log(`[RoundTimer] Started round ${session.roundNumber} for room ${code} with duration ${durationMs}ms`);
  } catch (err) {
    console.error(`[RoundTimer] Error starting round:`, err.message);
  }
};

export const endRound = async (roomCode, reason = 'timer') => {
  const code = roomCode.toUpperCase();
  clearTimers(code);

  try {
    const session = await GameSession.findOne({ roomCode: code });
    const game = await Game.findOne({ roomCode: code });
    if (!session || !game) return;

    // Do not trigger discussion if we are already in discussion/voting/result phases
    if (session.phase === GAME_PHASE.DISCUSSION || session.phase === GAME_PHASE.VOTING || session.phase === GAME_PHASE.RESULT) {
      return;
    }

    session.phase = GAME_PHASE.DISCUSSION;
    session.discussionTimerEnd = new Date(Date.now() + 60000); // 60 seconds discussion
    
    let reasonText = `[ROUND END] Time has expired! All movements are frozen.`;
    if (reason === 'actions') {
      reasonText = `[ROUND END] An investigator has exhausted all actions! All movements are frozen.`;
    }

    const endMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: `${reasonText} Transitioning to Discussion Phase. Use chat to coordinate clues and suspicions.`,
      createdAt: new Date()
    };
    session.logs.push(endMsg);
    await session.save();

    game.gameState.phase = GAME_PHASE.DISCUSSION;
    game.phase = GAME_PHASE.DISCUSSION;
    await game.save();

    const io = getIO();
    io.to(code).emit('phase-updated', GAME_PHASE.DISCUSSION);
    io.to(code).emit('timer-updated', {
      phase: GAME_PHASE.DISCUSSION,
      endTime: session.discussionTimerEnd,
      roundNumber: session.roundNumber
    });
    io.to(code).emit('log-updated', session.logs);
    io.to(code).emit('session-updated', session);

    // Set 60s discussion timeout
    activeTimers[code] = {
      discussionTimeout: setTimeout(() => {
        startRound(code);
      }, 60000)
    };
    console.log(`[RoundTimer] Transitioned room ${code} to Discussion Phase`);
  } catch (err) {
    console.error(`[RoundTimer] Error ending round:`, err.message);
  }
};

export const triggerEmergencyMeeting = async (roomCode, callerId, callerName) => {
  const code = roomCode.toUpperCase();
  clearTimers(code);

  try {
    const session = await GameSession.findOne({ roomCode: code });
    const game = await Game.findOne({ roomCode: code });
    if (!session || !game) return;

    if (session.phase !== GAME_PHASE.INVESTIGATION) {
      throw new Error('Can only call meeting during active investigation phase.');
    }

    const callerChar = session.characters.find(c => c.playerId === callerId);
    if (!callerChar || callerChar.emergencyMeetingsRemaining <= 0) {
      throw new Error('You have no emergency meetings remaining.');
    }

    callerChar.emergencyMeetingsRemaining -= 1;
    session.phase = GAME_PHASE.DISCUSSION;
    session.discussionTimerEnd = new Date(Date.now() + 60000); // 60s discussion

    // Reset meeting voting state
    session.votingState = {
      round: session.roundNumber,
      votes: new Map(),
      resolved: false,
      eliminatedId: null
    };

    const meetingMsg = {
      messageId: 'msg_' + nanoid(8),
      type: 'ai',
      author: 'Game Master',
      text: `🚨 [EMERGENCY MEETING] Investigator ${callerName} has called an emergency meeting! All movements are frozen. Transitioning to Discussion Phase.`,
      createdAt: new Date()
    };
    session.logs.push(meetingMsg);
    await session.save();

    game.gameState.phase = GAME_PHASE.DISCUSSION;
    game.phase = GAME_PHASE.DISCUSSION;
    await game.save();

    const io = getIO();
    io.to(code).emit('meeting:called', { callerId, callerName });
    io.to(code).emit('meeting:start', { callerId, callerName });
    io.to(code).emit('phase-updated', GAME_PHASE.DISCUSSION);
    io.to(code).emit('timer-updated', {
      phase: GAME_PHASE.DISCUSSION,
      endTime: session.discussionTimerEnd,
      roundNumber: session.roundNumber
    });
    io.to(code).emit('log-updated', session.logs);
    io.to(code).emit('session-updated', session);

    // Set 60s discussion timeout
    activeTimers[code] = {
      discussionTimeout: setTimeout(async () => {
        try {
          const freshSession = await GameSession.findOne({ roomCode: code });
          if (freshSession && freshSession.votingState && !freshSession.votingState.resolved) {
            // It was a meeting, and vote didn't resolve (timer ran out)
            if (freshSession.votingState.votes.size === 0) {
               const g = await Game.findOne({ roomCode: code });
               await endGameWithKillerWin(code, freshSession, g, `[MEETING FAILED] The timer expired and no votes were cast. The killer seized the opportunity and escaped!`);
               return;
            }
          }
        } catch(e) {
          console.error(e);
        }
        startRound(code);
      }, 60000)
    };
    console.log(`[RoundTimer] Emergency meeting called by ${callerName} in room ${code}`);
  } catch (err) {
    console.error(`[RoundTimer] Error in emergency meeting:`, err.message);
    throw err;
  }
};

const clearTimers = (roomCode) => {
  const timers = activeTimers[roomCode];
  if (timers) {
    if (timers.roundTimeout) clearTimeout(timers.roundTimeout);
    if (timers.discussionTimeout) clearTimeout(timers.discussionTimeout);
    delete activeTimers[roomCode];
  }
};
