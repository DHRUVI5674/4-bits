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
import { Search, Send, User, MapPin, Database, ChevronRight, Activity } from "lucide-react";

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

  // Phase & Voting State
  const [phase, setPhase] = useState("investigation");
  const [myVote, setMyVote] = useState("");
  const [voted, setVoted] = useState(false);
  const [finalReveal, setFinalReveal] = useState("");

  // Action State
  const [actionType, setActionType] = useState("ask");
  const [actionTarget, setActionTarget] = useState("");
  const [actionContent, setActionContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Mobile Tab State
  const [activeTab, setActiveTab] = useState("log");

  const logEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        setFinalReveal(sessionData.finalReveal || "");
        const alreadyVoted = (sessionData.votes || []).some(v => v.playerId === playerId);
        setVoted(alreadyVoted);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code, playerId]);

  useEffect(() => {
    if (!code || !playerId) return;

    const API_BASE = import.meta.env.VITE_API_URL || window.location.origin;
    const socket = io(API_BASE, {
      auth: { roomCode: code, playerId }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-room");
    });

    socket.on("log-updated", (newLogs) => {
      setLog(newLogs);
    });

    socket.on("clues-updated", (newClues) => {
      setClues(newClues);
    });

    socket.on("phase-updated", async (newPhase) => {
      setPhase(newPhase);
      const freshSession = await getSessionDetails(code, true);
      setFinalReveal(freshSession.finalReveal || "");
      const alreadyVoted = (freshSession.votes || []).some(v => v.playerId === playerId);
      setVoted(alreadyVoted);
    });

    return () => {
      socket.disconnect();
    };
  }, [code, playerId]);

  // Auto-scroll to bottom of log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  const handleActionSubmit = async (e) => {
    e.preventDefault();
    if (submitting || (!actionTarget && actionType !== "inspect") || (actionType !== "inspect" && !actionContent)) return;

    setSubmitting(true);
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)]">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)] animate-pulse">
          Loading investigation board...
        </span>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)] px-6">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
          Unable to load the case session.
        </span>
      </main>
    );
  }

  // --- Components ---

  const SuspectsPanel = () => (
    <div className="h-full flex flex-col border-r border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-base)]">
      <div className="p-4 border-b border-[color:var(--color-border-hairline)]">
        <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">Persons of Interest</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {suspects.map(s => (
          <div key={s.id} className="p-3 border border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-elevated)]">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-serif-display text-lg text-[color:var(--color-text-primary)]">{s.name}</p>
                <p className="text-xs text-[color:var(--color-text-secondary)] italic">{s.role}</p>
              </div>
              {s.isPlayer && (
                <span className="text-[9px] tracked-caps bg-[color:var(--color-border-hairline)] px-2 py-1">Player</span>
              )}
            </div>
            {phase === "investigation" && (
              <div className="mt-4 flex gap-2 flex-wrap">
                <button 
                  onClick={() => { setActionType("ask"); setActionTarget(s.name); setActiveTab("log"); }}
                  className="text-[10px] tracked-caps border border-[color:var(--color-border-hairline)] px-2 py-1 hover:bg-[color:var(--color-border-hairline)] transition-colors"
                >
                  Ask
                </button>
                <button 
                  onClick={() => { setActionType("request"); setActionTarget(s.name); setActiveTab("log"); }}
                  className="text-[10px] tracked-caps border border-[color:var(--color-border-hairline)] px-2 py-1 hover:bg-[color:var(--color-border-hairline)] transition-colors"
                >
                  Request
                </button>
                <button 
                  onClick={() => { setActionType("accuse"); setActionTarget(s.name); setActiveTab("log"); }}
                  className="text-[10px] tracked-caps border border-[color:var(--color-accent-blood)] text-[color:var(--color-accent-blood)] px-2 py-1 hover:bg-[rgba(113,26,36,0.1)] transition-colors"
                >
                  Accuse
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const EvidencePanel = () => (
    <div className="h-full flex flex-col border-l border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-base)]">
      <div className="p-4 border-b border-[color:var(--color-border-hairline)]">
        <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">Evidence & Clues</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {clues.length === 0 && (
          <p className="text-xs text-[color:var(--color-text-tertiary)] text-center py-8">No evidence discovered yet.</p>
        )}
        {clues.map(c => (
          <div key={c.id} className="p-3 border border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-elevated)] tw-animate-in tw-zoom-in-95 tw-duration-300">
            <p className="font-serif-display text-md text-[color:var(--color-text-primary)]">{c.title}</p>
            <p className="text-xs text-[color:var(--color-text-secondary)] mt-2">{c.description}</p>
          </div>
        ))}
      </div>
      
      {/* Live Players Strip */}
      <div className="p-4 border-t border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-elevated)]">
        <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)] block mb-3">Active Investigators</span>
        <div className="flex flex-wrap gap-3">
          {players.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.active ? 'bg-green-700' : 'bg-gray-500'}`} />
              <span className="text-xs text-[color:var(--color-text-secondary)]">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const LogPanel = () => (
    <div className="h-full flex flex-col bg-[color:var(--color-bg-base)] relative">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32 md:pb-40">
        {log.map((entry, index) => (
          <div key={entry.messageId || index} className={`max-w-xl tw-animate-in tw-fade-in tw-slide-in-from-bottom-2 tw-duration-300 ${entry.type === 'player' ? 'ml-auto text-right' : ''}`}>
            <span className="tracked-caps text-[9px] text-[color:var(--color-text-tertiary)] block mb-1">
              {entry.author}
            </span>
            <div className={`p-4 inline-block ${entry.type === 'player' ? 'border border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-elevated)]' : ''}`}>
              <p className={`text-sm leading-relaxed ${entry.type === 'ai' ? 'font-serif-display text-lg text-[color:var(--color-text-primary)]' : 'text-[color:var(--color-text-secondary)]'}`}>
                {entry.text}
              </p>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* Action Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-[color:var(--color-border-hairline-strong)] bg-[color:var(--color-bg-elevated)] p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <form onSubmit={handleActionSubmit} className="max-w-3xl mx-auto space-y-3">
          
          {/* Action Types */}
          <div className="flex flex-wrap gap-2 mb-2">
            {['ask', 'request', 'inspect', 'accuse'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setActionType(type)}
                className={`text-[10px] tracked-caps px-3 py-1.5 transition-colors border ${
                  actionType === type 
                    ? type === 'accuse' 
                      ? 'border-[color:var(--color-accent-blood)] bg-[rgba(113,26,36,0.1)] text-[color:var(--color-accent-blood)]' 
                      : 'border-[color:var(--color-text-primary)] bg-[color:var(--color-text-primary)] text-[color:var(--color-bg-base)]'
                    : 'border-[color:var(--color-border-hairline)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-text-primary)]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {actionType !== 'inspect' && (
              <select 
                value={actionTarget}
                onChange={(e) => setActionTarget(e.target.value)}
                className="bg-transparent border border-[color:var(--color-border-hairline)] text-[color:var(--color-text-primary)] text-xs p-2 md:p-3 outline-none focus:border-[color:var(--color-text-secondary)]"
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
                placeholder="What to inspect? (e.g. Laptop, Desk, Body, Phone, Documents)"
                value={actionTarget}
                onChange={(e) => setActionTarget(e.target.value)}
                className="flex-1 bg-transparent border border-[color:var(--color-border-hairline)] text-[color:var(--color-text-primary)] text-sm p-2 md:p-3 outline-none focus:border-[color:var(--color-text-secondary)] placeholder-[color:var(--color-text-tertiary)]"
              />
            )}

            {actionType !== 'inspect' && (
              <input
                type="text"
                placeholder={actionType === 'accuse' ? "State your reasoning..." : "What do you want to say?"}
                value={actionContent}
                onChange={(e) => setActionContent(e.target.value)}
                className="flex-1 bg-transparent border border-[color:var(--color-border-hairline)] text-[color:var(--color-text-primary)] text-sm p-2 md:p-3 outline-none focus:border-[color:var(--color-text-secondary)] placeholder-[color:var(--color-text-tertiary)]"
              />
            )}

            <button 
              type="submit"
              disabled={submitting}
              className="bg-[color:var(--color-text-primary)] text-[color:var(--color-bg-base)] p-2 md:p-3 flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );

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
            <div className="pt-8">
              <Link to="/" className="inline-block border border-[color:var(--color-border-hairline)] text-xs tracked-caps px-6 py-3 hover:bg-[color:var(--color-bg-elevated)] text-[color:var(--color-text-primary)] transition-colors">
                Return to Title Screen
              </Link>
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
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden bg-[color:var(--color-bg-base)]">
      
      {/* --- DESKTOP VIEW --- */}
      <div className="hidden md:flex w-full h-full">
        <div className="w-[300px] shrink-0">
          <SuspectsPanel />
        </div>
        <div className="flex-1 min-w-0">
          <MainArea />
        </div>
        <div className="w-[300px] shrink-0">
          <EvidencePanel />
        </div>
      </div>

      {/* --- MOBILE VIEW --- */}
      <div className="flex md:hidden flex-col w-full h-full">
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'suspects' && <SuspectsPanel />}
          {activeTab === 'log' && <MainArea />}
          {activeTab === 'evidence' && <EvidencePanel />}
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
  );
}
