import { Pin } from "lucide-react";

export default function EvidenceBoard({ clues, suspects }) {
  // Pre-calculated offsets for slightly chaotic paper angles
  const rotations = ["rotate-[-1.5deg]", "rotate-[1deg]", "rotate-[-0.5deg]", "rotate-[1.5deg]", "rotate-[-2deg]", "rotate-[2deg]"];
  
  // Predefined coordinates for cards based on index to draw neat SVG thread lines
  const getCardPosition = (index) => {
    const cols = 3;
    const colWidth = 230;
    const rowHeight = 160;
    const xOffset = 30;
    const yOffset = 30;

    const col = index % cols;
    const row = Math.floor(index / cols);

    // Add slight jitter for a real cluttered corkboard look
    const jitterX = (index % 2 === 0 ? 8 : -8);
    const jitterY = (index % 3 === 0 ? 6 : -6);

    return {
      x: col * colWidth + xOffset + jitterX + 100, // offset to card center (width is 200px)
      y: row * rowHeight + yOffset + jitterY + 60,  // offset to card center (height is 120px)
      left: col * colWidth + xOffset + jitterX,
      top: row * rowHeight + yOffset + jitterY,
    };
  };

  // Color mapping per suspect for color-coded string threads/pins
  const getSuspectColor = (suspectName) => {
    const colors = [
      "text-red-500",    // Red
      "text-blue-400",   // Blue
      "text-amber-500",  // Gold/Amber
      "text-emerald-500",// Emerald
      "text-purple-400"  // Purple
    ];
    const idx = suspects.findIndex(s => s.name === suspectName);
    return colors[idx >= 0 ? idx % colors.length : 0];
  };

  const getSuspectStrokeColor = (suspectName) => {
    const strokes = [
      "#ef4444", // Red
      "#3b82f6", // Blue
      "#f59e0b", // Amber
      "#10b981", // Emerald
      "#a855f7"  // Purple
    ];
    const idx = suspects.findIndex(s => s.name === suspectName);
    return strokes[idx >= 0 ? idx % strokes.length : "#dc2626"];
  };

  // Find relationships (which cards link to the same suspect)
  const links = [];
  for (let i = 0; i < clues.length; i++) {
    for (let j = i + 1; j < clues.length; j++) {
      const c1 = clues[i];
      const c2 = clues[j];
      
      // Check if clues share any linked characters (usually evidence has linkedCharacters array, e.g. from session)
      const sharedChars = (c1.linkedCharacters || []).filter(char => 
        (c2.linkedCharacters || []).includes(char)
      );

      sharedChars.forEach(char => {
        links.push({
          from: getCardPosition(i),
          to: getCardPosition(j),
          color: getSuspectStrokeColor(char)
        });
      });
    }
  };

  return (
    <div className="relative w-full h-[620px] overflow-auto border border-stone-800 bg-[rgba(28,25,23,0.95)] desk-lamp-glow select-none p-4 rounded-md">
      
      {/* Corkboard wood frame styling */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.03)_0%,rgba(10,8,9,0.96)_80%)] pointer-events-none z-10" />
      
      {/* Background SVG Thread strings */}
      <svg className="absolute inset-0 pointer-events-none z-0 w-[800px] h-[600px]">
        {links.map((link, idx) => (
          <g key={idx}>
            {/* Soft glow behind thread */}
            <line
              x1={link.from.x}
              y1={link.from.y}
              x2={link.to.x}
              y2={link.to.y}
              stroke={link.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.15"
              style={{ filter: "blur(2px)" }}
            />
            {/* Actual red thread string */}
            <line
              x1={link.from.x}
              y1={link.from.y}
              x2={link.to.x}
              y2={link.to.y}
              stroke={link.color}
              strokeWidth="0.8"
              strokeDasharray="1.5,1"
              opacity="0.65"
            />
          </g>
        ))}
      </svg>

      {/* Discovered clue cards grid */}
      <div className="relative z-10 min-w-[720px] min-h-[580px] h-full">
        {clues.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-typewriter text-[11px] text-stone-600 block mb-2">CORKBOARD VACANT</span>
            <p className="font-typewriter text-[9px] text-stone-500 italic max-w-xs">
              No physical case files or clues have been recovered. Explore rooms to pin updates.
            </p>
          </div>
        ) : (
          clues.map((clue, idx) => {
            const pos = getCardPosition(idx);
            const rot = rotations[idx % rotations.length];
            const linkedSuspect = clue.linkedCharacters?.[0] || "Unknown";
            const pinColor = getSuspectColor(linkedSuspect);

            return (
              <div
                key={clue.id || idx}
                className={`absolute w-[200px] h-[130px] border border-amber-900/30 bg-stone-900/90 shadow-[4px_6px_12px_rgba(0,0,0,0.6)] p-3 flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:shadow-[10px_12px_24px_rgba(0,0,0,0.85)] hover:z-20 ${rot}`}
                style={{
                  left: pos.left,
                  top: pos.top,
                  background: 'linear-gradient(135deg, rgba(28,25,23,0.95), rgba(41,37,36,0.95))'
                }}
              >
                {/* ThumbTack pin decoration */}
                <div className={`absolute -top-1.5 left-1/2 transform -translate-x-1/2 z-20 hover:scale-110 cursor-pointer ${pinColor}`}>
                  <Pin className="w-4.5 h-4.5 fill-current" />
                </div>

                <div>
                  {/* Clue Category Title */}
                  <span className="font-typewriter text-[8px] text-stone-400 block tracking-wider uppercase truncate">
                    {clue.type || "Evidence Piece"}
                  </span>
                  
                  {/* Clue name */}
                  <h3 className="font-serif-display text-sm text-amber-50/90 mt-1 line-clamp-1 border-b border-stone-800 pb-1">
                    {clue.title}
                  </h3>
                  
                  {/* Clue description */}
                  <p className="font-courier text-[9px] text-stone-400 leading-tight mt-1.5 line-clamp-3">
                    {clue.rawDescription || clue.description}
                  </p>
                </div>

                {/* Target suspect marker label */}
                <div className="flex items-center justify-between border-t border-stone-850 pt-1 text-[8px] font-typewriter">
                  <span className="text-stone-500">LINK:</span>
                  <span className={`${pinColor} font-bold truncate max-w-[120px]`}>
                    {linkedSuspect}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
