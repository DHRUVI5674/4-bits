import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getMyCharacter } from "@/lib/character";
import { getPlayerId } from "@/lib/player-id";

export const Route = createFileRoute("/character-dossier/$code")({
  component: CharacterDossier
});

function CharacterDossier() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    let cancelled = false;
    const playerId = getPlayerId();
    
    (async () => {
      try {
        const charData = await getMyCharacter(code, playerId);
        if (cancelled) return;
        setCharacter(charData);
      } catch (err) {
        if (cancelled) return;
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)] px-6">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)] animate-pulse">
          Opening dossier...
        </span>
      </main>
    );
  }

  if (error || !character) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
            Error
          </span>
          <h1 className="font-serif-display mt-3 text-3xl text-[color:var(--color-text-primary)]">
            Dossier Not Found
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-text-secondary)]">
            We could not retrieve your character information for this case.
          </p>
          <div className="mt-8">
            <Link
              to={`/lobby/${code}`}
              className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
              ← Return to Lobby
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { identity, background, secret, objective, relationships } = character;

  const getSpritePath = (occupation = "") => {
    const occ = occupation.toLowerCase();
    if (occ.includes("conductor") || occ.includes("orchestra") || occ.includes("music")) return "/sprites/conductor.png";
    if (occ.includes("doctor") || occ.includes("medical")) return "/sprites/doctor.png";
    if (occ.includes("heir") || occ.includes("aristocrat") || occ.includes("wealthy") || occ.includes("disinherited")) return "/sprites/heir.png";
    if (occ.includes("steward") || occ.includes("butler") || occ.includes("servant") || occ.includes("secretary")) return "/sprites/steward.png";
    return "/sprites/detective.png";
  };

  return (
    <main className="min-h-screen bg-[color:var(--color-bg-base)] px-4 py-8 md:px-6 md:py-16">
      <div className="mx-auto max-w-2xl tw-animate-in tw-fade-in tw-slide-in-from-bottom-4 tw-duration-1000 @media(prefers-reduced-motion):tw-animate-none">
        
        {/* Header (matches lobby) */}
        <div className="flex items-baseline justify-between gap-4 mb-8">
          <div>
            <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
              Case Code: <span className="text-[color:var(--color-accent-blood)] tracking-[0.2em] ml-2">{code}</span>
            </span>
            <h1 className="font-serif-display mt-2 text-3xl text-[color:var(--color-text-primary)]">
              Your Dossier
            </h1>
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Identity Section */}
          <section className="flex flex-col md:flex-row gap-6 items-start border p-6" style={{
            backgroundColor: "var(--color-bg-elevated)",
            borderColor: "var(--color-border-hairline-strong)"
          }}>
            <div className="w-24 h-24 rounded-full bg-[color:var(--color-bg-base)] border border-[color:var(--color-border-hairline)] flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
              <img 
                src={getSpritePath(identity.occupation || identity.role)} 
                alt="Sprite Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">Identity</span>
              <h2 className="font-serif-display text-2xl mt-1 text-[color:var(--color-text-primary)]">{identity.name}</h2>
              <p className="font-serif-display text-lg text-[color:var(--color-text-secondary)] mt-1 italic">{identity.role}</p>
              <div className="mt-3 text-sm text-[color:var(--color-text-tertiary)] space-y-1">
                <p>Age: {identity.age}</p>
                <p>Occupation: {identity.occupation}</p>
              </div>
            </div>
          </section>

          {/* Background Section */}
          <section>
            <span className="tracked-caps text-[10px] text-[color:var(--color-text-secondary)] block mb-2">Background</span>
            <p className="text-[color:var(--color-text-primary)] leading-relaxed text-sm">
              {background}
            </p>
          </section>

          {/* Secret Section (Oxblood accent) */}
          <section className="border p-5 relative overflow-hidden" style={{
            backgroundColor: "var(--color-bg-base)",
            borderColor: "var(--color-accent-blood)"
          }}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[color:var(--color-accent-blood)]" />
            <span className="tracked-caps text-[10px] text-[color:var(--color-accent-blood)] font-bold block mb-2">Strictly Confidential (Your Secret)</span>
            <p className="text-[color:var(--color-text-primary)] leading-relaxed text-sm font-medium">
              {secret}
            </p>
          </section>

          {/* Objective Section */}
          <section>
            <span className="tracked-caps text-[10px] text-[color:var(--color-text-secondary)] block mb-2">Your Objective</span>
            <p className="font-serif-display text-xl text-[color:var(--color-text-primary)]">
              {objective}
            </p>
          </section>

          {/* Relationships Section */}
          <section>
            <span className="tracked-caps text-[10px] text-[color:var(--color-text-secondary)] block mb-3">Known Relationships</span>
            <ul className="divide-y divide-[color:var(--color-border-hairline)] border-t border-b border-[color:var(--color-border-hairline)]">
              {relationships.map((rel, idx) => (
                <li key={idx} className="py-4">
                  <span className="font-serif-display text-lg text-[color:var(--color-text-primary)] block mb-1">
                    {rel.name}
                  </span>
                  <span className="text-sm text-[color:var(--color-text-secondary)] block">
                    {rel.relation}
                  </span>
                </li>
              ))}
            </ul>
          </section>

        </div>

        <div className="mt-12 flex justify-end">
          <button
            onClick={() => navigate({ to: `/investigation/${code}` })}
            className="tracked-caps px-8 py-4 text-[12px] transition-colors w-full md:w-auto text-center"
            style={{
              backgroundColor: "var(--color-text-primary)",
              color: "var(--color-bg-base)",
              border: "1px solid var(--color-text-primary)"
            }}
          >
            Enter the Investigation →
          </button>
        </div>

      </div>
    </main>
  );
}
