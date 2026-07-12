import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import LandingCanvas from "@/components/LandingCanvas";
import GameCanvas from "@/components/GameCanvas";
import { getReduceMotion } from "@/lib/preferences";
import { getStoredName, setStoredName as savePlayerName, getAppearance, setAppearance as saveAppearance, DEFAULT_APPEARANCE } from "@/lib/player-id";
import { ArrowLeft, User, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/profile")({
  component: Profile
});

const SKIN_COLORS = [
  { id: 'pale', value: 0xffe0bd, label: 'Pale' },
  { id: 'fair', value: 0xffcd94, label: 'Fair' },
  { id: 'tan', value: 0xeac086, label: 'Tan' },
  { id: 'brown', value: 0x8d5524, label: 'Brown' },
  { id: 'dark', value: 0x3d2210, label: 'Dark' }
];

const HAIR_STYLES = [
  { id: 'hair_short', label: 'Short' },
  { id: 'hair_slicked', label: 'Slicked' },
  { id: 'hair_bob', label: 'Bob' },
  { id: 'hair_long', label: 'Long' },
  { id: 'hair_none', label: 'Bald' }
];

const HAIR_COLORS = [
  { id: 'black', value: 0x111111, label: 'Black' },
  { id: 'brown', value: 0x451a03, label: 'Brown' },
  { id: 'blonde', value: 0xd4af37, label: 'Blonde' },
  { id: 'gray', value: 0x9ca3af, label: 'Gray' }
];

const OUTFIT_STYLES = [
  { id: 'outfit_trenchcoat', label: 'Trench Coat' },
  { id: 'outfit_suit', label: 'Suit' },
  { id: 'outfit_vest', label: 'Vest' },
  { id: 'outfit_casual', label: 'Casual' }
];

const OUTFIT_COLORS = [
  { id: 'noir_red', value: 0x8a2029, label: 'Noir Red' },
  { id: 'charcoal', value: 0x333333, label: 'Charcoal' },
  { id: 'navy', value: 0x1e3a8a, label: 'Navy' },
  { id: 'olive', value: 0x3f6212, label: 'Olive' },
  { id: 'beige', value: 0xd4d4d8, label: 'Beige' }
];

function Profile() {
  const navigate = useNavigate();
  const [reduceMotionGlobal, setReduceMotionGlobal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [appearance, setAppearanceState] = useState(DEFAULT_APPEARANCE);
  const [isSaving, setIsSaving] = useState(false);
  const [direction, setDirection] = useState(0); // 0=Down, 1=Left, 2=Right, 3=Up

  // Fake socket just to satisfy GameCanvas prop validation if necessary
  const fakeSocket = useRef({ on: () => {}, emit: () => {}, off: () => {} }).current;

  useEffect(() => {
    setReduceMotionGlobal(getReduceMotion());
    setDisplayName(getStoredName());
    setAppearanceState(getAppearance());
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    savePlayerName(displayName || "Investigator");
    saveAppearance(appearance);
    
    // Simulate a brief save effect
    setTimeout(() => {
      setIsSaving(false);
      navigate({ to: "/" });
    }, 400);
  };

  const updateApp = (key, val) => {
    setAppearanceState(prev => ({ ...prev, [key]: val }));
  };

  const cycleDirection = () => {
    setDirection(prev => (prev + 1) % 4);
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
            
            <div className="w-full h-[300px] relative overflow-hidden bg-[#151314] border-4 border-[#1a1113] shadow-inner mb-4">
              <GameCanvas 
                sceneKey="ProfileScene" 
                socket={fakeSocket} 
                roomCode="PROFILE" 
                playerId="me" 
                players={[{ playerId: "me", name: displayName }]} 
                customRegistry={{ ...appearance, direction }}
              />
            </div>
            
            <button 
              type="button" 
              onClick={cycleDirection}
              className="flex items-center gap-2 font-['VT323'] text-xl text-stone-300 hover:text-white transition-colors bg-[#1a1113] px-4 py-2 border-2 border-stone-800 shadow-md"
            >
              <RefreshCw className="w-4 h-4" /> TURN CHARACTER
            </button>
          </div>

          {/* Customization Form */}
          <div className="w-full lg:w-[450px] border-4 border-[#1a1113] bg-[#0a0809]/95 p-6 md:p-8 shadow-[15px_15px_0px_rgba(0,0,0,0.8)] relative max-h-[70vh] overflow-y-auto custom-scrollbar">
            <div className="absolute top-0 left-8 px-4 py-0.5 bg-stone-800/80 border-b border-stone-950 font-['VT323'] text-sm text-stone-400 select-none tracking-widest z-10">
              DOSSIER FILE
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col h-full mt-4">
              <div className="flex-1">
                {/* Display Name */}
                <div className="relative group mb-6">
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

                {/* Skin Tone */}
                <div className="mb-6">
                  <span className="font-['VT323'] text-lg tracking-widest text-red-300/60 block mb-2">
                    SKIN TONE
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_COLORS.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateApp('skinTone', color.value)}
                        className={`w-8 h-8 border-2 transition-transform ${appearance.skinTone === color.value ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-[#1a1113] hover:scale-105'}`}
                        style={{ backgroundColor: '#' + color.value.toString(16).padStart(6, '0') }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Hair Style */}
                <div className="mb-6">
                  <span className="font-['VT323'] text-lg tracking-widest text-red-300/60 block mb-2">
                    HAIR STYLE
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => updateApp('hairStyle', style.id)}
                        className={`font-['VT323'] px-3 py-1 text-lg border-2 transition-colors ${appearance.hairStyle === style.id ? 'bg-[#8a2029] border-[#8a2029] text-white' : 'bg-transparent border-[#1a1113] text-stone-400 hover:border-stone-600'}`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {HAIR_COLORS.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateApp('hairColor', color.value)}
                        className={`w-6 h-6 border-2 transition-transform ${appearance.hairColor === color.value ? 'border-white scale-110' : 'border-[#1a1113] hover:scale-105'}`}
                        style={{ backgroundColor: '#' + color.value.toString(16).padStart(6, '0') }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Outfit Style */}
                <div className="mb-8">
                  <span className="font-['VT323'] text-lg tracking-widest text-red-300/60 block mb-2">
                    OUTFIT STYLE
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {OUTFIT_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => updateApp('outfit', style.id)}
                        className={`font-['VT323'] px-3 py-1 text-lg border-2 transition-colors ${appearance.outfit === style.id ? 'bg-[#8a2029] border-[#8a2029] text-white' : 'bg-transparent border-[#1a1113] text-stone-400 hover:border-stone-600'}`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {OUTFIT_COLORS.map(color => (
                      <button
                        key={color.id}
                        type="button"
                        onClick={() => updateApp('outfitColor', color.value)}
                        className={`w-6 h-6 border-2 transition-transform ${appearance.outfitColor === color.value ? 'border-white scale-110' : 'border-[#1a1113] hover:scale-105'}`}
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
                className={`w-full font-['VT323'] px-6 py-4 text-3xl transition-colors border-4 mt-4 relative shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] flex-shrink-0 ${
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
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0809; 
          border-left: 1px solid #1a1113;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1a1113; 
          border: 1px solid #2a1113;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #8a2029; 
        }
      `}} />
    </main>
  );
}

