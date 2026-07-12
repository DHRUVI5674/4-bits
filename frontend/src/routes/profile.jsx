import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import LandingCanvas from "@/components/LandingCanvas";
import GameCanvas from "@/components/GameCanvas";
import { getReduceMotion } from "@/lib/preferences";
import { getStoredName, setStoredName as savePlayerName } from "@/lib/player-id";
import { ArrowLeft, User } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile
});

const SKIN_COLORS = [
  { id: 'pale', value: 0xffe0bd, label: 'Pale' },
  { id: 'fair', value: 0xffcd94, label: 'Fair' },
  { id: 'tan', value: 0xeac086, label: 'Tan' },
  { id: 'brown', value: 0x8d5524, label: 'Brown' },
  { id: 'dark', value: 0x3d2210, label: 'Dark' },
  { id: 'noir', value: 0xff0000, label: 'Crimson (Noir)' }, // A stylized red for the noir theme
  { id: 'ghost', value: 0x6b7280, label: 'Spectral' }
];

function Profile() {
  const navigate = useNavigate();
  const [reduceMotionGlobal, setReduceMotionGlobal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [skinColor, setSkinColor] = useState(SKIN_COLORS[0].value);
  const [isSaving, setIsSaving] = useState(false);

  // Fake socket just to satisfy GameCanvas prop validation if necessary
  const fakeSocket = useRef({ on: () => {}, emit: () => {}, off: () => {} }).current;

  useEffect(() => {
    setReduceMotionGlobal(getReduceMotion());
    setDisplayName(getStoredName());
    
    const savedColor = window.localStorage.getItem("tlw:player-color");
    if (savedColor) {
      setSkinColor(parseInt(savedColor, 10));
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    savePlayerName(displayName || "Investigator");
    window.localStorage.setItem("tlw:player-color", skinColor.toString());
    
    // Simulate a brief save effect
    setTimeout(() => {
      setIsSaving(false);
      navigate({ to: "/" });
    }, 400);
  };

  return (
    <main className="min-h-[100dvh] bg-[color:var(--color-bg-base)] px-4 py-8 md:py-12 flex flex-col items-center relative overflow-x-hidden overflow-y-auto">
      <LandingCanvas reduceMotion={reduceMotionGlobal} focusRoom="bedroom" />
      
      <div className="mx-auto max-w-4xl w-full z-10 relative flex flex-col h-full">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-['VT323'] text-xl text-[#9c9186] hover:text-[#e8e1d3] transition-colors duration-200 mb-6 group drop-shadow-md"
        >
          <ArrowLeft className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" />
          &larr; RETURN
        </Link>

        <div className="flex flex-col lg:flex-row gap-8 items-stretch flex-1">
          
          {/* Character Preview Panel */}
          <div className="flex-1 border-4 border-[#1a1113] bg-[#0a0809]/95 p-6 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] relative flex flex-col items-center justify-center min-h-[400px]">
             <div className="absolute top-0 left-8 px-4 py-0.5 bg-stone-800/80 border-b border-stone-950 font-['VT323'] text-sm text-stone-400 select-none tracking-widest">
              VISUAL IDENTIFICATION
            </div>
            
            <div className="w-full h-full relative overflow-hidden bg-[#151314] border-4 border-[#1a1113] shadow-inner">
              <GameCanvas 
                sceneKey="ProfileScene" 
                socket={fakeSocket} 
                roomCode="PROFILE" 
                playerId="me" 
                players={[{ playerId: "me", name: displayName }]} 
                customRegistry={{ skinColor }}
              />
            </div>
          </div>

          {/* Customization Form */}
          <div className="w-full lg:w-[400px] border-4 border-[#1a1113] bg-[#0a0809]/95 p-6 md:p-8 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-0 left-8 px-4 py-0.5 bg-stone-800/80 border-b border-stone-950 font-['VT323'] text-sm text-stone-400 select-none tracking-widest">
              DOSSIER FILE
            </div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[color:var(--color-accent-blood)] to-transparent opacity-40 animate-pulse" />

            <form onSubmit={handleSave} className="flex flex-col h-full justify-between">
              <div>
                <h1 className="font-['VT323'] text-4xl text-white drop-shadow-md mb-8 mt-2 border-b-2 border-[#1a1113] pb-2">
                  Investigator Profile
                </h1>

                {/* Display Name */}
                <div className="relative group mb-8">
                  <div className="flex items-center gap-2 mb-1.5">
                    <User className="w-4 h-4 text-red-600" />
                    <span className="font-['VT323'] text-lg tracking-widest text-red-300/60">
                      DISPLAY NAME
                    </span>
                  </div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter Name..."
                    maxLength={20}
                    className="font-['VT323'] w-full border-0 border-b bg-transparent px-0 py-2 text-3xl text-[color:var(--color-text-primary)] outline-none transition-all duration-300 focus:border-red-600 placeholder-stone-700"
                    style={{ borderBottomColor: "var(--color-border-hairline-strong)" }}
                    required 
                  />
                </div>

                {/* Skin Color Swatches */}
                <div className="mb-8">
                  <span className="font-['VT323'] text-lg tracking-widest text-red-300/60 block mb-3">
                    APPEARANCE / TINT
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {SKIN_COLORS.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => setSkinColor(color.value)}
                        className={`w-10 h-10 border-4 transition-transform ${skinColor === color.value ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#1a1113] hover:scale-105'}`}
                        style={{ backgroundColor: '#' + color.value.toString(16).padStart(6, '0') }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className={`w-full font-['VT323'] px-6 py-4 text-3xl transition-colors border-4 relative shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] ${
                  isSaving 
                    ? "bg-[#151314] border-[#1a1113] text-stone-600" 
                    : "bg-[#8a2029] border-[#1a1113] text-white hover:bg-[#a62631]"
                }`}
              >
                {isSaving ? "SAVING..." : "SAVE PROFILE"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
