import GameSession from '../models/gameSession.model.js';
import Game from '../models/game.model.js';
import { getIO } from '../sockets/socket.js';
import { GAME_PHASE } from '../constants/game.constants.js';
import { nanoid } from 'nanoid';

const activeTimers = {}; // roomCode -> { roundTimeout, discussionTimeout }

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
      session.roundNumber += 1;
    }
    
    session.roundTimerEnd = new Date(Date.now() + 180000); // 3 minutes
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
      text: `[ROUND START] Round ${session.roundNumber} has begun. Actions replenished. You have 3 minutes to investigate.`,
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

    // Set 3 minute timeout
    activeTimers[code] = {
      roundTimeout: setTimeout(() => {
        endRound(code, 'timer');
      }, 180000)
    };
    console.log(`[RoundTimer] Started round ${session.roundNumber} for room ${code}`);
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
      discussionTimeout: setTimeout(() => {
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
