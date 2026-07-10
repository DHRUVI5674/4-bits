import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { SettingsModal } from "@/components/SettingsModal";
import wallImage from "@/assets/the great wall.png";
import { getReduceMotion, subscribeReduceMotion } from "@/lib/preferences";
import { useTransition } from "@/lib/transitions";

export const Route = createFileRoute("/")({
  component: Home
});

// Two empty wall patches (percent of viewport). Tuned to the reference image:
// - CREATE ROOM: lit patch between the handprint and the seated figure (upper-center-right)
// - JOIN ROOM: darker patch to the left of the blood stain
const HOTSPOTS = {
  create: { xPct: 50, yPct: 62, w: 280, h: 64, to: "/create-room" },
  join: { xPct: 50, yPct: 74, w: 280, h: 64, to: "/join-room" }
};

function Home() {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { setFogPaused } = useTransition();

  useEffect(() => {
    setReduceMotion(getReduceMotion());
    return subscribeReduceMotion(setReduceMotion);
  }, []);

  useEffect(() => {
    setFogPaused(settingsOpen);
    return () => setFogPaused(false);
  }, [settingsOpen, setFogPaused]);

  return (
    <main className="min-h-screen bg-[color:var(--color-bg-base)] text-[color:var(--color-text-primary)]">
      <HeroScene
        reduceMotion={reduceMotion}
        onOpenSettings={() => setSettingsOpen(true)} />
      
      <HowItWorks />
      <Footer />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </main>);

}

function HeroScene({
  reduceMotion,
  onOpenSettings



}) {
  const sceneRef = useRef(null);
  const maskRef = useRef(null);
  const rafRef = useRef(null);
  const targetRef = useRef({ x: -9999, y: -9999, active: false });
  const currentRef = useRef({ x: -9999, y: -9999, opacity: 0 });
  const { fogPaused, runTransition } = useTransition();

  const [hoverCreate, setHoverCreate] = useState(false);
  const [hoverJoin, setHoverJoin] = useState(false);
  const [hintVisible, setHintVisible] = useState(true);

  // Reveal radius (px). Feathered edge via radial-gradient mask.
  const RADIUS = 220;

  useEffect(() => {
    const t = setTimeout(() => setHintVisible(false), 4200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (reduceMotion || fogPaused) return;
    const scene = sceneRef.current;
    const mask = maskRef.current;
    if (!scene || !mask) return;

    const onMove = (clientX, clientY) => {
      const rect = scene.getBoundingClientRect();
      targetRef.current.x = clientX - rect.left;
      targetRef.current.y = clientY - rect.top;
      targetRef.current.active = true;
    };

    const handleMouseMove = (e) => onMove(e.clientX, e.clientY);
    const handleMouseLeave = () => {
      targetRef.current.active = false;
    };
    const handleTouchMove = (e) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const handleTouchEnd = () => {
      targetRef.current.active = false;
    };

    scene.addEventListener("mousemove", handleMouseMove);
    scene.addEventListener("mouseleave", handleMouseLeave);
    scene.addEventListener("touchmove", handleTouchMove, { passive: true });
    scene.addEventListener("touchend", handleTouchEnd);

    const tick = () => {
      const target = targetRef.current;
      const cur = currentRef.current;
      // Smooth follow
      cur.x += (target.x - cur.x) * 0.35;
      cur.y += (target.y - cur.y) * 0.35;
      // Opacity: rise fast on active, fade over ~2.5s when idle
      const targetOpacity = target.active ? 1 : 0;
      const rate = target.active ? 0.25 : 0.012;
      cur.opacity += (targetOpacity - cur.opacity) * rate;

      mask.style.opacity = String(cur.opacity);
      mask.style.setProperty("--rx", `${cur.x}px`);
      mask.style.setProperty("--ry", `${cur.y}px`);

      // Hotspot proximity → activate button reveal
      const rect = scene.getBoundingClientRect();
      const cx = HOTSPOTS.create.xPct / 100 * rect.width;
      const cy = HOTSPOTS.create.yPct / 100 * rect.height;
      const jx = HOTSPOTS.join.xPct / 100 * rect.width;
      const jy = HOTSPOTS.join.yPct / 100 * rect.height;
      const near = (ax, ay) =>
      cur.opacity > 0.35 &&
      Math.hypot(cur.x - ax, cur.y - ay) < RADIUS * 0.9;
      setHoverCreate(near(cx, cy));
      setHoverJoin(near(jx, jy));

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      scene.removeEventListener("mousemove", handleMouseMove);
      scene.removeEventListener("mouseleave", handleMouseLeave);
      scene.removeEventListener("touchmove", handleTouchMove);
      scene.removeEventListener("touchend", handleTouchEnd);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [reduceMotion, fogPaused]);

  // Reduce-motion: keep both hotspots always revealed
  useEffect(() => {
    if (reduceMotion) {
      setHoverCreate(true);
      setHoverJoin(true);
    }
  }, [reduceMotion]);

  const wallUrl = wallImage;

  return (
    <section
      ref={sceneRef}
      className="relative h-screen w-full overflow-hidden select-none"
      style={{ minHeight: 640 }}>
      
      {/* True (sharp) layer */}
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${wallUrl})` }} />
      

      {/* Fogged layer — same image, blurred/desaturated */}
      {!reduceMotion &&
      <div
        aria-hidden
        className="absolute inset-0 bg-center bg-cover"
        style={{
          backgroundImage: `url(${wallUrl})`,
          filter: "blur(14px) saturate(0.55) brightness(0.78) contrast(0.85)",
          transform: "scale(1.06)"
        }} />

      }

      {/* Ambient drifting fog overlay (calm) */}
      {!reduceMotion &&
      <div
        aria-hidden
        className="fog-ambient absolute inset-0 mix-blend-screen opacity-40"
        style={{
          backgroundImage:
          "radial-gradient(ellipse at 20% 30%, rgba(230,220,200,0.10), transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(200,190,175,0.09), transparent 60%)",
          backgroundSize: "180% 180%, 200% 200%",
          animation: "fog-drift 22s ease-in-out infinite"
        }} />

      }

      {/* Reveal mask: this element is the true image, masked to a soft circle around the cursor.
           When opacity rises, it "punches through" the fog above. */}
      {!reduceMotion &&
      <div
        ref={maskRef}
        aria-hidden
        className="fog-reveal-mask absolute inset-0 bg-center bg-cover pointer-events-none"
        style={{
          backgroundImage: `url(${wallUrl})`,
          opacity: 0,
          WebkitMaskImage:
          "radial-gradient(circle at var(--rx,50%) var(--ry,50%), rgba(0,0,0,1) 0px, rgba(0,0,0,0.9) 90px, rgba(0,0,0,0.55) 160px, rgba(0,0,0,0.15) 210px, rgba(0,0,0,0) 240px)",
          maskImage:
          "radial-gradient(circle at var(--rx,50%) var(--ry,50%), rgba(0,0,0,1) 0px, rgba(0,0,0,0.9) 90px, rgba(0,0,0,0.55) 160px, rgba(0,0,0,0.15) 210px, rgba(0,0,0,0) 240px)",
          transition: "opacity 120ms linear"
        }} />

      }


      {/* Touch-only auto sweep fallback (in case user isn't dragging) */}
      {!reduceMotion &&
      <div
        aria-hidden
        className="touch-sweep pointer-events-none absolute inset-y-0 w-[40vw] hidden touch:block"
        style={{
          background:
          "radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 70%)",
          animation: "touch-sweep 14s linear infinite"
        }} />

      }

      {/* Top/bottom vignette for legibility of fixed UI */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          background:
          "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))"
        }} />
      
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))"
        }} />
      

      {/* Fixed UI layer — always legible, above the fog */}
      <div className="absolute inset-0 z-20 flex flex-col">
        {/* Top bar */}
        <div className="flex items-start justify-between px-6 pt-5 md:px-10 md:pt-7">
          <span className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)]">
            Case File · Prologue
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-border-hairline-strong)] px-1 py-1">
            
            Settings
          </button>
        </div>

        {/* Title block */}
        <div className="mt-6 md:mt-10 flex flex-col items-center px-6 text-center">
          <div
            className="max-w-3xl px-6 py-4 rounded-sm"
            style={{
              background:
              "radial-gradient(ellipse at center, rgba(10,8,9,0.55) 0%, rgba(10,8,9,0) 75%)"
            }}>
            
            <h1
              className="font-serif-display text-4xl md:text-6xl lg:text-7xl text-[color:var(--color-text-primary)] leading-[1.05]"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.7)" }}>
              
              The Last Witness
            </h1>
            <div
              className="mx-auto mt-5 h-px w-24"
              style={{ backgroundColor: "var(--color-accent-blood)" }} />
            
            <p className="mt-4 text-sm md:text-base text-[color:var(--color-text-secondary)] font-sans max-w-xl mx-auto">
              Every session generates a new crime. Every player receives a
              different piece of the truth.
            </p>
          </div>
        </div>

        <div className="flex-1" />

        {/* On-load hint */}
        {!reduceMotion &&
        <div
          className="pointer-events-none absolute inset-x-0 bottom-10 flex justify-center"
          style={{
            animation: hintVisible ?
            "fade-out-hint 5s ease-in-out forwards" :
            undefined,
            opacity: hintVisible ? 1 : 0,
            visibility: hintVisible ? "visible" : "hidden"
          }}>
          
            <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
              Move closer to see clearly
            </span>
          </div>
        }
      </div>

      {/* Interactive hotspots — positioned on empty wall patches */}
      <WallLabel
        label="Create Room"
        revealed={hoverCreate || reduceMotion}
        style={{
          left: `${HOTSPOTS.create.xPct}%`,
          top: `${HOTSPOTS.create.yPct}%`,
          width: HOTSPOTS.create.w,
          height: HOTSPOTS.create.h
        }}
        onActivate={(origin) =>
        runTransition("exhale", { to: HOTSPOTS.create.to }, origin)
        } />
      
      <WallLabel
        label="Join Room"
        revealed={hoverJoin || reduceMotion}
        style={{
          left: `${HOTSPOTS.join.xPct}%`,
          top: `${HOTSPOTS.join.yPct}%`,
          width: HOTSPOTS.join.w,
          height: HOTSPOTS.join.h
        }}
        onActivate={(origin) =>
        runTransition("sweep", { to: HOTSPOTS.join.to }, origin)
        } />
      
    </section>);

}

function WallLabel({
  label,
  revealed,
  style,
  onActivate





}) {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    if (pressed) return;
    setPressed(true);
    const origin = { x: e.clientX, y: e.clientY };
    // Press-acknowledgment beat before the transition kicks off.
    window.setTimeout(() => onActivate(origin), 100);
    // Safety unlock in case navigation is cancelled.
    window.setTimeout(() => setPressed(false), 2000);
  };

  const activeAccent = pressed || revealed;
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="group absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center focus:outline-none"
      style={style}>
      
      <span
        className="tracked-caps text-base md:text-lg transition-all duration-500"
        style={{
          color: revealed ?
          "var(--color-text-primary)" :
          "rgba(232,225,211,0.48)",
          textShadow: revealed ?
          "0 1px 14px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.6)" :
          "0 1px 10px rgba(0,0,0,0.85), 0 0 18px rgba(0,0,0,0.6)",
          letterSpacing: "0.32em",
          filter: revealed ? "none" : "blur(0.6px)",
          fontWeight: 600
        }}>
        
        {label}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 transition-all duration-150"
        style={{
          border: `1px solid ${activeAccent ? "var(--color-accent-blood-hover)" : "transparent"}`,
          opacity: activeAccent ? 1 : 0,
          backgroundColor: pressed ? "rgba(10,8,9,0.35)" : "transparent"
        }} />
      
    </button>);

}


function HowItWorks() {
  const steps = [
  {
    n: "I",
    title: "A new crime, every session",
    body: "The scene, the motive, and the guilty party are freshly generated the moment your room opens. Nothing is prewritten. Nothing repeats."
  },
  {
    n: "II",
    title: "A private dossier for each player",
    body: "Every investigator receives their own file — witnesses interviewed, evidence catalogued, alibis half-remembered. No two dossiers overlap completely."
  },
  {
    n: "III",
    title: "Investigate together",
    body: "Compare notes across the table. Contradict each other. The truth only surfaces when the fragments are laid side by side."
  },
  {
    n: "IV",
    title: "The truth, at the end",
    body: "When the last statement is heard, the case file opens. The full sequence of events is revealed — including what no single investigator could have known alone."
  }];


  return (
    <section className="bg-[color:var(--color-bg-base)] px-6 py-24 md:py-32 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14">
          <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
            The Procedure
          </span>
          <h2 className="font-serif-display mt-3 text-3xl md:text-4xl text-[color:var(--color-text-primary)]">
            How it works
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-px bg-[color:var(--color-border-hairline)] md:grid-cols-2">
          {steps.map((s) =>
          <article
            key={s.n}
            className="bg-[color:var(--color-bg-elevated)] p-8 md:p-10">
            
              <div className="font-serif-display text-2xl text-[color:var(--color-accent-blood)]">
                {s.n}
              </div>
              <h3 className="font-serif-display mt-4 text-xl text-[color:var(--color-text-primary)]">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-text-secondary)]">
                {s.body}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>);

}

function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-border-hairline)] bg-[color:var(--color-bg-base)] px-6 py-10 md:px-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)] opacity-70">
          The Last Witness — Filed under confidential
        </span>
        <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)] opacity-70">
          MMXXVI
        </span>
      </div>
    </footer>);

}