import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createRoom, MODE_LABELS } from "@/lib/rooms";
import { setStoredName, getStoredName } from "@/lib/player-id";
import { FileText, User, Users, Compass, ShieldAlert, ArrowLeft, Plus } from "lucide-react";
import GameCanvas from "@/components/GameCanvas";

import wallImage from "@/assets/the great wall.png";

export const Route = createFileRoute("/create-room")({
  component: CreateRoom
});

const MODES = ["classic_mansion", "cyber_crime", "haunted_house"];

function CreateRoom() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState(getStoredName());
  const [maxMembers, setMaxMembers] = useState(5);
  const [mode, setMode] = useState("classic_mansion");
  const [revealPolicy, setRevealPolicy] = useState("immediate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = name.trim().length >= 2 && hostName.trim().length >= 2 && !submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      setStoredName(hostName.trim());
      const { code } = await createRoom({
        name: name.trim(),
        mode,
        maxMembers,
        revealPolicy,
        hostName: hostName.trim()
      });
      navigate({ to: "/lobby/$code", params: { code } });
    } catch (err) {
      console.error(err);
      setError("Could not open the case file. Try again in a moment.");
      setSubmitting(false);
    }
  };

  return (
    <main 
      className="min-h-screen bg-[color:var(--color-bg-base)] px-4 py-8 md:py-12 flex flex-col justify-center relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(10,8,9,0.95), rgba(10,8,9,0.95)), url("${wallImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Import noir typewriter fonts and keyframe anims */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Special+Elite&display=swap');
        
        .font-typewriter {
          font-family: 'Special Elite', 'Courier Prime', monospace;
        }
        
        .font-courier {
          font-family: 'Courier Prime', monospace;
        }

        .typewriter-ink {
          text-shadow: 0.5px 0.5px 0.5px rgba(245, 158, 11, 0.15), -0.5px -0.5px 0.5px rgba(239, 68, 68, 0.15);
        }

        .desk-lamp-glow {
          box-shadow: inset 0 0 100px rgba(251, 191, 36, 0.08);
        }

        .grain-overlay {
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          width: 200%;
          height: 200%;
          background: transparent url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E") repeat;
          animation: grain-shift 0.8s steps(4) infinite;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes grain-shift {
          0% { transform: translate(0, 0); }
          25% { transform: translate(-1%, 1%); }
          50% { transform: translate(1%, -1%); }
          75% { transform: translate(-1%, -1%); }
          100% { transform: translate(0, 0); }
        }

        .rubber-stamp {
          background-image: radial-gradient(circle, rgba(239, 68, 68, 0.12) 10%, transparent 80%);
          border-style: double;
          border-width: 3px;
        }

        @keyframes stamp-bounce {
          0% { transform: scale(1.4) rotate(-8deg); opacity: 0.4; }
          70% { transform: scale(0.96) rotate(2deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); }
        }

        .animate-stamp {
          animation: stamp-bounce 0.2s cubic-bezier(0.25, 0.8, 0.25, 1.2) forwards;
        }
      `}</style>

      {/* Film grain noise overlay */}
      <div className="grain-overlay" />

      {/* Cozy desk lamp lighting pool (vignette overlay) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none desk-lamp-glow" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.08) 0%, rgba(10, 8, 9, 0.94) 80%)'
        }}
      />

      {/* Background Phaser Canvas for walking character silhouettes */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none select-none">
        <GameCanvas
          sceneKey="LobbyScene"
          socket={null}
          roomCode="ARCHIVE"
          playerId="viewer"
          players={[]}
        />
      </div>

      {/* Noir String Pin-board details in far background corners */}
      <div className="absolute inset-0 pointer-events-none select-none z-0 opacity-15 overflow-hidden">
        {/* Top Left Pins & String */}
        <div className="absolute top-12 left-12 w-6 h-6 bg-red-900 rounded-full border-2 border-red-500/50 flex items-center justify-center shadow-lg" />
        <div className="absolute top-[52px] left-[70px] w-6 h-6 bg-stone-900 rounded-full border-2 border-stone-500/30 flex items-center justify-center shadow-lg" />
        <svg className="absolute top-14 left-14 w-40 h-20 text-red-700/60" viewBox="0 0 100 50">
          <line x1="2" y1="2" x2="80" y2="40" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1,1" />
        </svg>

        {/* Top Right Pin */}
        <div className="absolute top-16 right-16 w-6 h-6 bg-red-950 rounded-full border-2 border-red-500/40 flex items-center justify-center shadow-lg" />
      </div>

      <div className="mx-auto max-w-xl w-full z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-typewriter text-[10px] text-amber-200/40 hover:text-[color:var(--color-accent-blood)] transition-colors duration-200 mb-4 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform" />
          RETURN TO ARCHIVES
        </Link>

        <div>
          <span className="font-typewriter text-[10px] text-[color:var(--color-accent-blood)] font-bold tracking-widest typewriter-ink">
            CASE FILE INITIATION
          </span>
          <h1 className="font-serif-display mt-0.5 text-3xl md:text-4xl text-amber-50/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Open New Inquiry
          </h1>
        </div>

        {/* Form panel styled as a folder sheet stacked on desk (slight rotation) */}
        <form
          onSubmit={onSubmit}
          className="mt-4 border border-stone-800/80 bg-stone-900/65 backdrop-blur-md p-4 md:p-6 rounded shadow-[0_30px_60px_rgba(0,0,0,0.9),_0_0_20px_rgba(251,191,36,0.02)] relative overflow-hidden transform md:rotate-[0.3deg]"
        >
          {/* File Folder Top Notch Tab effect */}
          <div className="absolute top-0 left-8 px-4 py-0.5 bg-stone-800/80 border-b border-stone-950 font-typewriter text-[8px] text-stone-500 select-none">
            CLASSIFIED - ARCHIVE DEPT
          </div>

          {/* Decorative scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-accent-blood)] to-transparent opacity-40 animate-pulse" />

          {/* Case Name Input */}
          <div className="relative group">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-typewriter text-[10px] tracking-wider text-amber-200/60 typewriter-ink">
                CASE NAME / INCIDENT TITLE
              </span>
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Ashford Manor Incident..."
              maxLength={60}
              className="w-full border-0 border-b bg-transparent px-0 py-2 text-base text-[color:var(--color-text-primary)] outline-none transition-all duration-300 focus:border-amber-600 placeholder-stone-700 font-serif italic"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required 
            />
          </div>

          {/* Investigator Name Input */}
          <div className="mt-4 relative group">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-typewriter text-[10px] tracking-wider text-amber-200/60 typewriter-ink">
                YOUR INVESTIGATOR NAME
              </span>
            </div>
            <input
              type="text"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              placeholder="e.g. Inspector Vale"
              maxLength={40}
              className="w-full border-0 border-b bg-transparent px-0 py-1 text-base text-[color:var(--color-text-primary)] outline-none transition-all duration-300 focus:border-amber-600 placeholder-stone-700 font-typewriter"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required 
            />
          </div>

          {/* Max Investigators Selection */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-typewriter text-[10px] tracking-wider text-amber-200/60 typewriter-ink">
                TOTAL INVESTIGATORS
              </span>
            </div>
            <div className="flex gap-2">
              {[3, 4, 5].map((n) => {
                const active = maxMembers === n;
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setMaxMembers(n)}
                    className={`flex-1 py-1.5 font-typewriter text-base transition-all duration-200 border rounded relative ${
                      active ? 'rubber-stamp border-red-800 text-red-500 animate-stamp shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-stone-850 text-stone-400 bg-stone-900/20 hover:border-stone-700'
                    }`}
                  >
                    {active && (
                      <div className="absolute inset-0 border border-dashed border-red-700/30 m-0.5 rounded-sm pointer-events-none" />
                    )}
                    {n}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[9px] text-stone-500 italic font-courier">
              Minimum 3 investigators required to coordinate. Maximum 5.
            </p>
          </div>

          {/* Reveal Policy Selection */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-typewriter text-[10px] tracking-wider text-amber-200/60 typewriter-ink">
                REVEAL ELIMINATED ROLE
              </span>
            </div>
            <div className="flex gap-2">
              {[
                { value: "immediate", label: "Immediately" },
                { value: "final_only", label: "At Final Reveal Only" }
              ].map((policy) => {
                const active = revealPolicy === policy.value;
                return (
                  <button
                    type="button"
                    key={policy.value}
                    onClick={() => setRevealPolicy(policy.value)}
                    className={`flex-1 py-1.5 font-typewriter text-xs transition-all duration-200 border rounded relative ${
                      active ? 'rubber-stamp border-red-800 text-red-500 animate-stamp shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-stone-850 text-stone-400 bg-stone-900/20 hover:border-stone-700'
                    }`}
                  >
                    {active && (
                      <div className="absolute inset-0 border border-dashed border-red-700/30 m-0.5 rounded-sm pointer-events-none" />
                    )}
                    {policy.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[9px] text-stone-500 italic font-courier">
              Choose whether a player's role is revealed upon elimination vote, or kept hidden until the final case resolution.
            </p>
          </div>

          {/* Mystery Setting Card Grid */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-typewriter text-[10px] tracking-wider text-amber-200/60 typewriter-ink">
                MYSTERY SETTING
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              {MODES.map((m) => {
                const active = mode === m;
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setMode(m)}
                    className={`border p-2.5 text-left transition-all duration-300 rounded relative overflow-hidden md:hover:-translate-y-[1px] hover:shadow-[0_4px_8px_rgba(0,0,0,0.6)] ${
                      active ? 'border-red-900 bg-red-950/10 shadow-[inset_0_0_15px_rgba(239,68,68,0.08)]' : 'border-stone-900 bg-stone-950/30'
                    }`}
                  >
                    {active && (
                      // Wax Seal / stamp style badge
                      <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-700 rounded-full border border-red-500 shadow flex items-center justify-center scale-95 animate-stamp">
                        <div className="w-1 h-1 bg-red-950 rounded-full" />
                      </div>
                    )}
                    <span className="font-serif-display block text-sm text-[color:var(--color-text-primary)]">
                      {MODE_LABELS[m]}
                    </span>
                    <span className="mt-1 block text-[9px] text-stone-500 leading-normal font-courier">
                      {m === "classic_mansion" && "Estates, old money drawing rooms."}
                      {m === "cyber_crime" && "Cold servers, warmer motives."}
                      {m === "haunted_house" && "Unresolved residual cases."}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mt-8 flex items-center gap-2 bg-red-950/20 border border-red-900/30 p-4 rounded">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-400 font-courier">{error}</p>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="mt-5 flex items-center justify-between border-t border-stone-850 pt-4">
            <span className="font-typewriter text-[9px] text-stone-500 leading-tight max-w-[220px]">
              A unique digital case code will be assigned on startup.
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 font-typewriter px-5 py-2.5 text-[10px] transition-all duration-300 font-bold rounded border active:scale-95 shadow-md"
              style={{
                backgroundColor: canSubmit ? "var(--color-accent-blood)" : "transparent",
                color: canSubmit ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                borderColor: canSubmit ? "var(--color-accent-blood)" : "var(--color-border-hairline-strong)",
                cursor: canSubmit ? "pointer" : "not-allowed",
                boxShadow: canSubmit ? "0 4px 12px rgba(113, 26, 36, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)" : "none"
              }}
            >
              <Plus className="w-4 h-4 shrink-0" />
              {submitting ? "COMMISSIONING…" : "COMMISSION CASE"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}