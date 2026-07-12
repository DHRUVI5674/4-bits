import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createRoom, MODE_LABELS } from "@/lib/rooms";
import { setStoredName, getStoredName, getAppearance } from "@/lib/player-id";
import { FileText, User, Users, Compass, ShieldAlert, ArrowLeft, Plus } from "lucide-react";
import LandingCanvas from "@/components/LandingCanvas";
import { getReduceMotion } from "@/lib/preferences";

export const Route = createFileRoute("/create-room")({
  component: CreateRoom
});

const MODES = ["classic_mansion", "cyber_crime", "haunted_house"];

function CreateRoom() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState(getStoredName());
  const [maxMembers, setMaxMembers] = useState(5);
  const [maxRounds, setMaxRounds] = useState(3);
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(2);
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
        maxRounds,
        roundDurationMinutes,
        revealPolicy,
        hostName: hostName.trim(),
        appearance: getAppearance()
      });
      navigate({ to: "/lobby/$code", params: { code } });
    } catch (err) {
      console.error(err);
      setError("Could not open the case file. Try again in a moment.");
      setSubmitting(false);
    }
  };

  const reduceMotion = getReduceMotion();

  return (
    <main 
      className="min-h-[100dvh] bg-[color:var(--color-bg-base)] px-4 py-2 md:py-4 flex flex-col justify-center relative overflow-hidden"
    >
      <LandingCanvas reduceMotion={reduceMotion} focusRoom="bedroom" />

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
          <h1 className="font-serif-display mt-0.5 text-2xl md:text-4xl text-amber-50/95 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            Open New Inquiry
          </h1>
        </div>

        {/* Form panel styled as a dark pixel window */}
        <form
          onSubmit={onSubmit}
          className="mt-2 border-4 border-[#1a1113] bg-[#0a0809]/95 p-4 md:px-6 md:py-4 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] relative overflow-hidden"
        >
          {/* File Folder Top Notch Tab effect */}
          <div className="absolute top-0 left-8 px-4 py-0.5 bg-stone-800/80 border-b border-stone-950 font-typewriter text-[8px] text-stone-500 select-none">
            CLASSIFIED - ARCHIVE DEPT
          </div>

          {/* Decorative scanner line */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-accent-blood)] to-transparent opacity-40 animate-pulse" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Case Name Input */}
            <div className="relative group">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span className="font-typewriter text-[10px] tracking-wider text-red-300/60 typewriter-ink">
                  CASE NAME / INCIDENT TITLE
                </span>
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Ashford Manor Incident..."
                maxLength={60}
                className="w-full border-0 border-b bg-transparent px-0 py-1 text-base text-[color:var(--color-text-primary)] outline-none transition-all duration-300 focus:border-red-600 placeholder-stone-700 font-serif italic"
                style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
                required 
              />
            </div>

            {/* Investigator Name Input */}
            <div className="relative group">
              <div className="flex items-center gap-2 mb-1.5">
                <User className="w-3.5 h-3.5 text-red-600" />
                <span className="font-typewriter text-[10px] tracking-wider text-red-300/60 typewriter-ink">
                  YOUR INVESTIGATOR NAME
                </span>
              </div>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Inspector Vale"
                maxLength={40}
                className="w-full border-0 border-b bg-transparent px-0 py-1 text-base text-[color:var(--color-text-primary)] outline-none transition-all duration-300 focus:border-red-600 placeholder-stone-700 font-typewriter"
                style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Max Investigators Selection */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-3.5 h-3.5 text-red-600" />
                <span className="font-['VT323'] text-[10px] tracking-wider text-red-300/60 typewriter-ink">
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
                      className={`flex-1 py-1.5 font-['VT323'] text-xl transition-colors relative border-4 ${
                        active ? 'bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)]' : 'bg-[#151314] border-[#1a1113] text-[#9c9186] hover:bg-[#201d1f]'
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
              <p className="mt-1 text-[8px] text-stone-500 italic font-['VT323']">
                Min 3 investigators. Max 5.
              </p>
            </div>

            {/* Reveal Policy Selection */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                <span className="font-['VT323'] text-[10px] tracking-wider text-red-300/60 typewriter-ink">
                  REVEAL ELIMINATED ROLE
                </span>
              </div>
              <div className="flex gap-2">
                {[
                  { value: "immediate", label: "Immediately" },
                  { value: "final_only", label: "At Final Reveal" }
                ].map((policy) => {
                  const active = revealPolicy === policy.value;
                  return (
                    <button
                      type="button"
                      key={policy.value}
                      onClick={() => setRevealPolicy(policy.value)}
                      className={`flex-1 py-1.5 font-['VT323'] text-lg transition-colors relative border-4 ${
                        active ? 'bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)]' : 'bg-[#151314] border-[#1a1113] text-[#9c9186] hover:bg-[#201d1f]'
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
              <p className="mt-1 text-[8px] text-stone-500 italic font-['VT323']">
                When is an eliminated player's role shown?
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            {/* Max Rounds Selection */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-red-600" />
                <span className="font-['VT323'] text-[10px] tracking-wider text-red-300/60 typewriter-ink">
                  TOTAL ROUNDS
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = maxRounds === n;
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setMaxRounds(n)}
                      className={`flex-1 py-1 font-['VT323'] text-xl transition-colors relative border-4 ${
                        active ? 'bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)]' : 'bg-[#151314] border-[#1a1113] text-[#9c9186] hover:bg-[#201d1f]'
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
            </div>

            {/* Round Duration Selection */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-3.5 h-3.5 text-red-600" />
                <span className="font-['VT323'] text-[10px] tracking-wider text-red-300/60 typewriter-ink">
                  ROUND MINUTES
                </span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = roundDurationMinutes === n;
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => setRoundDurationMinutes(n)}
                      className={`flex-1 py-1 font-['VT323'] text-xl transition-colors relative border-4 ${
                        active ? 'bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)]' : 'bg-[#151314] border-[#1a1113] text-[#9c9186] hover:bg-[#201d1f]'
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
            </div>
          </div>

          {/* Mystery Setting Card Grid */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-3.5 h-3.5 text-red-600" />
              <span className="font-['VT323'] text-[10px] tracking-wider text-red-300/60 typewriter-ink">
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
                    className={`border-4 p-2.5 text-left transition-colors relative ${
                      active ? 'bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)]' : 'bg-[#151314] border-[#1a1113] text-[#9c9186] hover:bg-[#201d1f]'
                    }`}
                  >
                    <span className="font-['VT323'] block text-sm text-white font-bold drop-shadow-md">
                      {MODE_LABELS[m]}
                    </span>
                    <span className="mt-1 block text-[9px] text-stone-500 leading-normal font-['VT323']">
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
              <p className="text-xs text-red-400 font-['VT323']">{error}</p>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-red-950/50 pt-3">
            <span className="font-['VT323'] text-[9px] text-stone-500 leading-tight max-w-[220px]">
              A unique digital case code will be assigned on startup.
            </span>
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full md:w-auto inline-flex justify-center items-center gap-2 font-['VT323'] px-5 py-2.5 text-lg md:text-xl transition-colors border-4 relative ${
                canSubmit 
                  ? "bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] hover:bg-[#a62631]" 
                  : "bg-[#151314] border-[#1a1113] text-stone-600 cursor-not-allowed"
              }`}
            >
              <Plus className="w-5 h-5 shrink-0" />
              {submitting ? "COMMISSIONING…" : "COMMISSION CASE"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}