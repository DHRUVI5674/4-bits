import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { joinRoom } from "@/lib/rooms";
import { getStoredName, setStoredName } from "@/lib/player-id";

import wallImage from "@/assets/the great wall.png";

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
      const result = await joinRoom({ code, name });
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

  return (
    <main 
      className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-16"
      style={{
        backgroundImage: `linear-gradient(rgba(10,8,9,0.85), rgba(10,8,9,0.85)), url("${wallImage}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="mx-auto max-w-lg">
        <Link
          to="/"
          className="tracked-caps text-[10px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
          
          ← Back
        </Link>

        <div className="mt-8">
          <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
            Existing Case File
          </span>
          <h1 className="font-serif-display mt-2 text-4xl md:text-5xl text-[color:var(--color-text-primary)]">
            Join Room
          </h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-10 border p-8 md:p-10"
          style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: "var(--color-border-hairline-strong)"
          }}>
          
          <label className="block">
            <span className="tracked-caps block text-[11px] text-[color:var(--color-text-secondary)]">
              Case Code
            </span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="——————"
              className="font-serif-display mt-2 w-full border-0 border-b bg-transparent px-0 py-2 text-3xl tracking-[0.5em] text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-accent-blood)]"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required />
            
          </label>

          <label className="mt-8 block">
            <span className="tracked-caps block text-[11px] text-[color:var(--color-text-secondary)]">
              Your Investigator Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Detective Marlow"
              maxLength={40}
              className="mt-2 w-full border-0 border-b bg-transparent px-0 py-2 text-lg text-[color:var(--color-text-primary)] outline-none focus:border-[color:var(--color-accent-blood)]"
              style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
              required />
            
          </label>

          {error &&
          <p className="mt-8 text-sm text-[color:var(--color-accent-blood-hover)]">{error}</p>
          }

          <div className="mt-10 flex items-center justify-end border-t border-[color:var(--color-border-hairline)] pt-6">
            <button
              type="submit"
              disabled={!canSubmit}
              className="tracked-caps px-6 py-3 text-[11px] transition-colors"
              style={{
                backgroundColor: canSubmit ? "var(--color-accent-blood)" : "transparent",
                color: canSubmit ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
                border: `1px solid ${canSubmit ? "var(--color-accent-blood)" : "var(--color-border-hairline)"}`,
                cursor: canSubmit ? "pointer" : "not-allowed"
              }}>
              
              {submitting ? "Entering…" : "Step Inside"}
            </button>
          </div>
        </form>
      </div>
    </main>);

}