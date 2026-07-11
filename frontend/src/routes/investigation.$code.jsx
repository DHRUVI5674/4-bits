import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { io } from "socket.io-client";
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

    const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
    const sock = io(API_BASE, {
      auth: { roomCode: code, playerId }
    });
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
    });

    sock.on("player:suspect:updated", (data) => {
      setSuspicionSignals((prev) => ({
        ...prev,
        [data.playerId]: data.suspectId
      }));
    });

    return () => {
      sock.disconnect();
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
      await submitVote(code, playerId, myVote);
      setVoted(true);
    } catch (err) {
      console.error("Failed to submit vote:", err);
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

  const renderSuspectsPanel = () => (
    <div className="h-full flex flex-col border-r border-stone-850 bg-[color:var(--color-bg-base)]">
      <div className="p-4 border-b border-stone-850">
        <span className="font-typewriter text-[10px] text-[color:var(--color-text-tertiary)]">Persons of Interest</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {suspects.map(s => {
          const suspectors = Object.keys(suspicionSignals).filter(pId => suspicionSignals[pId] === s.name);
          const suspectorNames = suspectors.map(pId => {
            const p = players.find(player => player.id === pId);
            return p ? p.name : "Anonymous";
          });

          return (
            <div key={s.id} className="p-3 border border-stone-850 bg-stone-900/40 relative">
              {/* Suspicion indicators */}
              {suspectorNames.length > 0 && (
                <div className="absolute top-2 right-2 flex gap-1 items-center">
                  <span className="text-[8px] font-typewriter text-red-500 font-bold">SUSPECTED:</span>
                  <div className="flex -space-x-1">
                    {suspectorNames.map((name, idx) => (
                      <div 
                        key={idx} 
                        title={name} 
                        className="w-2 h-2 rounded-full bg-red-600 border border-stone-900" 
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <p className="font-serif-display text-lg text-[color:var(--color-text-primary)]">{s.name}</p>
                  <p className="text-xs text-[color:var(--color-text-secondary)] italic font-courier">{s.role}</p>
                </div>
                {s.isPlayer && (
                  <span className="text-[9px] font-typewriter bg-stone-800 text-stone-400 px-2 py-0.5 rounded-sm">Player</span>
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

  const renderEvidencePanel = () => (
    <div className="h-full flex flex-col border-l border-stone-850 bg-[color:var(--color-bg-base)]">
      <div className="p-4 border-b border-stone-850">
        <span className="font-typewriter text-[10px] text-[color:var(--color-text-tertiary)]">Evidence & Clues</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {clues.length === 0 && (
          <p className="text-xs text-[color:var(--color-text-tertiary)] text-center py-8 font-typewriter">No evidence discovered yet.</p>
        )}
        {clues.map(c => (
          <div key={c.id} className="p-3 border border-stone-850 bg-stone-900/40">
            <p className="font-serif-display text-md text-amber-50/90">{c.title}</p>
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
              sceneKey={isMeetingActive ? "MeetingScene" : "InvestigationScene"}
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
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-stone-900/95 border border-amber-600/70 px-5 py-3 shadow-2xl rounded-md pointer-events-none z-10 flex flex-col items-center">
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider font-typewriter">
                {hotspot.type === 'suspect' ? `Near Suspect: ${hotspot.name}` : `Near Hotspot: ${hotspot.name}`}
              </span>
              <span className="text-[9px] text-stone-400 mt-1 font-courier text-center">
                Use the Ask/Inspect form at the bottom of the right drawer to act.
              </span>
            </div>
          )}

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
                <div className="flex-1 p-2 overflow-y-auto">
                  <EvidenceBoard clues={clues} suspects={suspects} />
                </div>
              )}

              {activeView === "chat" && (
                <div className="flex-1 flex flex-col overflow-hidden">
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
                              <span className="font-typewriter text-[7.5px] text-stone-500 block mb-0.5">
                                {msg.senderName}
                              </span>
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
                  
                  <form onSubmit={handleSendChatMessage} className="p-2 border-t border-stone-850 bg-stone-950/80 flex gap-2 shrink-0">
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
            {activeView === "log" && phase === "investigation" && (
              <div className="absolute bottom-0 left-0 right-0 border-t border-stone-850 bg-stone-950 p-4 shadow-xl z-20">
                <form onSubmit={handleActionSubmit} className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {['ask', 'request', 'inspect', 'accuse'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActionType(type)}
                        className={`text-[8.5px] font-typewriter px-2 py-1 transition-colors border ${
                          actionType === type 
                            ? type === 'accuse' 
                              ? 'border-red-950 bg-red-950/20 text-red-500' 
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
          </div>
        )}
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
        <div className="hidden md:flex w-full h-full">
          <div className="w-[300px] shrink-0">
            {renderSuspectsPanel()}
          </div>
          <div className="flex-1 min-w-0">
            {renderMainArea()}
          </div>
          <div className="w-[300px] shrink-0">
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
