import * as gameService from '../services/game.service.js';
import { SOCKET_EVENTS, ERROR_CODES } from './events/socket.events.js';
import { startRound, triggerEmergencyMeeting } from '../services/roundTimer.service.js';
import GameSession from '../models/gameSession.model.js';
import Game from '../models/game.model.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the allPlayers payload for the game:ended event.
 * Joins game.players (names, connection) with session.characters (role, murderer flag).
 */
function buildAllPlayersPayload(game, session) {
  return game.players.map(player => {
    const char = session.characters.find(c => c.playerId === player.playerId);
    return {
      playerId: player.playerId,
      name: player.name,
      characterName: char?.name || player.name,
      occupation: char?.occupation || '',
      isMurderer: char?.isMurderer || false,
      // emergencyMeetingsRemaining defaults to 1; 0 means they were voted out
      isEliminated: char ? (char.emergencyMeetingsRemaining === 0) : false,
    };
  });
}

/**
 * Scan session logs for meeting-called and vote-resolved entries and return
 * human-readable bullet points for the Case Summary Dossier.
 */
function buildRoundEvents(session) {
  const events = [];
  let cluesThisRound = 0;
  let currentRound = 1;

  for (const log of session.logs) {
    if (log.type !== 'ai') continue;
    const t = log.text || '';

    if (t.includes('[ROUND START]')) {
      if (cluesThisRound > 0) {
        events.push(`Round ${currentRound}: ${cluesThisRound} clue${cluesThisRound > 1 ? 's' : ''} discovered`);
        cluesThisRound = 0;
      }
      const m = t.match(/Round (\d+)/);
      if (m) currentRound = parseInt(m[1], 10);
    } else if (t.includes('[ROUND END]') || t.includes('Discussion Phase')) {
      // Round ended
    } else if (t.includes('[EMERGENCY MEETING]')) {
      const m = t.match(/Investigator (.+?) has called/);
      if (m) events.push(`Round ${currentRound}: Emergency meeting called by ${m[1]}`);
    } else if (t.includes('ELIMINATED:') || t.includes('voted out')) {
      // Handled below via eliminatedRole
    } else if (t.toLowerCase().includes('clue') || t.toLowerCase().includes('evidence') || t.toLowerCase().includes('discovered')) {
      cluesThisRound++;
    }
  }

  if (cluesThisRound > 0) {
    events.push(`Round ${currentRound}: ${cluesThisRound} clue${cluesThisRound > 1 ? 's' : ''} discovered`);
  }

  return events;
}

const gameHandler = (io, socket) => {
  const { roomCode, playerId, playerName } = socket.data;

  const handleGetSession = async () => {
    try {
      let session = await gameService.getGameSession(roomCode);
      
      // Auto-start round 1 when the first client joins/retrieves the session details
      if (session.phase === 'setup' || session.roundTimerEnd === null) {
        await startRound(roomCode);
        session = await gameService.getGameSession(roomCode);
      }
      
      socket.emit(SOCKET_EVENTS.GAME_INITIALIZED, {
        gameId: session.gameId,
        phase: session.phase,
        theme: session.theme,
        location: session.location,
        victim: session.victim,
        timeOfDeath: session.timeOfDeath,
        causeOfDeath: session.causeOfDeath,
        suspectCount: session.suspects.length,
      });
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: ERROR_CODES.SESSION_NOT_FOUND,
        message: error.message,
      });
    }
  };

  const handleGetMyCharacter = async () => {
    try {
      const character = await gameService.getPlayerGameCharacter(roomCode, playerId);
      socket.emit(SOCKET_EVENTS.CHARACTER_ASSIGNED, character);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: ERROR_CODES.PLAYER_NOT_FOUND,
        message: error.message,
      });
    }
  };

  const handlePlayerMove = async (moveData) => {
    try {
      socket.to(roomCode).emit('player:position', {
        playerId,
        x: moveData.x,
        y: moveData.y,
        direction: moveData.direction,
        sceneId: moveData.sceneId
      });

      // Update position asynchronously to avoid blocking the real-time loop
      gameService.updatePlayerPosition(roomCode, playerId, moveData).catch(err => {
        console.error('[Socket] Failed to save player position:', err.message);
      });
    } catch (error) {
      console.error('[Socket] Move sync error:', error.message);
    }
  };

  const handleCallMeeting = async () => {
    try {
      await triggerEmergencyMeeting(roomCode, playerId, playerName);
    } catch (error) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
      });
    }
  };

  const handleSendChat = (chatData) => {
    io.to(roomCode).emit('chat:received', {
      senderId: playerId,
      senderName: playerName,
      text: chatData.text,
      createdAt: new Date()
    });
  };

  const handlePlayerSuspect = (susData) => {
    // Broadcast who this player currently suspects (pre-vote signal)
    io.to(roomCode).emit('player:suspect:updated', {
      playerId,
      suspectId: susData.suspectId // can be playerId or suspect name
    });
  };

  const handleMeetingVote = async ({ targetId }) => {
    try {
      const session = await GameSession.findOne({ roomCode: roomCode.toUpperCase() });
      const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
      if (!session || !game) return;

      session.votingState.votes.set(playerId, targetId || 'abstain');
      await session.save();

      const connectedPlayerIds = game.players.filter(p => p.isConnected).map(p => p.playerId);
      const votesReceived = Array.from(session.votingState.votes.keys());
      const allVoted = connectedPlayerIds.every(id => votesReceived.includes(id));

      io.to(roomCode).emit('meeting:vote-updated', {
        votedPlayerIds: votesReceived
      });

      if (allVoted) {
        // Resolve the voting
        const voteCounts = {};
        for (const [voterId, votedId] of session.votingState.votes.entries()) {
          if (votedId !== 'abstain') {
            voteCounts[votedId] = (voteCounts[votedId] || 0) + 1;
          }
        }

        let maxVotes = 0;
        let eliminatedId = null;
        let isTie = false;

        for (const [votedId, count] of Object.entries(voteCounts)) {
          if (count > maxVotes) {
            maxVotes = count;
            eliminatedId = votedId;
            isTie = false;
          } else if (count === maxVotes) {
            isTie = true;
          }
        }

        session.votingState.resolved = true;
        session.votingState.eliminatedId = isTie ? null : eliminatedId;
        
        // If someone is eliminated, mark them as spectator/eliminated in characters
        if (session.votingState.eliminatedId) {
          const char = session.characters.find(c => c.playerId === session.votingState.eliminatedId);
          if (char) {
            char.actionsRemaining = 0; // cannot act
            char.emergencyMeetingsRemaining = 0; // cannot call meetings
          }
        }
        await session.save();

        let eliminatedRole = null;
        if (session.votingState.eliminatedId) {
          const char = session.characters.find(c => c.playerId === session.votingState.eliminatedId);
          if (char) {
            eliminatedRole = {
              name: char.name,
              occupation: char.occupation,
              privateSecret: char.privateSecret,
              isMurderer: char.isMurderer
            };
          }
        }

        io.to(roomCode).emit('vote:resolved', {
          votes: Object.fromEntries(session.votingState.votes),
          eliminatedId: session.votingState.eliminatedId,
          eliminatedRole: game.revealPolicy === 'immediate' ? eliminatedRole : null,
          revealPolicy: game.revealPolicy
        });

        // ---------------------------------------------------------------
        // Game-ending condition check
        // ---------------------------------------------------------------
        const murdererChar = session.characters.find(c => c.isMurderer);
        const murdererPlayerId = murdererChar?.playerId;

        if (murdererPlayerId) {
          const allPlayers = buildAllPlayersPayload(game, session);
          const basePayload = {
            accusedId: session.votingState.eliminatedId,
            actualKillerId: murdererPlayerId,
            killerName: murdererChar.name,
            killerOccupation: murdererChar.occupation,
            killerMotive: session.motiveSummary || session.solution?.motive || '',
            murderWeapon: session.murderWeapon || '',
            victim: session.victim || '',
            location: session.location || '',
            causeOfDeath: session.causeOfDeath || '',
            timeOfDeath: session.timeOfDeath || '',
            roundNumber: session.roundNumber,
            allPlayers,
          };

          let outcome = null;
          if (session.votingState.eliminatedId === murdererPlayerId) {
            outcome = 'investigators_win';
          } else if (session.votingState.eliminatedId) {
            // Wrong person voted out - check if killer wins
            const remainingInvestigators = game.players.filter(p =>
              p.isConnected &&
              p.playerId !== murdererPlayerId &&
              p.playerId !== session.votingState.eliminatedId
            );
            if (remainingInvestigators.length === 0) {
              outcome = 'killer_wins';
            }
          }

          if (outcome) {
            console.log(`[GameEnd] Vote ends game. Outcome: ${outcome} in room ${roomCode}`);

            // Generate AI final reveal in background before emitting GAME_ENDED
            setTimeout(async () => {
              try {
                const { buildFinalRevealPrompt } = await import('../prompts/investigation.prompt.js');
                const aiService = await import('../services/ai.service.js');
                
                const fakeVotes = [];
                for (const [voterId, votedId] of session.votingState.votes.entries()) {
                  const vName = session.characters.find(c => c.playerId === voterId)?.name || 'Someone';
                  let sName = 'Abstained';
                  if (votedId !== 'abstain') {
                     sName = session.characters.find(c => c.playerId === votedId)?.name || votedId;
                  }
                  fakeVotes.push({ playerName: vName, suspectName: sName });
                }

                const revealPrompt = buildFinalRevealPrompt({
                  gameContext: session,
                  votes: fakeVotes
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
              
              io.to(roomCode).emit(SOCKET_EVENTS.GAME_ENDED, {
                ...basePayload,
                outcome,
              });
            }, 100);
          } else {
            console.log(`[Meeting] Innocent eliminated or tie. Game continues.`);
          }
        }
        // ---------------------------------------------------------------
      }
    } catch (e) {
      console.error('[Meeting Vote Error]', e);
    }
  };

  const handleMeetingEnd = async () => {
    try {
      const game = await Game.findOne({ roomCode: roomCode.toUpperCase() });
      if (!game || game.hostId !== playerId) return;

      await startRound(roomCode);
      io.to(roomCode).emit('meeting:end');
    } catch (e) {
      console.error('[Meeting End Error]', e);
    }
  };

  const handleVoiceJoin = async () => {
    try {
      const session = await GameSession.findOne({ roomCode: roomCode.toUpperCase() });
      if (session) {
        session.voiceParticipants.set(playerId, true);
        await session.save();
        io.to(roomCode).emit('voice:participants-updated', Object.fromEntries(session.voiceParticipants));
      }
    } catch (e) {
      console.error(e);
    }
    socket.to(roomCode).emit('voice:join', { playerId });
  };

  const handleVoiceLeave = async () => {
    try {
      const session = await GameSession.findOne({ roomCode: roomCode.toUpperCase() });
      if (session) {
        session.voiceParticipants.delete(playerId);
        await session.save();
        io.to(roomCode).emit('voice:participants-updated', Object.fromEntries(session.voiceParticipants));
      }
    } catch (e) {
      console.error(e);
    }
    socket.to(roomCode).emit('voice:leave', { playerId });
  };

  const handleVoiceOffer = ({ targetId, offer }) => {
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.data.playerId === targetId) {
          s.emit('voice:offer', { senderId: playerId, offer });
          break;
        }
      }
    }
  };

  const handleVoiceAnswer = ({ targetId, answer }) => {
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.data.playerId === targetId) {
          s.emit('voice:answer', { senderId: playerId, answer });
          break;
        }
      }
    }
  };

  const handleVoiceIceCandidate = ({ targetId, candidate }) => {
    const roomSockets = io.sockets.adapter.rooms.get(roomCode);
    if (roomSockets) {
      for (const socketId of roomSockets) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.data.playerId === targetId) {
          s.emit('voice:ice-candidate', { senderId: playerId, candidate });
          break;
        }
      }
    }
  };

  const handleVoiceToggleMic = async ({ micOn }) => {
    try {
      const session = await GameSession.findOne({ roomCode: roomCode.toUpperCase() });
      if (session) {
        session.voiceParticipants.set(playerId, micOn);
        await session.save();
        io.to(roomCode).emit('voice:participants-updated', Object.fromEntries(session.voiceParticipants));
      }
    } catch (e) {
      console.error(e);
    }
  };

  socket.on('get-session', handleGetSession);
  socket.on('get-my-character', handleGetMyCharacter);
  socket.on('player:move', handlePlayerMove);
  socket.on('meeting:call', handleCallMeeting);
  socket.on('send-chat', handleSendChat);
  socket.on('player:suspect', handlePlayerSuspect);
  socket.on('meeting:vote', handleMeetingVote);
  socket.on('meeting:end', handleMeetingEnd);
  socket.on('voice:join', handleVoiceJoin);
  socket.on('voice:leave', handleVoiceLeave);
  socket.on('voice:offer', handleVoiceOffer);
  socket.on('voice:answer', handleVoiceAnswer);
  socket.on('voice:ice-candidate', handleVoiceIceCandidate);
  socket.on('voice:toggle-mic', handleVoiceToggleMic);
};

export default gameHandler;
