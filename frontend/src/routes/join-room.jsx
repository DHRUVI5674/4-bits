import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { joinRoom } from "@/lib/rooms";
import { getStoredName, setStoredName, getAppearance } from "@/lib/player-id";

import LandingCanvas from "@/components/LandingCanvas";
import { getReduceMotion } from "@/lib/preferences";

export const Route = createFileRoute("/join-room")({
  component: JoinRoom
});

const ERROR_COPY = {
  not_found: "No case file matches that code.",
  full: "This investigation already has its full complement.",
  already_started: "This investigation is already underway. You cannot enter now."
};

function JoinRoom() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [name, setName] = useState(getStoredName());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = code.trim().length === 6 && name.trim().length >= 2 && !submitting;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      setStoredName(name.trim());
      const result = await joinRoom({ code, name, appearance: getAppearance() });
      if (!result.ok) {
        setError(ERROR_COPY[result.error]);
        setSubmitting(false);
        return;
      }
      navigate({ to: "/lobby/$code", params: { code: result.code } });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  const reduceMotion = getReduceMotion();

  return (
    <main 
      className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-16 relative overflow-hidden"
    >
      <LandingCanvas reduceMotion={reduceMotion} focusRoom="foyer" />
      <div className="mx-auto max-w-lg relative z-10">
        <Link
          to="/"
          className="font-['VT323'] text-xl text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
          ← Back
        </Link>

        <div className="mt-8">
          <span className="font-['VT323'] text-xl text-[color:var(--color-text-tertiary)] tracking-widest">
            Existing Case File
          </span>
          <h1 className="font-['VT323'] mt-2 text-5xl md:text-6xl text-[color:var(--color-text-primary)]" style={{ textShadow: '0px 4px 0px #0a0503' }}>
            Join Room
          </h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-10 border-4 border-[#1a1113] bg-[#0a0809]/95 p-8 md:p-10 shadow-[15px_15px_0px_rgba(0,0,0,0.8)]">
          
          <label className="block">
            <span className="font-['VT323'] block text-xl text-[color:var(--color-text-secondary)] tracking-widest">
              Case Code
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="——————"
              className="font-['VT323'] mt-2 w-full border-0 border-b bg-transparent px-0 py-2 text-4xl md:text-5xl tracking-[0.1em] md:tracking-[0.2em] text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-accent-blood)]"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required />
            
          </label>

          <label className="mt-8 block">
            <span className="font-['VT323'] block text-xl text-[color:var(--color-text-secondary)] tracking-widest">
              Your Investigator Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Detective Marlow"
              maxLength={40}
              className="font-['VT323'] mt-2 w-full border-0 border-b bg-transparent px-0 py-2 text-2xl text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-accent-blood)]"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required />
            
          </label>

          {error && (
            <p className="mt-6 text-red-500 font-['VT323'] text-xl">
              {error}
            </p>
          )}

          <div className="mt-12 flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full md:w-auto font-['VT323'] px-6 md:px-8 py-3 text-xl md:text-2xl transition-colors border-4 relative ${
                canSubmit 
                  ? "bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] hover:bg-[#a62631]" 
                  : "bg-[#151314] border-[#1a1113] text-stone-600 cursor-not-allowed"
              }`}
            >
              {submitting ? "Entering…" : "Enter Archive"}
            </button>
          </div>
        </form>
      </div>
    </main>);
}