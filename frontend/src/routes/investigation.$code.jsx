import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { getPlayerId } from "@/lib/player-id";
import { 
  getSessionDetails,
  getSuspects, 
  getInvestigationLog, 
  getDiscoveredClues, 
  getActivePlayers, 
  submitAction,
  startVoting,
  submitVote
} from "@/lib/investigation";
import { Send, User, Database, Activity, Volume2, VolumeX, AlertOctagon, MessageSquare, Clipboard, Eye, Plus, Mic, MicOff, Headphones, PanelRightClose, PanelRight } from "lucide-react";
import GameCanvas from "@/components/GameCanvas";
import EvidenceBoard from "@/components/EvidenceBoard";
import { VoiceManager } from "../lib/voice";

export const Route = createFileRoute("/investigation/$code")({
  component: InvestigationScreen
});

function InvestigationScreen() {
  const { code } = Route.useParams();
  const playerId = getPlayerId();
  
  // Data State
  const [session, setSession] = useState(null);
  const [suspects, setSuspects] = useState([]);
  const [log, setLog] = useState([]);
  const [clues, setClues] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [hotspot, setHotspot] = useState(null);

  // Phase & Voting State
  const [phase, setPhase] = useState("investigation");
  const [myVote, setMyVote] = useState("");
  const [voted, setVoted] = useState(false);
  const [finalReveal, setFinalReveal] = useState("");

  // Meeting & Custom UI State
  const [isMeetingActive, setIsMeetingActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [eliminatedSnippet, setEliminatedSnippet] = useState(null);
  const [voiceParticipants, setVoiceParticipants] = useState({});

  // Action State
  const [actionType, setActionType] = useState("ask");
  const [actionTarget, setActionTarget] = useState("");
  const [actionContent, setActionContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pacing & Live Discussion States
  const [myChar, setMyChar] = useState(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [timerEnd, setTimerEnd] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [meetingAlert, setMeetingAlert] = useState(null);
  const [activeView, setActiveView] = useState("log"); // "log", "corkboard", "chat"
  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [suspicionSignals, setSuspicionSignals] = useState({}); // playerId -> suspectName
  const [isMuted, setIsMuted] = useState(false);

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState("log");

  // STT/TTS State
  const [isListening, setIsListening] = useState(false);
  const [autoReadMessages, setAutoReadMessages] = useState(false);
  const recognitionRef = useRef(null);
  const autoReadRef = useRef(false);

  // Desktop Sidebar State
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);

  const logEndRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);
  const voiceManagerRef = useRef(null);
  const gameRef = useRef(null);

  // Synthesize tick audio tick programmatically
  const playTickSound = () => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {}
  };

  // Synthesize meeting thud audio programmatically
  const playThudSound = () => {
    if (isMuted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  };

  useEffect(() => {
    autoReadRef.current = autoReadMessages;
  }, [autoReadMessages]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setChatText(transcript);
      };
      recognition.onend = () => {
        setIsListening(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const handleToggleListening = (e) => {
    e.preventDefault();
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSpeakMessage = (text) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [sessionData, susData, logData, clueData, playerData] = await Promise.all([
          getSessionDetails(code, true),
          getSuspects(code),
          getInvestigationLog(code),
          getDiscoveredClues(code),
          getActivePlayers(code)
        ]);
        if (cancelled) return;
        setSession(sessionData);
        setSuspects(susData);
        setLog(logData);
        setClues(clueData);
        setPlayers(playerData);
        setPhase(sessionData.phase || "investigation");
        setRoundNumber(sessionData.roundNumber || 1);
        setTimerEnd(sessionData.phase === "discussion" ? sessionData.discussionTimerEnd : sessionData.roundTimerEnd);
        setFinalReveal(sessionData.finalReveal || "");
        
        const char = sessionData.characters.find(c => c.playerId === playerId);
        setMyChar(char);

        const alreadyVoted = (sessionData.votes || []).some(v => v.playerId === playerId);
        setVoted(alreadyVoted);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load investigation details:", err);
          setError(err.message || "Failed to connect to game server");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, [code, playerId]);

  useEffect(() => {
    if (!code || !playerId) return;

    const sock = getSocket(code, playerId);
    socketRef.current = sock;
    setSocket(sock);

    sock.on("connect", () => {
      sock.emit("join-room");
      sock.emit("get-session");

      // Initialize voice manager once connected
      if (!voiceManagerRef.current) {
        voiceManagerRef.current = new VoiceManager(sock, code, playerId, {
          onStream: (pId, stream) => {
            let audioEl = document.getElementById(`audio-peer-${pId}`);
            if (!audioEl) {
              audioEl = document.createElement("audio");
              audioEl.id = `audio-peer-${pId}`;
              audioEl.autoplay = true;
              audioEl.style.display = "none";
              document.body.appendChild(audioEl);
            }
            audioEl.srcObject = stream;
          },
          onTalking: (pId, isTalking) => {
            if (gameRef.current) {
              const meetingScene = gameRef.current.scene.getScene("MeetingScene");
              if (meetingScene && meetingScene.voiceParticipants) {
                meetingScene.voiceParticipants[pId] = isTalking;
              }
            }
          },
          onParticipantsUpdated: (participants) => {
            setVoiceParticipants(participants);
          }
        });
        voiceManagerRef.current.start();
      }
    });

    sock.on("log-updated", (newLogs) => {
      setLog(newLogs);
    });

    sock.on("clues-updated", (newClues) => {
      setClues(newClues);
    });

    sock.on("game:play-again", (data) => {
      navigate({ to: `/lobby/$code`, params: { code: data.newRoomCode } });
    });

    sock.on("phase-updated", async (newPhase) => {
      setPhase(newPhase);
      const freshSession = await getSessionDetails(code, true);
      setSession(freshSession);
      setFinalReveal(freshSession.finalReveal || "");
      const alreadyVoted = (freshSession.votes || []).some(v => v.playerId === playerId);
      setVoted(alreadyVoted);

      if (newPhase === 'investigation') {
        setIsMeetingActive(false);
      }
    });

    sock.on("timer-updated", (data) => {
      setPhase(data.phase);
      setTimerEnd(data.endTime);
      setRoundNumber(data.roundNumber);
    });

    sock.on("session-updated", (updatedSession) => {
      setSession(updatedSession);
      const char = updatedSession.characters.find(c => c.playerId === playerId);
      setMyChar(char);
    });

    sock.on("meeting:start", (data) => {
      setIsMeetingActive(true);
      playThudSound();
      setMeetingAlert(`🚨 Emergency Meeting called by ${data.callerName}!`);
      setIsDrawerOpen(true);
      setActiveView("chat"); // Auto switch to chat tab
      setTimeout(() => {
        setMeetingAlert(null);
      }, 5000);
    });

    sock.on("meeting:called", (data) => {
      setIsMeetingActive(true);
      playThudSound();
      setMeetingAlert(`🚨 Emergency Meeting called by ${data.callerName}!`);
      setIsDrawerOpen(true);
      setActiveView("chat"); // Auto switch to chat tab
      setTimeout(() => {
        setMeetingAlert(null);
      }, 5000);
    });

    sock.on("meeting:end", () => {
      setIsMeetingActive(false);
    });

    sock.on("vote:resolved", (data) => {
      if (data.eliminatedId) {
        setEliminatedSnippet(data.eliminatedRole || { name: "Unknown", occupation: "spectator", isMurderer: false });
      }
      setTimeout(() => {
        setEliminatedSnippet(null);
      }, 6000);
    });

    sock.on("chat:received", (chatMsg) => {
      setChatMessages((prev) => [...prev, chatMsg]);
      if (autoReadRef.current) {
        handleSpeakMessage(`${chatMsg.senderName} says: ${chatMsg.text}`);
      }
    });

    sock.on("player:suspect:updated", (data) => {
      setSuspicionSignals((prev) => ({
        ...prev,
        [data.playerId]: data.suspectId
      }));
    });

    // ── End-game reveal transition ─────────────────────────────────────────
    sock.on("game:ended", async (data) => {
      try {
        // Fetch epilogue + round events before launching the scene
        const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
        let epilogueText = '';
        let roundEvents = [];
        try {
          const res = await fetch(`${API_BASE}/api/games/${code}/epilogue`);
          if (res.ok) {
            const json = await res.json();
            epilogueText = json.epilogueText || '';
            roundEvents = json.roundEvents || [];
          }
        } catch (_) {
          // Non-fatal — scene will use fallback text
        }

        const game = gameRef.current;
        if (!game) return;

        // Stop all currently active Phaser scenes
        game.scene.getScenes(true).forEach(scene => {
          game.scene.stop(scene.scene.key);
        });

        // Launch FinalRevealScene with full payload
        game.scene.start('FinalRevealScene', {
          socket: sock,
          roomCode: code,
          playerId,
          isMuted,
          outcome:          data.outcome,
          accusedId:        data.accusedId,
          actualKillerId:   data.actualKillerId,
          killerName:       data.killerName,
          killerOccupation: data.killerOccupation,
          killerMotive:     data.killerMotive,
          murderWeapon:     data.murderWeapon,
          victim:           data.victim,
          location:         data.location,
          causeOfDeath:     data.causeOfDeath,
          timeOfDeath:      data.timeOfDeath,
          roundNumber:      data.roundNumber,
          allPlayers:       data.allPlayers || [],
          epilogueText,
          roundEvents,
        });
      } catch (err) {
        console.error('[game:ended] Failed to launch FinalRevealScene:', err);
      }
    });

    return () => {
      sock.off('game:ended');
      disconnectSocket(code, playerId);
      setSocket(null);
      if (voiceManagerRef.current) {
        voiceManagerRef.current.stop();
        voiceManagerRef.current = null;
      }
      // Clean up peer audio elements
      const audios = document.querySelectorAll("audio[id^='audio-peer-']");
      audios.forEach(audio => audio.remove());
    };
  }, [code, playerId]);

  // Handle countdown updates
  useEffect(() => {
    if (!timerEnd) return;
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((new Date(timerEnd) - new Date()) / 1000));
      setTimeLeft(diff);
      if (diff > 0 && diff <= 10) {
        playTickSound();
      }
      if (diff === 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerEnd, isMuted]);

  // Auto-scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleOverlapStart = (hs) => {
    setHotspot(hs);
    if (hs.type === 'suspect') {
      setActionType('ask');
      setActionTarget(hs.name);
    } else if (hs.type === 'inspect') {
      setActionType('inspect');
      setActionTarget(hs.target);
    } else if (hs.type === 'emergency') {
      // Nothing needed, the UI will react to hotspot.type === 'emergency'
    }
  };

  const handleOverlapEnd = () => {
    setHotspot(null);
  };

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (submitting || (!actionTarget && actionType !== "inspect") || (actionType !== "inspect" && !actionContent)) return;

    setSubmitting(true);
    playThudSound();
    try {
      if (actionType === 'share') {
        if (socket) {
          socket.emit("send-chat", { text: `Hey everyone, you should come check out the ${actionTarget || hotspot?.name}!` });
        }
        setActiveView("chat");
        return;
      }

      await submitAction(code, playerId, {
        type: actionType,
        target: actionTarget,
        content: actionContent
      });
      setActionContent("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteSubmit = async () => {
    if (!myVote) return;
    try {
      const targetPlayer = players.find(p => p.name === myVote);
      const targetId = targetPlayer ? targetPlayer.id : myVote;

      if (socket) {
        socket.emit("meeting:vote", { targetId });
      } else {
        await submitVote(code, playerId, myVote);
      }
      setVoted(true);
    } catch (err) {
      console.error("Failed to submit vote:", err);
    }
  };

  const handlePlayAgain = async () => {
    if (!session || session.hostId !== playerId) return;
    try {
      const { createRoom } = await import('@/lib/rooms');
      const { code: newCode } = await createRoom({
        name: session.theme || "New Investigation",
        mode: "classic_mansion",
        maxMembers: session.suspects?.length || 5,
        maxRounds: 3,
        roundDurationMinutes: 2,
        revealPolicy: session.revealPolicy || 'immediate',
        hostName: players.find(p => p.id === playerId)?.name || "Host"
      });
      if (socket) {
        socket.emit("game:play-again", { newRoomCode: newCode });
      }
      navigate({ to: `/lobby/$code`, params: { code: newCode } });
    } catch (e) {
      console.error("Failed to start new game:", e);
      alert("Failed to generate a new game. Please try again.");
    }
  };

  const handleStartVoting = async () => {
    try {
      await startVoting(code, playerId);
    } catch (err) {
      console.error("Failed to start voting:", err);
    }
  };

  const handleEmergencyMeeting = () => {
    if (socket) {
      socket.emit("meeting:call");
    }
  };

  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatText.trim() || !socket) return;
    socket.emit("send-chat", { text: chatText.trim() });
    setChatText("");
  };

  const handleToggleSuspectSignal = (suspectName) => {
    if (!socket) return;
    const currentSus = suspicionSignals[playerId];
    const nextSus = currentSus === suspectName ? null : suspectName;
    socket.emit("player:suspect", { suspectId: nextSus });
    setSuspicionSignals(prev => ({
      ...prev,
      [playerId]: nextSus
    }));
  };

  const handleToggleMic = () => {
    const nextState = !micEnabled;
    setMicEnabled(nextState);
    if (voiceManagerRef.current) {
      voiceManagerRef.current.toggleMic(nextState);
    }
  };

  const handleToggleDeafen = () => {
    const nextDeafen = !isDeafened;
    setIsDeafened(nextDeafen);
    if (voiceManagerRef.current) {
      voiceManagerRef.current.toggleMic(micEnabled && !nextDeafen);
    }
    const audios = document.querySelectorAll("audio[id^='audio-peer-']");
    audios.forEach(audio => {
      audio.volume = nextDeafen ? 0 : 1;
    });
  };

  const handleOpenVotingInMeeting = () => {
    if (gameRef.current) {
      gameRef.current.events.emit('toggle-voting', true);
    }
  };

  const handleEndMeetingHost = () => {
    if (socket) {
      socket.emit('meeting:end');
    }
  };

  const handleShareClue = async (clueId) => {
    try {
      await submitAction(code, playerId, {
        type: 'share_clue',
        target: clueId
      });
      // A meeting:action or round:action event from socket should refresh clues
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeduceClues = async (clueIds) => {
    if (clueIds.length !== 2) return;
    try {
      await submitAction(code, playerId, {
        type: 'deduce',
        target: clueIds.join(',')
      });
      // The socket event should refresh clues automatically
    } catch (e) {
      console.error(e);
    }
  };

  // ── DEV: Direct preview of FinalRevealScene ──────────────────────────────
  // Builds plausible mock data from the current session and launches the
  // scene directly, bypassing the vote/socket flow entirely.
  const previewEnding = (outcome = "investigators_win") => {
    const game = gameRef.current;
    if (!game) return;

    // Find murderer from session characters (may be null if not yet loaded)
    const murdererChar = session?.characters?.find(c => c.isMurderer);
    const killerPlayerId = murdererChar?.playerId || players[0]?.playerId || "mock-killer";
    const killerName     = murdererChar?.name       || "Evelyn Blackwood";
    const killerOcc      = murdererChar?.occupation || "Disinherited Heir";
    const killerMotive   = session?.motiveSummary   || "Stood to lose the entire inheritance.";

    const accusedPlayer  = players[0] || { playerId: "mock-accused" };

    // Build allPlayers from live data, falling back to a dummy list
    const allPlayers = players.length > 0
      ? players.map((p, i) => {
          const char = session?.characters?.find(c => c.playerId === (p.playerId || p.id));
          return {
            playerId:      p.playerId || p.id,
            name:          p.name || `Player ${i + 1}`,
            characterName: char?.name       || `Character ${i + 1}`,
            occupation:    char?.occupation || "Guest",
            isMurderer:    char?.isMurderer || false,
            isEliminated:  i === 0 && outcome === "killer_wins",
          };
        })
      : [
          { playerId: "mock-inv-1", name: "Player 1", characterName: "Dr. Fenwick",        occupation: "Family Doctor",        isMurderer: false, isEliminated: false },
          { playerId: "mock-inv-2", name: "Player 2", characterName: "Clara Holt",          occupation: "Socialite Guest",      isMurderer: false, isEliminated: outcome === "killer_wins" },
          { playerId: killerPlayerId, name: "Player 3", characterName: killerName,          occupation: killerOcc,              isMurderer: true,  isEliminated: outcome === "investigators_win" },
        ];

    const mockRoundEvents = [
      "Round 1: 3 clues discovered by investigators",
      "Round 2: Emergency meeting called by Player 1",
      "Round 3: Clara Holt voted out (innocent)",
      `Final vote: ${killerName} accused and found ${outcome === "investigators_win" ? "GUILTY" : "innocent"}`,
    ];

    const epilogueText = outcome === "investigators_win"
      ? `${killerName} had concealed the murder weapon in the east wing fireplace — the very place the investigation log had marked as searched. A second sweep, prompted by Clara's final testimony, proved decisive.`
      : `Despite the investigators' best efforts, ${killerName} slipped away before dawn. The case file remains open.`;

    // Stop active scenes cleanly
    game.scene.getScenes(true).forEach(s => game.scene.stop(s.scene.key));

    game.scene.start("FinalRevealScene", {
      roomCode:         code,
      playerId,
      isMuted,
      outcome,
      accusedId:        accusedPlayer.playerId || accusedPlayer.id,
      actualKillerId:   killerPlayerId,
      killerName,
      killerOccupation: killerOcc,
      killerMotive,
      murderWeapon:     session?.murderWeapon  || "Antique Letter Opener",
      victim:           session?.victim         || "Lord Blackwood",
      location:         session?.location       || "Blackwood Manor",
      causeOfDeath:     session?.causeOfDeath   || "Stabbed through the heart",
      timeOfDeath:      session?.timeOfDeath    || "11:45 PM",
      roundNumber:      session?.roundNumber    || 3,
      allPlayers,
      epilogueText,
      roundEvents:      mockRoundEvents,
  });
  };


  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)]">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)] animate-pulse font-typewriter">
          Loading case records...
        </span>
      </main>
    );
  }

  if (error || !session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[color:var(--color-bg-base)] px-6 text-center">
        <span className="tracked-caps text-[10px] text-[color:var(--color-accent-blood)] font-bold mb-2 font-typewriter">
          Connection Error
        </span>
        <h1 className="font-serif-display text-2xl text-[color:var(--color-text-primary)] mb-3">
          Unable to Load Case File
        </h1>
        <p className="text-xs text-[color:var(--color-text-secondary)] max-w-xs mb-6 leading-relaxed font-typewriter">
          {error || "The investigation session is not initialized or could not be retrieved."}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => window.location.reload()}
            className="text-[10px] font-typewriter border border-stone-800 px-4 py-2 hover:bg-stone-900 text-stone-100 transition-colors"
          >
            Retry Connection
          </button>
          <Link
            to="/"
            className="text-[10px] font-typewriter border border-stone-800 px-4 py-2 hover:bg-stone-900 text-stone-400 transition-colors"
          >
            Return to Archives
          </Link>
        </div>
      </main>
    );
  }

  const getColorFromIdStr = (id) => {
    if (!id) return "#ffffff";
    let hash = 0;
    const idStr = String(id);
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
      "#ef4444", "#3b82f6", "#10b981", "#f59e0b",
      "#8b5cf6", "#ec4899", "#06b6d4", "#14b8a6"
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const renderSuspectsPanel = () => (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b-4 border-stone-800 bg-amber-100">
        <span className="font-bold text-[14px] text-stone-800 tracking-wider">PERSONS OF INTEREST</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-100">
        {suspects.map(s => {
          const suspectors = Object.keys(suspicionSignals).filter(pId => suspicionSignals[pId] === s.name);
          const suspectorNames = suspectors.map(pId => {
            const p = players.find(player => player.id === pId);
            return p ? p.name : "Anonymous";
          });

          return (
            <div key={s.id} className="p-3 bg-white rounded-xl relative shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] border-2 border-stone-800">
              {/* Suspicion indicators */}
              {suspectorNames.length > 0 && (
                <div className="absolute top-2 right-2 flex gap-1 items-center z-10">
                  <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1 rounded border border-red-500">SUSPECTED!</span>
                  <div className="flex -space-x-1">
                    {suspectorNames.map((name, idx) => (
                      <div 
                        key={idx} 
                        title={name} 
                        className="w-3 h-3 rounded-full bg-red-500 border border-stone-900" 
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 items-center">
                <div 
                  className="w-12 h-12 rounded-full overflow-hidden border-2 border-stone-800 shrink-0 flex items-center justify-center relative"
                  style={{ backgroundColor: s.isPlayer ? getColorFromIdStr(s.playerId) : '#e5e7eb' }}
                >
                  {/* Cartoon Character Thumbnail Representation */}
                  <svg viewBox="0 0 32 32" className="w-10 h-10 mt-2">
                    <rect x="8" y="12" width="16" height="20" rx="4" fill="#ffffff" />
                    <circle cx="16" cy="8" r="6" fill="#fbcfe8" />
                    <path d="M10 8 A 6 6 0 0 1 22 8 Z" fill="#451a03" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg text-stone-800 leading-tight">{s.name}</p>
                  <p className="text-xs text-stone-500 font-bold">{s.role}</p>
                </div>
                {s.isPlayer && (
                  <span className="absolute bottom-2 right-2 text-[9px] font-bold bg-amber-400 text-stone-900 px-2 py-0.5 rounded-full border border-stone-800">Player</span>
                )}
              </div>
              
              <div className="mt-4 flex gap-2 flex-wrap items-center">
                {phase === "investigation" && (
                  <>
                    <button 
                      onClick={() => { setActionType("ask"); setActionTarget(s.name); setActiveView("log"); }}
                      className="text-[10px] font-typewriter border border-stone-800 px-2 py-1 hover:bg-stone-900 transition-colors"
                    >
                      Ask
                    </button>
                    <button 
                      onClick={() => { setActionType("request"); setActionTarget(s.name); setActiveView("log"); }}
                      className="text-[10px] font-typewriter border border-stone-800 px-2 py-1 hover:bg-stone-900 transition-colors"
                    >
                      Request
                    </button>
                    <button 
                      onClick={() => { setActionType("accuse"); setActionTarget(s.name); setActiveView("log"); }}
                      className="text-[10px] font-typewriter border border-red-900 text-red-500 px-2 py-1 hover:bg-red-950/20 transition-colors"
                    >
                      Accuse
                    </button>
                  </>
                )}

                {/* Pre-vote suspicion eye button */}
                <button
                  type="button"
                  title="Signal Suspicion"
                  onClick={() => handleToggleSuspectSignal(s.name)}
                  className={`p-1 border transition-colors ${
                    suspicionSignals[playerId] === s.name
                      ? "border-red-600 text-red-500 bg-red-950/20"
                      : "border-stone-800 text-stone-500 hover:text-stone-300"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const visibleClues = clues.filter(c => c.isShared || c.discoveredBy === myChar?.name);

  const renderEvidencePanel = () => (
    <div className="h-full flex flex-col border-l border-stone-850 bg-[color:var(--color-bg-base)]">
      <div className="p-4 border-b border-stone-850">
        <span className="font-typewriter text-[10px] text-[color:var(--color-text-tertiary)]">Evidence & Clues</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {visibleClues.length === 0 && (
          <p className="text-xs text-[color:var(--color-text-tertiary)] text-center py-8 font-typewriter">No evidence discovered yet.</p>
        )}
        {visibleClues.map(c => (
          <div key={c.id} className="p-3 border border-stone-850 bg-stone-900/40 relative">
            <div className="flex justify-between items-start">
              <p className="font-serif-display text-md text-amber-50/90 pr-2">{c.title}</p>
              {c.isShared ? (
                <span className="text-[8px] bg-emerald-900/40 text-emerald-500 border border-emerald-800/50 px-1 rounded-sm flex-shrink-0">SHARED</span>
              ) : (
                <span className="text-[8px] bg-stone-800 text-stone-400 border border-stone-700 px-1 rounded-sm flex-shrink-0">PRIVATE</span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-2 font-courier leading-relaxed">{c.rawDescription || c.description}</p>
          </div>
        ))}
      </div>
      
      {/* Live Players Strip */}
      <div className="p-4 border-t border-stone-850 bg-stone-900/20">
        <span className="font-typewriter text-[10px] text-[color:var(--color-text-tertiary)] block mb-3">Active Investigators</span>
        <div className="flex flex-col gap-2">
          {players.map(p => {
            const suspected = suspicionSignals[p.id];
            return (
              <div key={p.id} className="flex items-center justify-between bg-stone-950/30 px-2 py-1.5 rounded border border-stone-900">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${p.active ? 'bg-green-700' : 'bg-gray-500'}`} />
                  <span className="text-xs text-[color:var(--color-text-secondary)] font-typewriter">{p.name}</span>
                </div>
                {suspected && (
                  <span className="text-[8.5px] font-typewriter text-red-500 bg-red-950/15 border border-red-900/30 px-1.5 py-0.5 rounded-sm">
                    SUSPECTS: {suspected}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderMainArea = () => {
    if (phase === 'voting') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-[color:var(--color-bg-base)] text-center">
          <div className="max-w-md border border-stone-850 bg-stone-900/60 p-8 shadow-2xl relative rotate-[0.2deg]">
            <span className="font-typewriter text-[10px] text-[color:var(--color-accent-blood)] font-bold">Phase: Accusation Voting</span>
            <h2 className="font-serif-display text-3xl mt-4 text-[color:var(--color-text-primary)]">Cast Your Accusation</h2>
            <p className="text-xs text-[color:var(--color-text-secondary)] mt-2 leading-relaxed font-typewriter">
              Read the timeline, compare dossiers, and discuss. Choose the suspect you believe is the murderer.
            </p>
            {voted ? (
              <div className="mt-8">
                <span className="text-sm font-typewriter px-4 py-2 bg-[rgba(113,26,36,0.15)] text-[color:var(--color-accent-blood-hover)] border border-[color:var(--color-accent-blood)] rounded-sm">
                  Vote Cast. Awaiting other investigators...
                </span>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <select
                  value={myVote}
                  onChange={(e) => setMyVote(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-sm p-3 outline-none focus:border-[color:var(--color-accent-blood)] font-typewriter"
                >
                  <option value="">-- Choose Suspect --</option>
                  {suspects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button
                  onClick={handleVoteSubmit}
                  disabled={!myVote}
                  className="w-full bg-[color:var(--color-accent-blood)] text-[color:var(--color-text-primary)] py-3 font-typewriter text-xs hover:bg-[color:var(--color-accent-blood-hover)] disabled:opacity-50 transition-colors rounded-sm"
                >
                  Submit Vote
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="h-full w-full flex flex-row overflow-hidden relative bg-stone-950">
        {/* Live Phaser Map canvas */}
        <div className="flex-1 h-full w-full relative">
          {socket && (
            <GameCanvas
              sceneKey={phase === 'result' ? 'FinalRevealScene' : (isMeetingActive ? "MeetingScene" : "InvestigationScene")}
              socket={socket}
              roomCode={code}
              playerId={playerId}
              players={players}
              suspects={suspects}
              clues={clues}
              mapConfig={session?.mapConfig}
              session={session}
              gameRef={gameRef}
              onOverlapStart={handleOverlapStart}
              onOverlapEnd={handleOverlapEnd}
            />
          )}

          {/* Action indicator Overlay near local character */}
          {hotspot && phase === 'investigation' && (
            <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-stone-900/95 border ${hotspot.type === 'emergency' ? 'border-red-600 pointer-events-auto' : 'border-amber-600/70 pointer-events-none'} px-5 py-3 shadow-2xl rounded-md z-10 flex flex-col items-center`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider font-typewriter ${hotspot.type === 'emergency' ? 'text-red-500' : 'text-amber-500'}`}>
                {hotspot.type === 'suspect' ? `Near Suspect: ${hotspot.name}` : hotspot.type === 'emergency' ? 'Emergency Button' : `Near Hotspot: ${hotspot.name}`}
              </span>
              
              {hotspot.type === 'emergency' ? (
                <button 
                  onClick={handleEmergencyMeeting}
                  disabled={myChar?.emergencyMeetingsRemaining <= 0}
                  className={`mt-2 text-[10px] font-bold font-typewriter border px-4 py-2 transition-colors ${
                    myChar?.emergencyMeetingsRemaining > 0
                      ? 'bg-red-950 border-red-700 text-red-500 hover:bg-red-900 hover:text-white cursor-pointer'
                      : 'bg-stone-900 border-stone-800 text-stone-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  {myChar?.emergencyMeetingsRemaining > 0 ? "PRESS ALARM" : "OUT OF ALARMS"}
                </button>
              ) : (
                <span className="text-[9px] text-stone-400 mt-1 font-courier text-center">
                  Use the Ask/Inspect form at the bottom of the right drawer to act.
                </span>
              )}
            </div>
          )}

          {/* ── DEV: Preview Ending buttons ─────────────────────────────── */}
          <div className="absolute top-3 left-3 z-50 flex flex-col gap-1.5">
            <span
              style={{ fontSize: '8px', letterSpacing: '2px', color: '#44403c', fontFamily: 'Courier Prime, monospace' }}
            >
              DEV PREVIEW
            </span>
            <button
              onClick={() => previewEnding("investigators_win")}
              style={{
                fontSize: '9px',
                fontFamily: 'Courier Prime, monospace',
                letterSpacing: '2px',
                color: '#22c55e',
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid #166534',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(22,101,52,0.3)'}
              onMouseLeave={e => e.target.style.background = 'rgba(0,0,0,0.75)'}
            >
              ▶ WIN ENDING
            </button>
            <button
              onClick={() => previewEnding("killer_wins")}
              style={{
                fontSize: '9px',
                fontFamily: 'Courier Prime, monospace',
                letterSpacing: '2px',
                color: '#ef4444',
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid #7f1d1d',
                padding: '4px 10px',
                cursor: 'pointer',
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(127,29,29,0.3)'}
              onMouseLeave={e => e.target.style.background = 'rgba(0,0,0,0.75)'}
            >
              ▶ LOSS ENDING
            </button>
          </div>
          {/* ────────────────────────────────────────────────────────────── */}

          {/* Emergency meeting host action overlay */}
          {isMeetingActive && session?.hostId === playerId && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-stone-900/90 border border-stone-800 p-2 rounded shadow-2xl z-10 flex gap-2">
              <button
                onClick={handleOpenVotingInMeeting}
                className="text-[9px] font-typewriter bg-red-950/20 text-red-500 border border-red-900 hover:bg-red-900 hover:text-white px-3 py-1.5 transition-all"
              >
                OPEN ELIMINATION VOTING
              </button>
              <button
                onClick={handleEndMeetingHost}
                className="text-[9px] font-typewriter bg-stone-800 hover:bg-stone-750 text-stone-300 border border-stone-700 px-3 py-1.5 transition-all"
              >
                END DISCUSSION / MEETING
              </button>
            </div>
          )}

          {/* Toggle docked panel button */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`absolute top-4 bg-stone-900/90 hover:bg-stone-850 border border-stone-800 p-2 shadow-lg z-40 transition-all duration-200 text-amber-500 rounded-sm ${
              isDrawerOpen ? "right-[336px]" : "right-4"
            }`}
            title={isDrawerOpen ? "Close Drawer" : "Open Drawer"}
          >
            {isDrawerOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sliding Side-over docked panel */}
        {isDrawerOpen && (
          <div className="absolute top-0 right-0 w-[320px] h-full border-l border-stone-850 bg-stone-900/95 z-30 flex flex-col shadow-2xl">
            {/* View tab switches */}
            <div className="flex bg-stone-950/80 border-b border-stone-850 px-3 py-2 gap-1.5 select-none shrink-0">
              <button
                onClick={() => setActiveView("log")}
                className={`flex-1 flex items-center justify-center gap-1 font-typewriter text-[9px] py-1.5 border transition-all ${
                  activeView === "log"
                    ? "border-amber-600 bg-amber-950/10 text-amber-500"
                    : "border-stone-800 text-stone-500 hover:text-stone-300"
                }`}
              >
                <Clipboard className="w-3 h-3" />
                LOG
              </button>
              <button
                onClick={() => setActiveView("corkboard")}
                className={`flex-1 flex items-center justify-center gap-1 font-typewriter text-[9px] py-1.5 border transition-all ${
                  activeView === "corkboard"
                    ? "border-amber-600 bg-amber-950/10 text-amber-500"
                    : "border-stone-800 text-stone-500 hover:text-stone-300"
                }`}
              >
                <Database className="w-3 h-3" />
                CORKBOARD
              </button>
              <button
                onClick={() => setActiveView("chat")}
                className={`flex-1 flex items-center justify-center gap-1 font-typewriter text-[9px] py-1.5 border transition-all ${
                  activeView === "chat"
                    ? "border-amber-600 bg-amber-950/10 text-amber-500"
                    : "border-stone-800 text-stone-500 hover:text-stone-300"
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                CHAT
              </button>
            </div>

            {/* Tab content area */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-stone-900/40">
              {activeView === "log" && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-28">
                  {log.map((entry, index) => (
                    <div key={entry.messageId || index} className={`max-w-xs ${entry.type === 'player' ? 'ml-auto text-right' : ''}`}>
                      <span className="font-typewriter text-[8px] text-stone-500 block mb-0.5">
                        {entry.author}
                      </span>
                      <div className={`p-2.5 inline-block rounded-sm ${entry.type === 'player' ? 'border border-stone-850 bg-stone-950/40' : 'bg-stone-900/50'}`}>
                        <p className={`text-xs leading-relaxed ${entry.type === 'ai' ? 'font-serif-display text-amber-100/90 text-sm' : 'text-stone-300'}`}>
                          {entry.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}

              {activeView === "corkboard" && (
                <div className="absolute inset-0 bg-stone-900 overflow-hidden flex items-center justify-center">
                  <EvidenceBoard 
                    clues={visibleClues} 
                    suspects={suspects} 
                    myCharName={myChar?.name} 
                    onShareClue={handleShareClue}
                    onDeduceClues={handleDeduceClues}
                  />
                </div>
              )}

              {activeView === "chat" && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-2 border-b border-stone-850 flex justify-between items-center bg-stone-900/40">
                    <span className="font-typewriter text-[10px] text-stone-400">DISCUSSION</span>
                    <button 
                      onClick={() => setAutoReadMessages(!autoReadMessages)}
                      className={`flex items-center gap-1 px-2 py-1 text-[9px] font-typewriter border rounded-sm transition-colors ${
                        autoReadMessages 
                          ? "border-amber-600 text-amber-500 bg-amber-950/20" 
                          : "border-stone-800 text-stone-500 hover:text-stone-300"
                      }`}
                    >
                      {autoReadMessages ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                      {autoReadMessages ? "AUTO-READ ON" : "AUTO-READ OFF"}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12">
                        <MessageSquare className="w-6 h-6 text-stone-600 mb-1" />
                        <span className="font-typewriter text-[9px] text-stone-500">NO DISCUSSION LOGGED</span>
                      </div>
                    ) : (
                      <>
                        {chatMessages.map((msg, idx) => {
                          const isMe = msg.senderId === playerId;
                          return (
                            <div key={idx} className={`max-w-xs ${isMe ? 'ml-auto text-right' : ''}`}>
                              <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <span className="font-typewriter text-[7.5px] text-stone-500">
                                  {msg.senderName}
                                </span>
                                {!isMe && (
                                  <button 
                                    onClick={() => handleSpeakMessage(msg.text)}
                                    className="text-stone-500 hover:text-stone-300 transition-colors"
                                    title="Read Aloud"
                                  >
                                    <Volume2 className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                              <div className={`p-2 inline-block rounded ${isMe ? 'bg-amber-950/30 border border-amber-900/30 text-amber-100' : 'bg-stone-900 border border-stone-850 text-stone-300'}`}>
                                <p className="text-[11px] font-courier leading-normal">{msg.text}</p>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>
                  
                  <form onSubmit={handleSendChatMessage} className="p-2 border-t border-stone-850 bg-stone-950/80 flex gap-2 shrink-0 items-center">
                    <button
                      type="button"
                      onClick={handleToggleListening}
                      className={`p-1.5 border rounded-sm transition-colors shrink-0 ${
                        isListening 
                          ? "border-red-600 text-red-500 bg-red-950/20" 
                          : "border-stone-800 text-stone-400 hover:bg-stone-900"
                      }`}
                      title={isListening ? "Stop Dictation" : "Start Dictation"}
                    >
                      <Mic className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="text"
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      placeholder="Type message..."
                      className="flex-1 bg-stone-900 border border-stone-805 text-stone-200 text-xs px-2.5 py-1.5 outline-none focus:border-amber-600 font-courier"
                    />
                    <button
                      type="submit"
                      className="bg-amber-800 text-stone-100 text-[9px] font-typewriter px-3 py-1.5 hover:bg-amber-700 transition-colors rounded-sm"
                    >
                      SEND
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Action Input form (overlay at drawer bottom, only visible when LOG view and active investigation) */}
            {activeView === "log" && phase === "investigation" && hotspot?.type !== 'emergency' && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-stone-850 bg-stone-950 p-4 shadow-xl z-20">
                <form onSubmit={handleActionSubmit} className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {['ask', 'request', 'inspect', 'accuse', ...(hotspot?.type === 'inspect' ? ['share'] : [])].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActionType(type)}
                        className={`text-[8.5px] font-typewriter px-2 py-1 transition-colors border ${
                          actionType === type 
                            ? type === 'accuse' 
                              ? 'border-red-950 bg-red-950/20 text-red-500' 
                              : type === 'share'
                                ? 'border-blue-900 bg-blue-950/20 text-blue-500'
                                : 'border-amber-600 bg-amber-950/15 text-amber-500'
                            : 'border-stone-800 text-stone-500 hover:border-stone-600'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {actionType !== 'inspect' && (
                      <select 
                        value={actionTarget}
                        onChange={(e) => setActionTarget(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs p-1.5 outline-none focus:border-amber-600 font-typewriter"
                      >
                        <option value="" disabled>Select Target</option>
                        <optgroup label="Suspects">
                          {suspects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </optgroup>
                        <optgroup label="NPC Staff">
                          <option value="Receptionist">Receptionist (Mrs. Gable)</option>
                          <option value="Security Guard">Security Guard (Officer Vance)</option>
                          <option value="Police Officer">Police Officer (Deputy Sterling)</option>
                          <option value="Doctor">Doctor (Dr. Evelyn)</option>
                          <option value="Neighbor">Neighbor (Mr. Abernathy)</option>
                          <option value="Technician">Technician (Dexter)</option>
                          <option value="Journalist">Journalist (Sally Reed)</option>
                        </optgroup>
                      </select>
                    )}

                    {actionType === 'inspect' && (
                      <input
                        type="text"
                        placeholder="What to inspect? (e.g. Laptop, Desk)"
                        value={actionTarget}
                        onChange={(e) => setActionTarget(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs p-1.5 outline-none focus:border-amber-600 font-typewriter"
                      />
                    )}

                    {actionType !== 'inspect' && (
                      <input
                        type="text"
                        placeholder={actionType === 'accuse' ? "State reasoning..." : "What do you want to say?"}
                        value={actionContent}
                        onChange={(e) => setActionContent(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 text-stone-200 text-xs p-1.5 outline-none focus:border-amber-600 font-typewriter"
                      />
                    )}

                    <button 
                      type="submit"
                      disabled={submitting || myChar?.actionsRemaining <= 0}
                      className="w-full bg-amber-800 text-stone-100 py-1.5 hover:bg-amber-700 disabled:opacity-50 transition-all font-typewriter text-[9px] rounded-sm active:scale-95"
                    >
                      {myChar?.actionsRemaining <= 0 ? "NO ACTIONS REMAINING" : "SUBMIT ACTION"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Emergency Button Prompt Overlay */}
            {phase === "investigation" && hotspot?.type === 'emergency' && (
              <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-50">
                <button 
                  onClick={handleEmergencyMeeting}
                  disabled={myChar?.emergencyMeetingsRemaining <= 0}
                  className={`flex flex-col items-center gap-1 font-bold py-4 px-8 rounded-full border-4 shadow-[0_8px_0_0_rgba(0,0,0,1)] active:shadow-[0_0px_0_0_rgba(0,0,0,1)] active:translate-y-2 transition-all ${
                    myChar?.emergencyMeetingsRemaining > 0 
                      ? 'bg-red-500 hover:bg-red-400 text-white border-red-800 shadow-[0_8px_0_0_#991b1b] animate-pulse'
                      : 'bg-stone-500 text-stone-300 border-stone-700 opacity-80 cursor-not-allowed'
                  }`}
                >
                  <AlertOctagon className="w-8 h-8" />
                  <span className="text-sm tracking-wider">
                    {myChar?.emergencyMeetingsRemaining > 0 ? "CALL EMERGENCY MEETING" : "NO MEETINGS LEFT"}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const MainArea = () => {
    if (phase === 'voting') {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-[color:var(--color-bg-base)] text-center">
          <div className="max-w-md border border-[color:var(--color-border-hairline-strong)] bg-[color:var(--color-bg-elevated)] p-8">
            <span className="tracked-caps text-[10px] text-[color:var(--color-accent-blood)] font-bold">Phase: Accusation Voting</span>
            <h2 className="font-serif-display text-3xl mt-4 text-[color:var(--color-text-primary)]">Cast Your Accusation</h2>
            <p className="text-xs text-[color:var(--color-text-secondary)] mt-2 leading-relaxed">
              Read the timeline, compare dossiers, and discuss. Choose the suspect you believe is the murderer.
            </p>
            {voted ? (
              <div className="mt-8">
                <span className="text-sm tracked-caps px-4 py-2 bg-[rgba(113,26,36,0.15)] text-[color:var(--color-accent-blood-hover)] border border-[color:var(--color-accent-blood)]">
                  Vote Cast. Awaiting other investigators...
                </span>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <select
                  value={myVote}
                  onChange={(e) => setMyVote(e.target.value)}
                  className="w-full bg-[color:var(--color-bg-base)] border border-[color:var(--color-border-hairline)] text-[color:var(--color-text-primary)] text-sm p-3 outline-none focus:border-[color:var(--color-accent-blood)]"
                >
                  <option value="">-- Choose Suspect --</option>
                  {suspects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button
                  onClick={handleVoteSubmit}
                  disabled={!myVote}
                  className="w-full bg-[color:var(--color-accent-blood)] text-[color:var(--color-text-primary)] py-3 tracked-caps text-xs hover:bg-[color:var(--color-accent-blood-hover)] disabled:opacity-50 transition-colors"
                >
                  Submit Vote
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (phase === 'result') {
      return (
        <div className="h-full flex flex-col bg-[color:var(--color-bg-base)] overflow-y-auto p-6 md:p-12 pb-24 relative">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="border-b border-[color:var(--color-border-hairline-strong)] pb-6">
              <span className="tracked-caps text-[10px] text-[color:var(--color-accent-blood)] font-bold font-semibold">Case Closed</span>
              <h1 className="font-serif-display text-4xl mt-3 text-[color:var(--color-text-primary)]">The Game Master's Reveal</h1>
            </div>
            <div className="prose prose-invert text-[color:var(--color-text-secondary)] leading-relaxed font-serif text-md space-y-4 whitespace-pre-line">
              {finalReveal || "Generating case file reveal..."}
            </div>
            <div className="pt-8 flex gap-4">
              <Link to="/" className="inline-block border border-[color:var(--color-border-hairline)] text-xs tracked-caps px-6 py-3 hover:bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-primary)] transition-colors">
                Return to Title Screen
              </Link>
              {session?.hostId === playerId && (
                <button 
                  onClick={handlePlayAgain}
                  className="inline-block border border-[color:var(--color-accent-blood)] text-xs tracked-caps px-6 py-3 bg-[color:var(--color-accent-blood)] text-[color:var(--color-text-primary)] hover:bg-[color:var(--color-accent-blood-hover)] transition-colors">
                  Play Again (New Story)
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col relative">
        {session.hostId === playerId && (
          <div className="bg-[color:var(--color-bg-elevated)] border-b border-[color:var(--color-border-hairline)] px-4 py-2 flex items-center justify-between">
            <span className="text-[10px] tracked-caps text-[color:var(--color-text-tertiary)]">Lead Investigator Dashboard</span>
            <button
              onClick={handleStartVoting}
              className="text-[10px] tracked-caps bg-[color:var(--color-accent-blood)] text-[color:var(--color-text-primary)] px-3 py-1.5 hover:bg-[color:var(--color-accent-blood-hover)] transition-colors"
            >
              Start Accusation Vote
            </button>
          </div>
        )}
        <LogPanel />
      </div>
    );
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-[color:var(--color-bg-base)] relative">
      
      {/* Emergency Meeting Overlay banner alerts */}
      {meetingAlert && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-950/90 border border-red-500 text-red-100 font-typewriter text-xs px-6 py-3 rounded shadow-2xl z-50 animate-bounce flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-500 animate-pulse" />
          {meetingAlert}
        </div>
      )}

      {/* Eliminated Role reveal snippet modal */}
      {eliminatedSnippet && (
        <div className="absolute inset-0 bg-black/85 flex items-center justify-center z-50 animate-fade-in">
          <div className="border border-red-900 bg-stone-900 p-8 max-w-sm text-center shadow-2xl rounded-sm">
            <span className="font-typewriter text-[9px] text-red-500 font-bold tracking-wider">ELIMINATION DEBRIEFING</span>
            <h2 className="font-serif-display text-3xl text-amber-50 mt-4 leading-tight">ROLE DISCLOSURE</h2>
            <p className="font-courier text-red-400 mt-2 text-xl font-bold">{eliminatedSnippet.name}</p>
            {eliminatedSnippet.occupation !== "spectator" ? (
              <div className="mt-4 space-y-2 border-t border-stone-800 pt-4">
                <p className="text-xs text-stone-300 font-typewriter">Occupation: {eliminatedSnippet.occupation}</p>
                <p className="text-xs text-amber-500/90 font-courier italic">"{eliminatedSnippet.privateSecret}"</p>
                <p className="text-sm font-bold text-red-500 font-typewriter uppercase mt-4 animate-pulse">
                  {eliminatedSnippet.isMurderer ? "IS THE MURDERER!" : "IS INNOCENT"}
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-400 font-typewriter mt-4">Role details withheld under room policy.</p>
            )}
          </div>
        </div>
      )}

      {/* Top Header bar with round timer, meetings, and mute/unmute */}
      <div className="h-14 shrink-0 bg-stone-900 border-b border-stone-850 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <span className="font-typewriter text-[11px] text-amber-200/60 uppercase">
            CASE FILE: {code}
          </span>
          <span className="text-[10px] bg-stone-800 text-stone-400 px-2 py-0.5 font-typewriter">
            ROUND {roundNumber}
          </span>
          {phase === 'discussion' && (
            <span className="text-[10px] bg-red-950/30 border border-red-900/30 text-red-500 px-2 py-0.5 font-typewriter animate-pulse">
              🚨 DISCUSSION ACTIVE
            </span>
          )}
        </div>
        
        {/* Pacing timer countdown */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[8px] font-typewriter text-stone-500 uppercase tracking-widest leading-none">
              {phase === 'discussion' ? 'DISCUSSION TIME' : 'TIME REMAINING'}
            </span>
            <span className={`text-sm font-mono mt-0.5 tracking-wider ${
              timeLeft <= 10 
                ? 'text-red-500 font-bold animate-pulse' 
                : timeLeft <= 60 
                  ? 'text-amber-500' 
                  : 'text-amber-100/85'
            }`}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          </div>

          {/* Action indicator */}
          {myChar && (
            <div className="hidden sm:flex flex-col items-end border-l border-stone-800 pl-6">
              <span className="text-[8px] font-typewriter text-stone-500 uppercase tracking-widest leading-none">
                ACTIONS LEFT
              </span>
              <span className="text-xs font-mono mt-0.5 text-amber-200/90 font-bold">
                {myChar.actionsRemaining} / 3
              </span>
            </div>
          )}

          {/* Emergency Meeting Trigger button */}
          {myChar && (
            <button
              onClick={handleEmergencyMeeting}
              disabled={myChar.emergencyMeetingsRemaining <= 0 || phase !== 'investigation'}
              className={`text-[9px] font-typewriter px-3 py-1.5 rounded border transition-all ${
                myChar.emergencyMeetingsRemaining <= 0 || phase !== 'investigation'
                  ? 'border-stone-800 text-stone-600 cursor-not-allowed opacity-50 bg-transparent'
                  : 'border-red-900 bg-red-950/20 text-red-500 hover:bg-red-900 hover:text-white cursor-pointer active:scale-95'
              }`}
            >
              🚨 EMERGENCY MEETING ({myChar.emergencyMeetingsRemaining})
            </button>
          )}

          {/* Voice status controls */}
          <div className="flex items-center gap-2 border-l border-stone-800 pl-4">
            <button
              onClick={handleToggleMic}
              title={micEnabled ? "Mute Mic" : "Unmute Mic"}
              className={`transition-colors p-1 ${micEnabled ? 'text-amber-200 hover:text-amber-300' : 'text-red-500 hover:text-red-400'}`}
            >
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>

            <button
              onClick={handleToggleDeafen}
              title={isDeafened ? "Undeafen Audio" : "Deafen Audio"}
              className={`transition-colors p-1 ${isDeafened ? 'text-red-500 hover:text-red-400' : 'text-stone-500 hover:text-stone-300'}`}
            >
              <Headphones className="w-4 h-4" />
            </button>

            {/* Sound FX Mute button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-stone-500 hover:text-stone-300 transition-colors p-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout split area */}
      <div className="flex-1 flex overflow-hidden">
        {/* --- DESKTOP VIEW --- */}
        <div className="hidden md:flex w-full h-full relative">
          
          <div className="flex-1 min-w-0 w-full h-full relative z-10">
            {renderMainArea()}
          </div>
          
          {/* Hamburger buttons */}
          <button 
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)} 
            className="absolute top-4 left-4 z-40 bg-white border-2 border-stone-800 rounded-lg p-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-stone-100 transition-all text-stone-800"
          >
            <PanelRight className="w-6 h-6 rotate-180" />
          </button>
          
          <button 
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)} 
            className="absolute top-4 right-4 z-40 bg-white border-2 border-stone-800 rounded-lg p-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-stone-100 transition-all text-stone-800"
          >
            <PanelRight className="w-6 h-6" />
          </button>
          
          {/* Left Sidebar */}
          <div className={`absolute top-0 bottom-0 left-0 w-[300px] z-30 transition-transform duration-300 transform ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-[4px_0_0_0_rgba(0,0,0,1)] border-r-4 border-stone-800 bg-white`}>
            {renderSuspectsPanel()}
          </div>

          {/* Right Sidebar */}
          <div className={`absolute top-0 bottom-0 right-0 w-[300px] z-30 transition-transform duration-300 transform ${rightSidebarOpen ? 'translate-x-0' : 'translate-x-full'} shadow-[-4px_0_0_0_rgba(0,0,0,1)] border-l-4 border-stone-800 bg-white`}>
            {renderEvidencePanel()}
          </div>

        </div>

        {/* --- MOBILE VIEW --- */}
        <div className="flex md:hidden flex-col w-full h-full">
          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'suspects' && renderSuspectsPanel()}
            {activeTab === 'log' && renderMainArea()}
            {activeTab === 'evidence' && renderEvidencePanel()}
          </div>

          {/* Mobile Tab Bar */}
          <div className="h-16 shrink-0 bg-[color:var(--color-bg-elevated)] border-t border-[color:var(--color-border-hairline-strong)] flex">
            <button 
              onClick={() => setActiveTab('suspects')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'suspects' ? 'text-[color:var(--color-text-primary)]' : 'text-[color:var(--color-text-tertiary)]'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[9px] tracked-caps">Suspects</span>
            </button>
            <button 
              onClick={() => setActiveTab('log')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'log' ? 'text-[color:var(--color-text-primary)]' : 'text-[color:var(--color-text-tertiary)]'}`}
            >
              <Activity className="w-5 h-5" />
              <span className="text-[9px] tracked-caps">Investigate</span>
            </button>
            <button 
              onClick={() => setActiveTab('evidence')}
              className={`flex-1 flex flex-col items-center justify-center gap-1 ${activeTab === 'evidence' ? 'text-[color:var(--color-text-primary)]' : 'text-[color:var(--color-text-tertiary)]'}`}
            >
              <Database className="w-5 h-5" />
              <span className="text-[9px] tracked-caps">Clues</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
