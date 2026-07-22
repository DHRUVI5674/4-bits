import { useEffect, useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getSocket, disconnectSocket } from "@/lib/socket";
import {
  beginInvestigation,
  getRoomByCode,
  listPlayers,
  setReady,
  MODE_LABELS
} from "@/lib/rooms";
import { getPlayerId } from "@/lib/player-id";
import GameCanvas from "@/components/GameCanvas";
import LandingCanvas from "@/components/LandingCanvas";
import { getReduceMotion } from "@/lib/preferences";

export const Route = createFileRoute("/lobby/$code")({
  component: Lobby
});

function Lobby() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    setPlayerId(getPlayerId());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await getRoomByCode(code);
        if (cancelled) return;
        setRoom(r);
        const p = await listPlayers(code);
        if (cancelled) return;
        setPlayers(p);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setNotFound(true);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  useEffect(() => {
    if (!room || !playerId) return;

    const sock = getSocket(code, playerId);
    socketRef.current = sock;
    setSocket(sock);

    sock.on("connect", () => {
      sock.emit("join-room");
    });

    sock.on("join-success", (data) => {
      setPlayers(data.players);
    });

    sock.on("player-joined", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("room-updated", (game) => {
      setRoom((prev) => prev ? { ...prev, ...game } : prev);
      setPlayers(game.players);
    });

    sock.on("player-ready-updated", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("game-started", () => {
      setRoom((prev) => prev ? { ...prev, status: "started" } : prev);
    });

    sock.on("player-left", async () => {
      const p = await listPlayers(code);
      setPlayers(p);
    });

    sock.on("host-changed", async () => {
      const r = await getRoomByCode(code);
      setRoom(r);
    });

    return () => {
      disconnectSocket(code, playerId);
      setSocket(null);
    };
  }, [room?.roomCode, code, playerId]);

  useEffect(() => {
    if (room?.status === "started") {
      navigate({ to: `/character-dossier/${code}` });
    }
  }, [room?.status, code, navigate]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[color:var(--color-bg-base)] px-6">
        <span className="tracked-caps text-[11px] text-[color:var(--color-text-tertiary)]">
          Retrieving the file…
        </span>
      </main>);

  }

  if (notFound || !room) {
    return (
      <main className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <span className="tracked-caps text-[10px] text-[color:var(--color-text-tertiary)]">
            Case File
          </span>
          <h1 className="font-serif-display mt-3 text-3xl text-[color:var(--color-text-primary)]">
            No such investigation
          </h1>
          <p className="mt-3 text-sm text-[color:var(--color-text-secondary)]">
            The code <span className="font-serif-display">{code}</span> is not on record.
          </p>
          <div className="mt-8">
            <Link
              to="/"
              className="tracked-caps text-[11px] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]">
              
              ← Return
            </Link>
          </div>
        </div>
      </main>);

  }

  const me = players.find((p) => p.playerId === playerId);
  const maxPlayers = room.settings?.maxPlayers || 8;
  const minPlayers = room.settings?.minPlayers || 4;
  const isHost = room?.hostId === playerId;
  const isStarted = room?.status === "started";
  const isEnded = room?.status === "ended";

  const allReady = players.length > 0 && players.every((p) => p.isReady);
  const meetsMin = players.length >= minPlayers;
  const canBegin = isHost && allReady && meetsMin && !isStarted && !isEnded;

  const onToggleReady = async () => {
    if (!me || !socketRef.current) return;
    setBusy(true);
    socketRef.current.emit("player-ready");
    setBusy(false);
  };

  const onBegin = async () => {
    if (!canBegin || !socketRef.current) return;
    setBusy(true);
    socketRef.current.emit("start-game");
    setBusy(false);
  };

  const reduceMotion = getReduceMotion();

  return (
    <main className="min-h-screen bg-[color:var(--color-bg-base)] px-6 py-6 flex flex-col justify-center overflow-y-auto relative">
      <LandingCanvas reduceMotion={reduceMotion} focusRoom="foyer" />
      
      <div className="mx-auto max-w-5xl w-full relative z-10">
        <Link
          to="/"
          className="font-['VT323'] text-xl text-[color:var(--color-text-secondary)] hover:text-white drop-shadow-md">
          ← Leave
        </Link>

        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between bg-[#0a0809]/90 border-4 border-[#1a1113] p-4 shadow-[10px_10px_0px_rgba(0,0,0,0.8)]">
          <div>
            <span className="font-['VT323'] text-xl text-[color:var(--color-text-tertiary)] tracking-widest">
              Investigation · {MODE_LABELS[room.mode] || 'Unknown'}
            </span>
            <h1 className="font-['VT323'] mt-1 text-4xl md:text-5xl text-white drop-shadow-md">
              {room.name || 'Mystery Game'}
            </h1>
            <p className="mt-1 text-xl font-['VT323'] text-[color:var(--color-text-secondary)] max-w-2xl">
              Host: <span className="text-white">{room.players.find((p) => p.isHost)?.name || 'Unknown'}</span> · {players.length} / {room.settings?.maxPlayers || 0} investigators
            </p>
          </div>
          <div className="text-right mt-4 md:mt-0">
            <span className="font-['VT323'] block text-lg text-[color:var(--color-text-tertiary)] tracking-widest">
              Case Code
            </span>
            <span className="font-['VT323'] mt-0.5 block text-4xl md:text-5xl tracking-[0.1em] md:tracking-widest text-[#8a2029] drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              {room.roomCode}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row gap-4 justify-center items-stretch">
          {socket && (
            <div className="w-full md:w-[480px] aspect-[4/3] md:h-[360px] shrink-0 relative overflow-hidden bg-[#0a0809]/95 border-4 border-[#1a1113] shadow-[10px_10px_0px_rgba(0,0,0,0.8)]">
              <GameCanvas
                sceneKey="LobbyScene"
                socket={socket}
                roomCode={code}
                playerId={playerId}
                players={players}
              />
            </div>
          )}

          <div
            className="w-full md:w-[320px] min-h-[250px] md:h-[360px] border-4 border-[#1a1113] p-4 flex flex-col bg-[#0a0809]/95 shadow-[10px_10px_0px_rgba(0,0,0,0.8)]">
            
            <div className="flex items-baseline justify-between shrink-0 mb-4 border-b border-[#3b2a2d] pb-2">
              <span className="font-['VT323'] text-xl text-[color:var(--color-text-secondary)] tracking-widest">
                Investigators
              </span>
              <span className="font-['VT323'] text-xl text-[color:var(--color-text-tertiary)] tracking-widest">
                {players.length} / {maxPlayers}
              </span>
            </div>

            <ul className="mt-2 divide-y divide-[#1a1113] overflow-y-auto flex-1">
              {players.map((p) =>
              <li key={p.playerId} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-['VT323'] text-2xl text-white drop-shadow-md truncate max-w-[150px]" title={p.name}>
                      {p.name}
                    </span>
                    {p.isHost &&
                  <span className="font-['VT323'] text-sm text-[color:var(--color-text-tertiary)] shrink-0 tracking-widest mt-1">
                        LEAD
                      </span>
                  }
                    {p.playerId === playerId &&
                  <span className="font-['VT323'] text-sm text-[color:var(--color-accent-blood-hover)] shrink-0 tracking-widest mt-1">
                        YOU
                      </span>
                  }
                  </div>
                  <span
                  className="font-['VT323'] text-lg shrink-0 tracking-widest drop-shadow-md mt-1"
                  style={{
                    color: p.isReady ?
                    "white" :
                    "var(--color-text-tertiary)"
                  }}>
                  
                    {p.isReady ? "READY" : "WAITING"}
                  </span>
                </li>
              )}
              {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) =>
              <li key={`empty-${i}`} className="flex items-center justify-between py-3 opacity-40">
                  <span className="font-['VT323'] text-xl text-[color:var(--color-text-tertiary)] truncate tracking-widest">
                    Awaiting investigator
                  </span>
                  <span className="font-['VT323'] text-lg text-[color:var(--color-text-tertiary)] tracking-widest">
                    —
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          {me ?
            <button
            type="button"
            onClick={onToggleReady}
            disabled={busy}
            className={`w-full sm:w-auto font-['VT323'] px-6 py-2.5 text-xl md:text-2xl transition-colors border-4 relative shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] ${
              me.isReady 
                ? "bg-[#2a2a2a] border-[#1a1113] text-white hover:bg-[#333]" 
                : "bg-[#8a2029] border-[#1a1113] text-white hover:bg-[#a62631]"
            }`}
            >
            
              {me.isReady ? "MARK AS WAITING" : "MARK READY"}
            </button> :

          <span className="font-['VT323'] text-xl text-[color:var(--color-text-tertiary)] tracking-widest">
              Observing only
            </span>
          }

          {isHost &&
          <button
            type="button"
            onClick={onBegin}
            disabled={!canBegin || busy}
            className={`w-full sm:w-auto font-['VT323'] px-8 py-2.5 text-xl md:text-2xl transition-colors border-4 relative ${
              canBegin 
                ? "bg-[#8a2029] border-[#1a1113] text-white shadow-[inset_-2px_-2px_0px_rgba(0,0,0,0.5),inset_2px_2px_0px_rgba(255,255,255,0.2)] hover:bg-[#a62631]" 
                : "bg-[#151314] border-[#1a1113] text-stone-600 cursor-not-allowed shadow-none"
            }`}
            title={
            isEnded ?
            "This case has already been closed." :
            !meetsMin ?
            `Need at least ${minPlayers} investigators` :
            !allReady ?
            "All investigators must be ready" :
            undefined
            }>
            
              BEGIN THE INVESTIGATION
            </button>
          }
        </div>

        {isStarted &&
        <p className="mt-6 text-xl font-['VT323'] text-[color:var(--color-text-secondary)]">
            The investigation has begun.
          </p>
        }

        {isEnded &&
        <p className="mt-6 text-xl font-['VT323'] text-[color:var(--color-accent-blood)]">
            This case file has been closed. Please create a new game.
          </p>
        }

        <p className="mt-4 text-lg font-['VT323'] text-[color:var(--color-text-tertiary)] tracking-wider">
          Share the code <span className="text-white drop-shadow-md">{room.roomCode}</span> with your fellow investigators so they can join.
        </p>
      </div>
    </main>);

}